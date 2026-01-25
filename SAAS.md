# Multi-Tenant SaaS Platform - Complete Implementation Guide

## Overview
Transform the tracking bot into a commercial SaaS product with:
- **Tenant model** for subscription management
- **Web dashboard** (separate repo on Vercel) for guild owners
- **Stripe integration** for payments
- **API key modes**: Shared (your keys, higher price) vs Own (their keys, lower price)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND - tracking-dashboard                  │
│              (Separate repo, hosted on Vercel)              │
│  • Next.js 14 (App Router)                                  │
│  • Discord OAuth via NextAuth.js                            │
│  • Stripe Checkout & Customer Portal                        │
│  • Guild management UI                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTPS (REST API)
┌─────────────────────────────────────────────────────────────┐
│              BACKEND - tracking-data-bot (your VPS)         │
│  • /api - Express.js + new /dashboard/* endpoints           │
│  • Stripe webhook handler                                   │
│  • Encrypted API key storage                                │
└─────────────────────────────────────────────────────────────┘
```

---

# PART 1: BACKEND CHANGES (tracking-data-bot repo)

---

## 1. Database Schema Changes

**File:** `shared/prisma/schema.prisma`

Add these at the end of your schema file:

```prisma
// ═══════════════════════════════════════════════════════════════
// MULTI-TENANT SAAS
// ═══════════════════════════════════════════════════════════════

/// Subscription plans available
enum Plan {
  FREE
  BASIC
  PRO
  ENTERPRISE
}

/// API key usage mode
enum ApiKeyMode {
  SHARED   // Uses platform API keys (higher price)
  OWN      // Uses tenant's own keys (lower price)
}

/// Multi-tenant subscription and billing
model Tenant {
  id        String   @id @default(cuid())
  guildId   String   @unique @db.VarChar(32)

  // Owner info (Discord user who manages this tenant)
  ownerDiscordId   String  @db.VarChar(32)
  ownerEmail       String? @db.VarChar(255)

  // Subscription
  plan             Plan       @default(FREE)
  planExpiresAt    DateTime?  @db.Timestamptz(6)
  apiKeyMode       ApiKeyMode @default(SHARED)

  // Encrypted API keys (only used if apiKeyMode = OWN)
  apifyApiKeyEnc   String?    @db.Text
  openaiApiKeyEnc  String?    @db.Text
  youtubeApiKeyEnc String?    @db.Text

  // Stripe billing
  stripeCustomerId     String? @unique @db.VarChar(64)
  stripeSubscriptionId String? @db.VarChar(64)

  // Status
  isActive         Boolean  @default(true)
  suspendedAt      DateTime? @db.Timestamptz(6)
  suspendReason    String?   @db.VarChar(255)

  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)

  @@index([ownerDiscordId])
  @@index([stripeCustomerId])
  @@index([plan])
}

/// Audit log for tenant actions
model TenantAuditLog {
  id        String   @id @default(cuid())
  tenantId  String   @db.VarChar(32)

  action    String   @db.VarChar(64)
  actorId   String   @db.VarChar(32)
  actorType String   @db.VarChar(16)

  oldValue  String?  @db.Text
  newValue  String?  @db.Text
  metadata  Json?

  createdAt DateTime @default(now()) @db.Timestamptz(6)

  @@index([tenantId, createdAt(sort: Desc)])
  @@index([actorId])
}
```

**Run migration:**
```bash
npx prisma migrate dev --name add_tenant_model --schema=./shared/prisma/schema.prisma
npx prisma generate --schema=./shared/prisma/schema.prisma
```

---

## 2. Plan Limits Configuration

**File:** `shared/src/config/planLimits.ts` (CREATE)

```typescript
export const PLAN_LIMITS = {
  FREE: {
    dailyApifyRunLimit: 5,
    weeklyOpenaiCallLimit: 10,
    dailySubmissionLimitPerUser: 3,
    dailyApifyRunLimitPerUser: 2,
    weeklyOpenaiCallLimitPerUser: 3,
    features: ['basic_tracking'],
  },
  BASIC: {
    dailyApifyRunLimit: 50,
    weeklyOpenaiCallLimit: 100,
    dailySubmissionLimitPerUser: 15,
    dailyApifyRunLimitPerUser: 10,
    weeklyOpenaiCallLimitPerUser: 10,
    features: ['basic_tracking', 'analytics', 'export'],
  },
  PRO: {
    dailyApifyRunLimit: 200,
    weeklyOpenaiCallLimit: 500,
    dailySubmissionLimitPerUser: 50,
    dailyApifyRunLimitPerUser: 25,
    weeklyOpenaiCallLimitPerUser: 50,
    features: ['basic_tracking', 'analytics', 'export', 'priority_support', 'custom_branding'],
  },
  ENTERPRISE: {
    dailyApifyRunLimit: 1000,
    weeklyOpenaiCallLimit: 2000,
    dailySubmissionLimitPerUser: 200,
    dailyApifyRunLimitPerUser: 100,
    weeklyOpenaiCallLimitPerUser: 200,
    features: ['all'],
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export const PRICING = {
  FREE: { shared: 0, own: 0 },
  BASIC: { shared: 2900, own: 1900 },      // $29/$19 per month
  PRO: { shared: 7900, own: 4900 },        // $79/$49 per month
  ENTERPRISE: { shared: 19900, own: 14900 }, // $199/$149 per month
} as const;

export function getPlanLimits(plan: PlanType) {
  return PLAN_LIMITS[plan];
}

export function hasFeature(plan: PlanType, feature: string): boolean {
  const limits = PLAN_LIMITS[plan];
  return limits.features.includes('all') || limits.features.includes(feature);
}
```

---

## 3. Encryption Service

**File:** `shared/src/lib/encryption.ts` (CREATE)

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!key) {
    throw new Error('API_KEY_ENCRYPTION_SECRET environment variable is required');
  }
  // Ensure key is 32 bytes (256 bits)
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt a string using AES-256-GCM
 * Returns: iv:authTag:ciphertext (all hex encoded)
 */
export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string encrypted with encryptApiKey
 */
export function decryptApiKey(ciphertext: string): string {
  const key = getEncryptionKey();

  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check if a string is encrypted (basic format check)
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  return parts.length === 3 &&
         parts[0].length === IV_LENGTH * 2 &&
         parts[1].length === AUTH_TAG_LENGTH * 2;
}
```

---

## 4. Tenant Service

**File:** `shared/src/lib/tenantService.ts` (CREATE)

```typescript
import { prisma } from '../db/client.js';
import { logger } from './logger.js';
import { encryptApiKey, decryptApiKey } from './encryption.js';
import { PLAN_LIMITS, type PlanType } from '../config/planLimits.js';
import type { Tenant, Plan, ApiKeyMode } from '@prisma/client';

const log = logger.child({ service: 'tenant' });

export interface CreateTenantInput {
  guildId: string;
  ownerDiscordId: string;
  ownerEmail?: string;
}

export interface UpdateTenantInput {
  ownerEmail?: string;
  plan?: Plan;
  apiKeyMode?: ApiKeyMode;
  apifyApiKey?: string;    // Will be encrypted
  openaiApiKey?: string;   // Will be encrypted
  youtubeApiKey?: string;  // Will be encrypted
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  isActive?: boolean;
  suspendReason?: string;
}

/**
 * Get tenant by guild ID
 */
export async function getTenant(guildId: string): Promise<Tenant | null> {
  return prisma.tenant.findUnique({
    where: { guildId },
  });
}

/**
 * Get tenant by Stripe customer ID
 */
export async function getTenantByStripeCustomer(stripeCustomerId: string): Promise<Tenant | null> {
  return prisma.tenant.findUnique({
    where: { stripeCustomerId },
  });
}

/**
 * Get all tenants owned by a Discord user
 */
export async function getTenantsByOwner(ownerDiscordId: string): Promise<Tenant[]> {
  return prisma.tenant.findMany({
    where: { ownerDiscordId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Create a new tenant
 */
export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  log.info({ guildId: input.guildId, owner: input.ownerDiscordId }, 'Creating new tenant');

  return prisma.tenant.create({
    data: {
      guildId: input.guildId,
      ownerDiscordId: input.ownerDiscordId,
      ownerEmail: input.ownerEmail,
      plan: 'FREE',
      apiKeyMode: 'SHARED',
      isActive: true,
    },
  });
}

/**
 * Update a tenant
 */
export async function updateTenant(
  guildId: string,
  input: UpdateTenantInput,
  actorId: string,
  actorType: 'owner' | 'admin' | 'system' = 'owner'
): Promise<Tenant> {
  const existing = await getTenant(guildId);
  if (!existing) {
    throw new Error(`Tenant not found: ${guildId}`);
  }

  // Encrypt API keys if provided
  const updateData: any = { ...input };

  if (input.apifyApiKey) {
    updateData.apifyApiKeyEnc = encryptApiKey(input.apifyApiKey);
    delete updateData.apifyApiKey;
  }
  if (input.openaiApiKey) {
    updateData.openaiApiKeyEnc = encryptApiKey(input.openaiApiKey);
    delete updateData.openaiApiKey;
  }
  if (input.youtubeApiKey) {
    updateData.youtubeApiKeyEnc = encryptApiKey(input.youtubeApiKey);
    delete updateData.youtubeApiKey;
  }

  // Handle suspension
  if (input.isActive === false && existing.isActive) {
    updateData.suspendedAt = new Date();
  } else if (input.isActive === true && !existing.isActive) {
    updateData.suspendedAt = null;
    updateData.suspendReason = null;
  }

  const updated = await prisma.tenant.update({
    where: { guildId },
    data: updateData,
  });

  // Create audit log
  await prisma.tenantAuditLog.create({
    data: {
      tenantId: existing.id,
      action: Object.keys(input).join(','),
      actorId,
      actorType,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    },
  });

  log.info({ guildId, changes: Object.keys(input) }, 'Tenant updated');
  return updated;
}

/**
 * Get the appropriate API key for a service (own or platform)
 */
export async function getTenantApiKey(
  guildId: string,
  service: 'apify' | 'openai' | 'youtube'
): Promise<string> {
  const tenant = await getTenant(guildId);

  // If no tenant or using shared keys, return platform keys
  if (!tenant || tenant.apiKeyMode === 'SHARED') {
    switch (service) {
      case 'apify': return process.env.APIFY_API_TOKEN || '';
      case 'openai': return process.env.OPENAI_API_KEY || '';
      case 'youtube': return process.env.YOUTUBE_API_KEY || '';
    }
  }

  // Using own keys - decrypt and return
  let encryptedKey: string | null = null;
  switch (service) {
    case 'apify': encryptedKey = tenant.apifyApiKeyEnc; break;
    case 'openai': encryptedKey = tenant.openaiApiKeyEnc; break;
    case 'youtube': encryptedKey = tenant.youtubeApiKeyEnc; break;
  }

  if (!encryptedKey) {
    // Fall back to platform keys if own key not set
    log.warn({ guildId, service }, 'Tenant using OWN mode but key not set, falling back to platform key');
    switch (service) {
      case 'apify': return process.env.APIFY_API_TOKEN || '';
      case 'openai': return process.env.OPENAI_API_KEY || '';
      case 'youtube': return process.env.YOUTUBE_API_KEY || '';
    }
  }

  return decryptApiKey(encryptedKey);
}

/**
 * Get plan limits for a guild (considers tenant plan)
 */
export async function getTenantPlanLimits(guildId: string) {
  const tenant = await getTenant(guildId);
  const plan: PlanType = (tenant?.plan as PlanType) ?? 'FREE';
  return PLAN_LIMITS[plan];
}

/**
 * Check if tenant is active and not suspended
 */
export async function isTenantActive(guildId: string): Promise<boolean> {
  const tenant = await getTenant(guildId);
  if (!tenant) return true; // No tenant = FREE tier, always active
  return tenant.isActive && !tenant.suspendedAt;
}

/**
 * Get or create tenant for a guild
 */
export async function getOrCreateTenant(guildId: string, ownerDiscordId: string): Promise<Tenant> {
  const existing = await getTenant(guildId);
  if (existing) return existing;

  return createTenant({ guildId, ownerDiscordId });
}
```

---

## 5. Dashboard Auth Middleware

**File:** `api/src/middleware/dashboardAuth.ts` (CREATE)

```typescript
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '@lx/shared/lib/logger';
import { getTenant, getTenantsByOwner } from '@lx/shared/lib/tenantService';

const log = logger.child({ middleware: 'dashboardAuth' });

const JWT_SECRET = process.env.DASHBOARD_JWT_SECRET || '';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

if (!JWT_SECRET) {
  log.warn('DASHBOARD_JWT_SECRET not configured');
}

export interface DashboardUser {
  discordId: string;
  discordUsername: string;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      dashboardUser?: DashboardUser;
    }
  }
}

/**
 * Verify JWT token for dashboard routes
 */
export function requireDashboardAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DashboardUser;
    req.dashboardUser = decoded;
    next();
  } catch (error) {
    log.warn({ error }, 'Invalid JWT token');
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Verify user owns the tenant for the requested guild
 */
export async function requireTenantOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { guildId } = req.params;
  const user = req.dashboardUser;

  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (!guildId) {
    res.status(400).json({ error: 'Guild ID required' });
    return;
  }

  const tenant = await getTenant(guildId);

  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }

  if (tenant.ownerDiscordId !== user.discordId) {
    log.warn({ guildId, userId: user.discordId }, 'Unauthorized tenant access attempt');
    res.status(403).json({ error: 'You do not own this guild' });
    return;
  }

  next();
}

/**
 * Verify admin API key for admin routes
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-admin-key'] as string;

  if (!ADMIN_API_KEY) {
    res.status(500).json({ error: 'Admin authentication not configured' });
    return;
  }

  if (!apiKey || apiKey !== ADMIN_API_KEY) {
    log.warn({ ip: req.ip }, 'Invalid admin API key attempt');
    res.status(403).json({ error: 'Invalid admin API key' });
    return;
  }

  next();
}

/**
 * Generate JWT token for a user (called after Discord OAuth)
 */
export function generateDashboardToken(user: DashboardUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}
```

---

## 6. Dashboard Routes

**File:** `api/src/routes/dashboard.ts` (CREATE)

See the full implementation in the plan file at `~/.claude/plans/cryptic-drifting-thunder.md`

Key endpoints:
- `POST /dashboard/auth/callback` - Exchange Discord OAuth for JWT
- `GET /dashboard/me` - Get current user's tenants
- `GET /dashboard/tenant/:guildId` - Get tenant details
- `GET /dashboard/tenant/:guildId/usage` - Get usage statistics
- `PUT /dashboard/tenant/:guildId/api-keys` - Update API keys
- `POST /dashboard/billing/checkout` - Create Stripe checkout
- `POST /dashboard/billing/portal` - Create Stripe portal URL

---

## 7. Admin Routes

**File:** `api/src/routes/admin.ts` (CREATE)

Key endpoints:
- `GET /admin/tenants` - List all tenants (paginated)
- `GET /admin/tenants/:guildId` - Get tenant details
- `PATCH /admin/tenants/:guildId/plan` - Change tenant plan
- `POST /admin/tenants/:guildId/suspend` - Suspend tenant
- `POST /admin/tenants/:guildId/unsuspend` - Unsuspend tenant
- `GET /admin/stats` - Platform-wide statistics

---

## 8. Stripe Webhook Handler

**File:** `api/src/routes/stripe-webhook.ts` (CREATE)

Handles events:
- `checkout.session.completed` - Activate subscription
- `customer.subscription.updated` - Plan changes
- `customer.subscription.deleted` - Downgrade to FREE
- `invoice.payment_failed` - Suspend after 3 failures

---

## 9. Mount Routes in Server

**File:** `api/src/server.ts` (MODIFY)

```typescript
// Add imports
import dashboardRoutes from './routes/dashboard.js';
import adminRoutes from './routes/admin.js';
import stripeWebhookRoutes from './routes/stripe-webhook.js';

// IMPORTANT: Stripe webhook needs raw body, add BEFORE json middleware
app.use('/stripe', express.raw({ type: 'application/json' }), stripeWebhookRoutes);

// After your other routes, add:
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);
```

---

## 10. Update Budget Service

**File:** `shared/src/lib/budgetService.ts` (MODIFY)

Update `getBudgetConfig()` to use tenant plan limits instead of hardcoded defaults.

---

## 11. Environment Variables (Backend)

```bash
# Encryption key for tenant API keys (generate: openssl rand -hex 32)
API_KEY_ENCRYPTION_SECRET=your-32-byte-hex-key-here

# Dashboard JWT secret (generate: openssl rand -hex 32)
DASHBOARD_JWT_SECRET=your-jwt-secret-here

# Admin API key for /admin/* routes
ADMIN_API_KEY=your-admin-api-key-here

# Dashboard URL (for Stripe redirects)
DASHBOARD_URL=https://dashboard.yourdomain.com

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Stripe Price IDs (create these in Stripe Dashboard)
STRIPE_PRICE_BASIC_SHARED=price_xxx
STRIPE_PRICE_BASIC_OWN=price_xxx
STRIPE_PRICE_PRO_SHARED=price_xxx
STRIPE_PRICE_PRO_OWN=price_xxx
STRIPE_PRICE_ENTERPRISE_SHARED=price_xxx
STRIPE_PRICE_ENTERPRISE_OWN=price_xxx
```

---

## 12. Install Dependencies

```bash
pnpm add stripe jsonwebtoken
pnpm add -D @types/jsonwebtoken
```

---

# PART 2: FRONTEND (tracking-dashboard - NEW REPO)

---

## 1. Create Next.js Project

```bash
npx create-next-app@latest tracking-dashboard --typescript --tailwind --app --src-dir
cd tracking-dashboard
pnpm add next-auth @auth/core stripe @stripe/stripe-js axios date-fns recharts
npx shadcn@latest init
npx shadcn@latest add button card input label tabs avatar badge
```

---

## 2. Environment Variables (Frontend)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
API_SECRET=same-as-DASHBOARD_JWT_SECRET
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
NEXTAUTH_SECRET=generate-a-random-secret
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

---

## 3. Key Files to Create

- `src/lib/auth.ts` - NextAuth Discord configuration
- `src/lib/api.ts` - Backend API client
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth route handler
- `src/app/api/token/route.ts` - Token exchange endpoint
- `src/app/login/page.tsx` - Discord login page
- `src/app/(dashboard)/layout.tsx` - Dashboard layout
- `src/app/(dashboard)/dashboard/page.tsx` - Dashboard home
- `src/app/(dashboard)/dashboard/guilds/[guildId]/page.tsx` - Guild details
- `src/types/next-auth.d.ts` - TypeScript declarations

---

## 4. Deploy to Vercel

1. Push `tracking-dashboard` to GitHub
2. Go to vercel.com
3. Import the repository
4. Add environment variables
5. Deploy

---

# Verification Checklist

## Backend
- [ ] Run migration: `npx prisma migrate dev`
- [ ] Build: `pnpm run build`
- [ ] Test tenant creation via API
- [ ] Test Stripe webhook with `stripe listen`

## Frontend
- [ ] Run dev server: `pnpm dev`
- [ ] Test Discord login
- [ ] Test guild list loads
- [ ] Deploy to Vercel

## Stripe
- [ ] Create products and prices in Stripe Dashboard
- [ ] Configure webhook endpoint
- [ ] Test checkout flow end-to-end

---

# Pricing Model

| Plan | Shared Keys | Own Keys | Daily Verifications | Weekly OpenAI |
|------|-------------|----------|---------------------|---------------|
| FREE | $0 | $0 | 5 | 10 |
| BASIC | $29/mo | $19/mo | 50 | 100 |
| PRO | $79/mo | $49/mo | 200 | 500 |
| ENTERPRISE | $199/mo | $149/mo | 1000 | 2000 |



# Critical Legal Documents Needed

### 1. Terms of Service (ToS)

- Acceptable use policy (what users can/cannot track)
- Service availability and uptime commitments (or disclaimers)
- Account termination conditions
- Intellectual property ownership
- Auto-renewal and subscription terms (required in many jurisdictions)

### 2. Privacy Policy

- What data you collect (Discord IDs, emails, social media metrics)
- How you use and store it (encrypted API keys, audit logs)
- Third-party data sharing (Stripe, Discord OAuth, Apify)
- GDPR compliance if you have EU users:
    - Right to data export
    - Right to deletion
    - Data retention periods
    - Data Processing Agreement (DPA)

### 3. Refund & Cancellation Policy

- Stripe requires clear refund policies
- Many jurisdictions require prorated refunds for unused service
- Auto-renewal disclosure requirements (California, EU)

  High-Risk Legal Concerns

  Social Media Platform ToS Violations

  This is your biggest risk. You're scraping Instagram and TikTok via Apify:
  - Instagram/Meta: Explicitly prohibits automated data collection in their ToS
  - TikTok: Similar restrictions on scraping
  - YouTube Data API: Actually legitimate if you follow their ToS (you're using their API properly)

  Potential consequences:
  - Cease and desist letters
  - Account bans
  - Lawsuits (Meta has sued scraping companies)

  Mitigations:
  - Only collect publicly available data
  - Add ToS language that users are responsible for compliance
  - Consider official APIs where available
  - Consult a lawyer about the hiQ Labs v. LinkedIn ruling applicability

  BYOK (Bring Your Own Keys) Liability

  When users provide their own API keys:
  - You're storing sensitive credentials
  - If breached, you could be liable
  - Need clear indemnification clauses

  Recommended Actions

  1. Hire a lawyer who specializes in SaaS/tech to draft your ToS and Privacy Policy
  2. Add these pages to your dashboard:
    - /terms - Terms of Service
    - /privacy - Privacy Policy
    - /refunds - Refund Policy
  3. Require checkbox consent during signup
  4. Implement data export/deletion endpoints for GDPR
  5. Get business insurance (E&O / Cyber liability)
  6. Form a legal entity (LLC/Corp) to protect personal assets

  Cost Estimates

  - Attorney for ToS/Privacy: $1,500 - $5,000
  - Business formation: $500 - $1,500
  - Business insurance: $500 - $2,000/year

  Would you like me to create a skeleton for any of these documents, or add database fields and API endpoints for GDPR data export/deletion?