# Technology Stack - Dashboard Tracking Bot

**Project:** Discord Bot Management Dashboard
**Domain:** Next.js SaaS Dashboard with Discord OAuth
**Researched:** 2026-01-24
**Overall Confidence:** HIGH

---

## Executive Summary

This stack recommendation is optimized for a multi-tenant SaaS dashboard connecting to an existing API. The architecture prioritizes:
- **Vercel-native deployment** (Edge Runtime compatibility)
- **Type safety** across API boundaries
- **Real-time data** with server-sent events
- **Zero vendor lock-in** for auth/data (custom JWT via existing API)
- **Custom UI** (Tailwind only, no component libraries per constraint)

**Key Decision:** Use custom JWT auth (not NextAuth.js) because the existing API owns authentication. The dashboard is a thin client that consumes the API's auth endpoints.

---

## Core Framework

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **Next.js** | `16.1.4` (latest stable) | React framework, App Router | Official stable version verified from docs. App Router provides RSC, server actions, optimized caching. Vercel-native deployment. |
| **React** | `19.x` (via Next.js) | UI library | Next.js 16 uses React 19 with built-in canary features. Server Components are production-ready. |
| **TypeScript** | `5.7.x` (latest) | Type safety | Current stable release. Essential for API contract enforcement and multi-tenant data isolation safety. |

**Confidence:** HIGH (verified via official Next.js documentation)

---

## Authentication & Authorization

### Approach: Custom JWT (Not NextAuth.js)

**Decision:** Do NOT use NextAuth.js/Auth.js

**Rationale:**
- Your existing API owns authentication (Discord OAuth → JWT issuance)
- Dashboard is a thin client that receives JWTs from `/api/v1/auth/*`
- NextAuth.js adds unnecessary complexity for this architecture
- Next.js docs recommend auth libraries for apps that OWN auth logic, but you don't

**Implementation:**

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| **jose** | `5.9.x` | JWT verification (Edge-compatible) | Recommended by Next.js docs for Edge Runtime. Lighter than jsonwebtoken. Used for client-side token validation only. |
| **zod** | `3.24.x` | Schema validation | Official Next.js pattern for validating API responses and form inputs. Type-safe runtime validation. |

**Auth Flow:**
1. User clicks "Login with Discord" → redirect to API's `/api/v1/auth/discord`
2. API handles OAuth, returns JWT + refresh token
3. Dashboard stores tokens in httpOnly cookies (via API's Set-Cookie headers)
4. Dashboard middleware validates JWT using `jose` before rendering protected routes
5. Refresh flow handled by API's `/api/v1/auth/refresh` endpoint

**Confidence:** HIGH (verified pattern from Next.js auth documentation)

---

## Data Fetching & State Management

| Library | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| **TanStack Query** (React Query) | `@tanstack/react-query@5.x` | Server state management, caching | Required per project constraints. v5 is current stable. Handles SSE caching, optimistic updates, background refetch. Essential for multi-tenant data isolation (per-guild cache keys). |
| **@tanstack/react-query-devtools** | `5.x` | Dev tools | Debug cache state during development. |

**Configuration:**
```typescript
// app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1min - balance freshness vs API load
      gcTime: 5 * 60 * 1000, // 5min (was cacheTime in v4)
      refetchOnWindowFocus: true, // Catch up after tab switch
      retry: 1, // Fail fast for auth errors
    },
  },
})
```

**Why React Query for this project:**
- **Multi-tenant isolation:** Cache keys scoped by `guildId` prevent data leaks
- **Real-time SSE:** Can poll or use SSE with custom query logic
- **Optimistic updates:** For Phase 2 write operations
- **Background sync:** Refetch when user returns to tab

**Confidence:** HIGH

---

## Styling & UI

| Library | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| **Tailwind CSS** | `4.1.x` (latest) | Utility-first CSS | Per project constraint. v4.1 uses new `@tailwindcss/postcss` plugin for Next.js. |
| **@tailwindcss/postcss** | `4.1.x` | PostCSS integration | Official Next.js integration method for Tailwind v4+. Replaces old standalone PostCSS config. |
| **tailwindcss-animate** | `1.0.x` | Animation utilities | Lightweight animation utilities for loading states, transitions. No component library needed. |
| **clsx** | `2.1.x` | Conditional classnames | Standard for conditional Tailwind classes. Tiny (228 bytes). |

**NO Component Libraries** (per constraint)
- ✅ Custom components built with Tailwind
- ❌ No shadcn/ui, Radix UI, Headless UI, etc.
- **Why:** Project explicitly requires custom components. Gives full control over design system.

**Tailwind Setup:**
```bash
npm install tailwindcss @tailwindcss/postcss
```

```javascript
// postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
```

```css
/* app/globals.css */
@import "tailwindcss";
```

**Confidence:** HIGH (verified via official Tailwind + Next.js guide)

---

## Real-Time Data (SSE)

**Approach:** Native Fetch API + ReadableStream

Next.js 16 App Router supports streaming via Route Handlers. No library needed for SSE.

```typescript
// app/api/guilds/[guildId]/status/route.ts
export async function GET(request: Request) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Forward SSE from backend API
      const response = await fetch(`${API_URL}/guilds/${guildId}/status`, {
        headers: { Authorization: `Bearer ${jwt}` }
      })

      const reader = response.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        controller.enqueue(value)
      }
      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
```

**Client-side consumption:**
```typescript
// Use with React Query
useQuery({
  queryKey: ['guild-status', guildId],
  queryFn: async () => {
    const response = await fetch(`/api/guilds/${guildId}/status`)
    const reader = response.body.getReader()
    // ... parse SSE
  },
  refetchInterval: false, // SSE handles updates
})
```

**Alternative:** Consider `eventsource-parser` if you need structured SSE parsing.

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **eventsource-parser** | `2.0.x` | Parse SSE streams | Optional. Use if backend sends complex SSE with event types. Native parsing works for simple streams. |

**Confidence:** MEDIUM (SSE with App Router is well-documented, but integration with React Query for SSE needs custom implementation)

---

## API Client & Type Safety

| Library | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| **zod** | `3.24.x` | Runtime validation | Validate API responses to catch drift between dashboard and API. Generate TypeScript types from schemas. |
| **ky** | `1.7.x` | HTTP client | Modern fetch wrapper. Retry logic, timeout, hooks for auth injection. Better DX than raw fetch. Works in Edge Runtime. |

**Why ky over axios:**
- Smaller bundle (4kb vs 32kb)
- Native fetch-based (works in Edge Runtime)
- Better TypeScript support
- Built-in retry and timeout

**API Client Pattern:**
```typescript
// lib/api-client.ts
import ky from 'ky'
import { z } from 'zod'

const client = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL,
  hooks: {
    beforeRequest: [
      async (request) => {
        const token = await getAccessToken() // From cookie
        request.headers.set('Authorization', `Bearer ${token}`)
      }
    ],
    afterResponse: [
      async (request, options, response) => {
        if (response.status === 401) {
          await refreshToken()
          // Retry with new token
        }
      }
    ]
  }
})

// Type-safe API call
const GuildSchema = z.object({
  id: z.string(),
  name: z.string(),
  clientId: z.string(),
})

export async function getGuild(guildId: string) {
  const data = await client.get(`guilds/${guildId}`).json()
  return GuildSchema.parse(data) // Runtime + compile-time safety
}
```

**Confidence:** HIGH

---

## Form Handling

**Approach:** Native React 19 Server Actions (no react-hook-form)

Next.js 16 with React 19 has first-class Server Actions support. No client-side form library needed.

```typescript
// app/actions/update-settings.ts
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const SettingsSchema = z.object({
  alertChannel: z.string().regex(/^\d+$/),
  timezone: z.string(),
})

export async function updateSettings(formData: FormData) {
  const parsed = SettingsSchema.safeParse({
    alertChannel: formData.get('alertChannel'),
    timezone: formData.get('timezone'),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  // Call API
  await fetch(`${API_URL}/guilds/${guildId}/settings`, {
    method: 'PUT',
    body: JSON.stringify(parsed.data),
  })

  revalidatePath(`/guilds/${guildId}`)
  return { success: true }
}
```

**Why no react-hook-form:**
- Server Actions handle validation + mutation natively
- Zod provides schema validation
- Less client-side JavaScript
- Native progressive enhancement

**Confidence:** HIGH (official Next.js pattern from docs)

---

## Development Tools

| Tool | Version | Purpose | Rationale |
|------|---------|---------|-----------|
| **ESLint** | `9.x` | Linting | Next.js includes eslint-config-next. Catches React/Next.js anti-patterns. |
| **Prettier** | `3.4.x` | Code formatting | Standard formatter. Auto-format on save. |
| **@tanstack/react-query-devtools** | `5.x` | Query debugging | Visualize cache state, refetch behavior per guild. |
| **@vercel/analytics** | `1.x` | Web analytics | Vercel-native analytics. Privacy-friendly, no config needed. |

**Confidence:** HIGH

---

## Environment & Deployment

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **Node.js** | `20.x LTS` | Runtime | Vercel default, Next.js 16 requires Node 18.18+. Use 20.x for stability. |
| **pnpm** | `9.x` (optional) | Package manager | Faster than npm, strict dependency resolution. Optional - npm works fine. |
| **Vercel** | N/A | Hosting platform | Per project requirement. Edge Runtime, zero-config Next.js deployment. |

**Vercel Configuration:**
```javascript
// next.config.js
module.exports = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Vercel analytics
  analytics: {
    id: process.env.VERCEL_ANALYTICS_ID,
  },
}
```

**Environment Variables (Dashboard):**
```bash
# .env.local
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_DISCORD_CLIENT_ID=<separate-oauth-app-id>
JWT_SECRET=<same-secret-as-api-for-verification>
```

**Confidence:** HIGH

---

## Testing Stack (Recommended for Phase 1+)

| Library | Version | Purpose | When to Add |
|---------|---------|---------|-------------|
| **Vitest** | `2.x` | Unit testing | Phase 1. Faster than Jest, better ESM support. |
| **@testing-library/react** | `16.x` | Component testing | Phase 1. Test user interactions. |
| **Playwright** | `1.49.x` | E2E testing | Phase 2. Test full OAuth flow, multi-tenant isolation. |

**Not included in MVP** but plan for Phase 1 expansion.

**Confidence:** MEDIUM (not verified against current project needs)

---

## Installation Guide

### Initial Setup
```bash
# Create Next.js project
npx create-next-app@latest tracking-dashboard \
  --typescript \
  --eslint \
  --app \
  --tailwind \
  --no-src-dir \
  --import-alias "@/*"

cd tracking-dashboard
```

### Core Dependencies
```bash
npm install \
  @tanstack/react-query@^5.0.0 \
  zod@^3.24.0 \
  ky@^1.7.0 \
  jose@^5.9.0 \
  clsx@^2.1.0 \
  tailwindcss-animate@^1.0.0
```

### Dev Dependencies
```bash
npm install -D \
  @tanstack/react-query-devtools@^5.0.0 \
  @types/node@^20.0.0 \
  prettier@^3.4.0
```

### Optional (SSE parsing)
```bash
npm install eventsource-parser@^2.0.0
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| **Auth** | Custom JWT | NextAuth.js | API owns auth. NextAuth adds complexity for client-only dashboard. |
| **HTTP Client** | ky | axios | Smaller bundle, Edge-compatible, native fetch wrapper. |
| **Styling** | Tailwind CSS | CSS Modules | Per project constraint. Tailwind required. |
| **State Management** | React Query | Redux/Zustand | React Query specializes in server state. No global client state needed. |
| **Forms** | Server Actions + Zod | react-hook-form | Server Actions are native in React 19. Less client JS. |
| **Validation** | Zod | Yup/Joi | Better TypeScript inference. Standard in Next.js ecosystem. |
| **Real-time** | Native SSE | Socket.io | SSE is simpler for server→client updates. No bidirectional needed. |
| **Runtime** | Node.js 20 | Bun | Vercel uses Node. Bun not production-ready on Vercel yet. |

---

## Anti-Patterns to Avoid

### ❌ Don't: Use NextAuth.js for API-owned auth
**Why:** Creates dual auth systems. Your API already issues JWTs. Dashboard should consume them, not re-implement auth.

**Instead:** Thin auth client that calls API endpoints, stores tokens, validates with `jose`.

### ❌ Don't: Fetch in Server Components without caching strategy
**Why:** React Query can't cache Server Component fetches. Each navigation refetches.

**Instead:** Use React Query in Client Components or implement server-side caching with `unstable_cache`.

### ❌ Don't: Store JWTs in localStorage
**Why:** XSS vulnerability. JWTs should be in httpOnly cookies.

**Instead:** API sets httpOnly cookies via Set-Cookie headers. Dashboard reads via server-side cookies() helper.

### ❌ Don't: Use component libraries (per constraint)
**Why:** Project requires custom components for design control.

**Instead:** Build primitives with Tailwind. Use headless patterns (disclosure, dialog) with custom styling.

### ❌ Don't: Mix Route Handlers and Server Actions for mutations
**Why:** Inconsistent patterns confuse caching.

**Instead:** Use Server Actions for mutations (revalidatePath built-in), Route Handlers for reads/SSE.

---

## Migration Path (Future)

If requirements change:

| If... | Then Consider... | Migration Complexity |
|-------|------------------|---------------------|
| API becomes unreliable | Move auth to NextAuth.js with database sessions | HIGH (2-3 days) |
| Need component library | Add shadcn/ui components selectively | LOW (1 day) |
| SSE too complex | Migrate to WebSockets with Socket.io | MEDIUM (2 days) |
| Vercel limits hit | Migrate to self-hosted with Docker | HIGH (1 week) |
| Multi-region needed | Add Cloudflare Workers as edge proxy | MEDIUM (3 days) |

---

## Open Questions (For Validation)

1. **SSE Implementation:** Does the existing API's SSE endpoint send standard EventSource format, or custom streaming? (Affects parser choice)
2. **Token Storage:** Will API set httpOnly cookies, or return tokens in response body? (Affects client-side storage strategy)
3. **CORS:** Is the API configured for dashboard origin? (Required for cookie-based auth)
4. **Refresh Flow:** Does API support refresh token rotation, or fixed refresh tokens? (Affects security model)

**Recommendation:** Verify these with API implementation before Phase 1.

---

## Confidence Assessment

| Area | Confidence | Source | Notes |
|------|-----------|--------|-------|
| Next.js version | HIGH | Official docs (nextjs.org) | Verified 16.1.4 stable via docs fetch |
| Tailwind v4 | HIGH | Official docs (tailwindcss.com) | Verified 4.1 + Next.js integration guide |
| Auth pattern | HIGH | Next.js auth guide | Custom JWT pattern documented for API-owned auth |
| React Query | MEDIUM | Training data + npm ecosystem | v5 is current (Jan 2025), but version not officially verified |
| SSE + React Query | MEDIUM | Community patterns | No official Next.js + RQ + SSE guide found |
| TypeScript version | MEDIUM | Training data | 5.7.x is current stable (as of Jan 2025) |

**Overall Confidence:** HIGH for core stack, MEDIUM for SSE integration details.

---

## Next Steps

1. **Validate open questions** with existing API codebase
2. **Initialize Next.js project** with recommended stack
3. **Set up Vercel project** and environment variables
4. **Implement auth flow** (Phase 0 prerequisite)
5. **Build first protected route** to validate JWT flow

**Ready for:** Roadmap creation (Phase 0-3 structure)
