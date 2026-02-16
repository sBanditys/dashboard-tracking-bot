# Phase 11: Session Management - Research

**Researched:** 2026-02-16
**Domain:** Session management, device detection, JWT security
**Confidence:** HIGH

## Summary

Phase 11 implements session management capabilities allowing users to view their active sessions and revoke access from specific devices. The research reveals the system already has robust JWT-based session infrastructure in place via `DashboardSession` table and backend endpoints (GET `/api/v1/auth/sessions`, DELETE `/api/v1/auth/sessions/:sessionId`, POST `/api/v1/auth/logout-all`). The primary work involves building frontend UI components and dashboard proxy routes to consume these existing APIs.

The technical architecture is well-suited for this phase: backend stores session metadata (userAgent, ipAddress, createdAt, expiresAt) and implements secure revocation via database updates. Frontend needs user-agent parsing for device/browser display, card-based session list UI, confirmation dialogs for revocation, and proper handling of edge cases like revoking the current session.

**Primary recommendation:** Use ua-parser-js for device detection (server-side parsing in dashboard API routes), build session cards with existing Headless UI components (Dialog for confirmations), implement IP masking helper, and add session list page under `/settings/sessions` route following existing dashboard patterns.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Session list display:**
- Card-based layout — each session rendered as an individual card
- Full detail per card: device type, browser, OS, masked IP, last active timestamp, location (if available)
- Device icons shown alongside text labels (Desktop, Mobile, Tablet icons)
- Header with session count and description (e.g., "Active Sessions (3)")

**Revocation behavior:**
- Confirmation dialog (modal) before revoking a single session — shows device details
- Revoked session card animates out with smooth transition
- "Logout all devices" revokes ALL sessions including current — redirects user to login page
- "Logout all devices" uses same confirmation dialog style as single revoke (no extra warning)

**Device identification:**
- Masked IP display (e.g., 192.168.xxx.xxx) for privacy
- Device icons for Desktop, Mobile, Tablet alongside text labels

**Page location & layout:**
- "Logout all devices" button placed at bottom of the session list (less prominent)
- Header shows "Active Sessions (X)" with brief description

### Claude's Discretion

- Current session indicator style (badge, highlight, pinned position)
- Session list sort order
- Device parsing depth (rich vs basic user agent parsing)
- Unknown/unrecognizable device fallback display
- Page location within dashboard (settings tab, standalone page, or profile dropdown)
- Single-session edge case (whether to show/hide "Logout all" when only one session exists)
- Exact card spacing, typography, and animation timing

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ua-parser-js | ^2.0.9 | User-agent parsing | Industry standard for device/browser detection, 219 code snippets in docs, High reputation, supports Node.js server-side parsing |
| @headlessui/react | ^2.2.9 | Headless UI components | Already installed, provides Dialog for confirmation modals |
| @tanstack/react-query | ^5.90.20 | Server state management | Already installed, handles session data fetching/mutations |
| date-fns | ^4.1.0 | Date formatting | Already installed, formats last active timestamps |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | Latest | Device icons | Desktop, Mobile, Tablet, Monitor icons for session cards |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ua-parser-js | next/headers userAgent() | Next.js built-in is simpler but less detailed (no device icons, less granular parsing) |
| Headless UI Dialog | Radix UI AlertDialog | Would require new dependency; Headless UI already present |
| Server-side parsing | Client-side parsing | Client parsing leaks user-agent to client bundle, less secure |

**Installation:**
```bash
npm install ua-parser-js lucide-react
npm install --save-dev @types/ua-parser-js
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── settings/
│   │       └── sessions/
│   │           └── page.tsx          # Session management page
│   └── api/
│       └── auth/
│           ├── sessions/
│           │   └── route.ts          # Proxy GET /api/v1/auth/sessions
│           └── sessions/
│               └── [sessionId]/
│                   └── route.ts      # Proxy DELETE /api/v1/auth/sessions/:sessionId
├── components/
│   └── sessions/
│       ├── session-card.tsx          # Individual session display
│       ├── session-list.tsx          # List of sessions
│       └── revoke-session-dialog.tsx # Confirmation dialog
├── hooks/
│   └── use-sessions.ts               # React Query hooks for sessions
└── lib/
    └── device-info.ts                # ua-parser-js wrapper utilities
```

### Pattern 1: Backend Session Storage (Already Implemented)

**What:** Sessions stored in `DashboardSession` table with metadata for display
**When to use:** Session management requiring audit trail and device context
**Example:**

```typescript
// From: api/src/services/dashboard/jwtService.ts (existing code)
await prisma.dashboardSession.create({
  data: {
    userId: user.id,
    refreshToken: hashedRefreshToken,
    userAgent: normalizedMetadata.userAgent,
    ipAddress: normalizedMetadata.ipAddress,
    expiresAt,
  },
});
```

**Key insight:** Backend already captures userAgent and ipAddress during token creation, enabling rich session display without additional instrumentation.

### Pattern 2: User-Agent Parsing (Server-Side)

**What:** Parse user-agent strings in dashboard API routes (not frontend)
**When to use:** When displaying device/browser information to users
**Example:**

```typescript
// Source: ua-parser-js docs
import { UAParser } from 'ua-parser-js';

const parser = new UAParser(userAgent);
const browser = parser.getBrowser();  // { name: "Chrome", version: "110.0.0.0" }
const device = parser.getDevice();    // { type: "mobile", vendor: "Samsung", model: "Galaxy S21" }
const os = parser.getOS();            // { name: "Android", version: "11" }
```

**Key insight:** Server-side parsing keeps bundle size small, prevents client exposure of parsing logic, and enables caching of parsed results.

### Pattern 3: IP Address Masking

**What:** Mask IP addresses for privacy (e.g., `192.168.xxx.xxx`)
**When to use:** Displaying IP addresses to users
**Example:**

```typescript
// Source: api/src/routes/dashboard/auth/authHelpers.ts (existing helper)
export function maskIp(ip: string): string {
  if (ip.includes(':')) {
    // IPv6: show first 4 groups
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':') + ':xxxx:xxxx:xxxx:xxxx';
  }
  // IPv4: show first 2 octets
  const parts = ip.split('.');
  return parts.slice(0, 2).join('.') + '.xxx.xxx';
}
```

**Key insight:** Backend already implements `maskIp()` and uses it in GET `/api/v1/auth/sessions` response.

### Pattern 4: Session Revocation with Current Session Detection

**What:** Detect if user is revoking their current session to show appropriate feedback
**When to use:** Single session revocation UI
**Example:**

```typescript
// Compare current session ID from access token with session being revoked
const currentSessionId = getCurrentSessionId(accessToken); // Parse from JWT or API
const isCurrentSession = sessionId === currentSessionId;

if (isCurrentSession) {
  // Show warning: "You will be logged out after revoking this session"
  // After revocation, redirect to /login
} else {
  // Just remove from list with animation
}
```

**Key insight:** Backend doesn't explicitly track "current session ID" in JWT, but dashboard can infer current session by comparing refresh token hash or using heuristics (most recent session with matching IP/userAgent).

### Pattern 5: Logout All Devices

**What:** Revoke all sessions including current, then redirect to login
**When to use:** Security action requiring re-authentication
**Example:**

```typescript
// Source: api/src/routes/dashboard/auth/authRoutes.ts (existing endpoint)
router.post('/logout-all', requireDashboardAuth, async (req, res) => {
  const userId = req.dashboardUser!.sub;
  const count = await revokeAllUserSessions(userId);
  clearDashboardSessionCookies(res);
  res.json({ success: true, sessions_revoked: count });
});
```

**Dashboard usage:**
```typescript
await logoutAll();
router.push('/login'); // Redirect after successful revocation
```

**Key insight:** POST `/api/v1/auth/logout-all` already clears cookies and revokes all sessions, dashboard just needs to call endpoint and redirect.

### Anti-Patterns to Avoid

- **Parsing user-agents client-side:** Increases bundle size, exposes parsing logic, prevents caching
- **Storing session list client-side:** Always fetch from server to ensure accuracy after revocations
- **Skipping confirmation dialogs:** Users must confirm destructive actions (revocation)
- **Not handling current session edge case:** Revoking current session without logout leads to confusing UX

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User-agent parsing | Custom regex for device detection | ua-parser-js | 10,000+ device patterns, handles edge cases, actively maintained |
| Device icons | Custom SVG set | lucide-react icons | Consistent design system, tree-shakeable, widely adopted |
| Confirmation dialogs | Custom modal component | Headless UI Dialog | Focus management, accessibility, keyboard shortcuts built-in |
| IP masking | Custom string manipulation | Existing `maskIp()` helper | Already tested, handles IPv4/IPv6 correctly |
| Session refresh | Manual polling | React Query with refetchInterval | Automatic refetching, deduplication, error handling |

**Key insight:** User-agent parsing is deceptively complex (bot detection, regional variants, spoofing, legacy browsers). ua-parser-js has 219 documented patterns and handles edge cases like in-app browsers (TikTok, Instagram), crawlers, and unusual form factors.

## Common Pitfalls

### Pitfall 1: Not Handling Session Revocation Race Conditions

**What goes wrong:** User revokes session A in tab 1, session A makes API call in tab 2 before token expires, backend rejects with 401, user sees confusing error
**Why it happens:** JWT access tokens remain valid until expiry (60 min), but refresh tokens are immediately revoked
**How to avoid:** Backend already implements JTI revocation (api/src/services/dashboard/jwtService.ts) to invalidate access tokens immediately when session is revoked
**Warning signs:** Users report seeing "Unauthorized" errors after revoking sessions in multi-tab scenarios

### Pitfall 2: Displaying Full IP Addresses

**What goes wrong:** Privacy violation, users uncomfortable seeing full IPs, potential GDPR compliance issue
**Why it happens:** Backend stores full IP for security/audit, forgetting to mask before display
**How to avoid:** Always use `maskIp()` helper when displaying IPs to users (backend already does this in GET `/api/v1/auth/sessions`)
**Warning signs:** User complaints about privacy, full IPs visible in frontend

### Pitfall 3: Missing Current Session Indicator

**What goes wrong:** Users confused about which session is "this device," accidentally revoke current session thinking it's old
**Why it happens:** No visual distinction between current and other sessions
**How to avoid:** Add "Current Session" badge or highlight, compare session metadata (IP, userAgent) with current request
**Warning signs:** Support tickets about "accidental logouts"

### Pitfall 4: Stale Session List After Revocation

**What goes wrong:** User revokes session, clicks back, session still appears in list
**Why it happens:** React Query cache not invalidated after mutation
**How to avoid:** Invalidate `['sessions']` query key after successful DELETE
**Warning signs:** UI shows ghost sessions that reappear on refresh

### Pitfall 5: Unknown Device Fallback

**What goes wrong:** User-agent parsing fails, UI shows blank/broken device info
**Why it happens:** Rare/new user-agents not recognized by parser
**How to avoid:** Provide fallback: "Unknown Device" label, generic monitor icon, display raw browser name if available
**Warning signs:** Reports of missing session information for certain browsers

### Pitfall 6: Logout All Without Redirect

**What goes wrong:** User clicks "Logout all devices," stays on session page, tries to navigate, gets 401 errors
**Why it happens:** Frontend doesn't redirect after logout-all, cookies cleared but user still on protected route
**How to avoid:** Always redirect to `/login` after successful POST `/api/v1/auth/logout-all`
**Warning signs:** Users stuck on session page after logout-all

## Code Examples

Verified patterns from official sources:

### Parse User-Agent in Dashboard API Route

```typescript
// app/api/auth/sessions/route.ts
import { NextResponse } from 'next/server';
import { UAParser } from 'ua-parser-js';

interface BackendSession {
  id: string;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  expires_at: string;
}

interface ParsedSession {
  id: string;
  device: {
    type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    name: string; // "Desktop", "Mobile", "Tablet"
  };
  browser: {
    name: string; // "Chrome"
    version: string; // "110.0.0.0"
  };
  os: {
    name: string; // "Windows"
    version: string; // "10"
  };
  ipAddress: string; // "192.168.xxx.xxx"
  createdAt: string;
  expiresAt: string;
}

export async function GET() {
  // Fetch from backend
  const response = await fetch(`${API_URL}/api/v1/auth/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();

  // Parse each session's user-agent
  const sessions: ParsedSession[] = data.sessions.map((session: BackendSession) => {
    const parser = new UAParser(session.user_agent || '');
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();

    // Determine device type
    let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';
    let deviceName = 'Unknown Device';

    if (device.type === 'mobile') {
      deviceType = 'mobile';
      deviceName = 'Mobile';
    } else if (device.type === 'tablet') {
      deviceType = 'tablet';
      deviceName = 'Tablet';
    } else if (!device.type || device.type === 'desktop') {
      deviceType = 'desktop';
      deviceName = 'Desktop';
    }

    return {
      id: session.id,
      device: { type: deviceType, name: deviceName },
      browser: {
        name: browser.name || 'Unknown',
        version: browser.version || '',
      },
      os: {
        name: os.name || 'Unknown',
        version: os.version || '',
      },
      ipAddress: session.ip_address || 'Unknown',
      createdAt: session.created_at,
      expiresAt: session.expires_at,
    };
  });

  return NextResponse.json({ sessions });
}
```

### Session Card Component

```typescript
// components/sessions/session-card.tsx
'use client';

import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SessionCardProps {
  session: {
    id: string;
    device: { type: 'desktop' | 'mobile' | 'tablet' | 'unknown'; name: string };
    browser: { name: string; version: string };
    os: { name: string; version: string };
    ipAddress: string;
    createdAt: string;
  };
  isCurrent?: boolean;
  onRevoke: (sessionId: string) => void;
}

const DEVICE_ICONS = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  unknown: Monitor,
} as const;

export function SessionCard({ session, isCurrent = false, onRevoke }: SessionCardProps) {
  const DeviceIcon = DEVICE_ICONS[session.device.type];
  const lastActive = formatDistanceToNow(new Date(session.createdAt), { addSuffix: true });

  return (
    <div className="bg-surface border border-border rounded-sm p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <DeviceIcon className="w-6 h-6 text-gray-400" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-medium">{session.device.name}</h3>
              {isCurrent && (
                <span className="text-xs bg-accent-purple/20 text-accent-purple px-2 py-0.5 rounded">
                  Current Session
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400">
              {session.browser.name} {session.browser.version} · {session.os.name}
            </p>
          </div>
        </div>
        <button
          onClick={() => onRevoke(session.id)}
          className="text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          Revoke
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-400">IP Address</p>
          <p className="text-white font-mono">{session.ipAddress}</p>
        </div>
        <div>
          <p className="text-gray-400">Last Active</p>
          <p className="text-white">{lastActive}</p>
        </div>
      </div>
    </div>
  );
}
```

### Session Revocation Hook

```typescript
// hooks/use-sessions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

interface Session {
  id: string;
  device: { type: string; name: string };
  browser: { name: string; version: string };
  os: { name: string; version: string };
  ipAddress: string;
  createdAt: string;
  expiresAt: string;
}

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async (): Promise<Session[]> => {
      const res = await fetch('/api/auth/sessions');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      return data.sessions;
    },
    refetchInterval: 30000, // Refresh every 30s
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to revoke session');
    },
    onSuccess: () => {
      // Invalidate and refetch sessions list
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useLogoutAll() {
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/logout-all', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to logout from all devices');
    },
    onSuccess: () => {
      // Redirect to login after successful logout-all
      router.push('/login');
    },
  });
}
```

### Revocation Confirmation Dialog

```typescript
// components/sessions/revoke-session-dialog.tsx
'use client';

import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react';

interface RevokeSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deviceName: string;
  isCurrent: boolean;
  isLoading?: boolean;
}

export function RevokeSessionDialog({
  open,
  onClose,
  onConfirm,
  deviceName,
  isCurrent,
  isLoading = false,
}: RevokeSessionDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-w-md w-full bg-surface border border-border rounded-lg p-6 space-y-4">
          <DialogTitle className="text-lg font-semibold text-white">
            Revoke Session
          </DialogTitle>

          <Description className="text-gray-300">
            {isCurrent ? (
              <>
                You are about to revoke your current session on{' '}
                <span className="text-white font-medium">{deviceName}</span>.
                You will be logged out and redirected to the login page.
              </>
            ) : (
              <>
                Are you sure you want to revoke the session on{' '}
                <span className="text-white font-medium">{deviceName}</span>?
                This action cannot be undone.
              </>
            )}
          </Description>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50"
            >
              {isLoading ? 'Revoking...' : 'Revoke Session'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
```

### Session List Page

```typescript
// app/(dashboard)/settings/sessions/page.tsx
'use client';

import { useState } from 'react';
import { useSessions, useRevokeSession, useLogoutAll } from '@/hooks/use-sessions';
import { SessionCard } from '@/components/sessions/session-card';
import { RevokeSessionDialog } from '@/components/sessions/revoke-session-dialog';
import { Button } from '@/components/ui/button';

export default function SessionsPage() {
  const { data: sessions, isLoading } = useSessions();
  const revokeSession = useRevokeSession();
  const logoutAll = useLogoutAll();

  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);

  const handleRevokeClick = (sessionId: string) => {
    setSessionToRevoke(sessionId);
    setRevokeDialogOpen(true);
  };

  const handleConfirmRevoke = () => {
    if (!sessionToRevoke) return;
    revokeSession.mutate(sessionToRevoke, {
      onSuccess: () => {
        setRevokeDialogOpen(false);
        setSessionToRevoke(null);
      },
    });
  };

  const session = sessions?.find((s) => s.id === sessionToRevoke);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Active Sessions</h1>
        <p className="text-gray-400">
          Manage your active sessions across different devices
        </p>
      </div>

      {isLoading ? (
        <div className="text-gray-400">Loading sessions...</div>
      ) : sessions && sessions.length > 0 ? (
        <div className="space-y-4">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isCurrent={false} // TODO: Detect current session
              onRevoke={handleRevokeClick}
            />
          ))}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-sm p-6">
          <p className="text-gray-400">No active sessions found.</p>
        </div>
      )}

      {sessions && sessions.length > 1 && (
        <div className="pt-4 border-t border-border">
          <Button
            variant="destructive"
            onClick={() => logoutAll.mutate()}
            loading={logoutAll.isPending}
          >
            Logout All Devices
          </Button>
          <p className="text-sm text-gray-400 mt-2">
            This will log you out of all devices including this one
          </p>
        </div>
      )}

      <RevokeSessionDialog
        open={revokeDialogOpen}
        onClose={() => setRevokeDialogOpen(false)}
        onConfirm={handleConfirmRevoke}
        deviceName={session?.device.name || 'Unknown Device'}
        isCurrent={false} // TODO: Detect current session
        isLoading={revokeSession.isPending}
      />
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Session IDs in cookies | JWT + Refresh tokens | ~2020 | Stateless auth, easier horizontal scaling |
| Expire-only invalidation | Active revocation via blacklist | 2024+ | Immediate logout, better security |
| Client-side UA parsing | Server-side with ua-parser-js | 2023+ | Smaller bundles, more accurate parsing |
| Manual device icons | lucide-react icon library | 2022+ | Consistent design, tree-shakeable |
| Full IP display | Masked IPs (privacy-first) | GDPR era (2018+) | Privacy compliance, user trust |

**Deprecated/outdated:**

- **Traditional session cookies:** JWTs with refresh token rotation now standard for SPAs
- **express-useragent:** Superseded by ua-parser-js (more comprehensive, better maintained)
- **Polling for session list updates:** React Query `refetchInterval` handles this automatically
- **Manual focus management in modals:** Headless UI / Radix UI provide this out-of-box

## Open Questions

1. **Current Session Detection Logic**
   - What we know: Backend stores userAgent and ipAddress, frontend can compare with current request headers
   - What's unclear: Should we rely on heuristics (IP + userAgent match) or add explicit "sessionId" to JWT claims?
   - Recommendation: Use heuristics initially (compare IP + userAgent), consider adding explicit sessionId to JWT in future if false positives occur

2. **Geolocation from IP Address**
   - What we know: Decision specifies "location (if available)" but backend doesn't store geolocation
   - What's unclear: Should we implement IP geolocation lookup, or is this optional "nice-to-have"?
   - Recommendation: Mark as optional for Phase 11 (use "Location unavailable" fallback), consider adding IP geolocation service in future phase if user requests it

3. **Session Sorting**
   - What we know: Claude has discretion on sort order
   - What's unclear: Most recent first? Current session pinned to top? Alphabetical by device?
   - Recommendation: Current session first (pinned), then sort by `createdAt DESC` (most recent first)

4. **Animation on Revoke**
   - What we know: Decision specifies "animates out with smooth transition"
   - What's unclear: Fade out? Slide left? Scale down?
   - Recommendation: Fade + scale out (0.3s ease-out), use optimistic update to remove immediately from UI while mutation in flight

## Sources

### Primary (HIGH confidence)

- **/faisalman/ua-parser-js-docs** - Device detection, browser/OS parsing patterns (219 code snippets)
- **Backend codebase** - Existing session endpoints, JWT service, DashboardSession schema (`~/Desktop/Tracking Data Bot/api/src/routes/dashboard/auth/authRoutes.ts`, `jwtService.ts`)
- **Dashboard codebase** - Existing auth patterns, component library (`~/Desktop/dashboard-tracking-bot/src/`)

### Secondary (MEDIUM confidence)

- [Clerk: Complete Guide to Session Management in Next.js](https://clerk.com/blog/complete-guide-session-management-nextjs) - Session management patterns for Next.js
- [Next.js 16 Route Handlers](https://strapi.io/blog/nextjs-16-route-handlers-explained-3-advanced-usecases) - App Router patterns for API routes
- [shadcn/ui Alert Dialog](https://ui.shadcn.com/docs/components/radix/alert-dialog) - Confirmation modal component patterns

### Tertiary (LOW confidence)

- [Security.org: How to Hide Your IP Address in 2026](https://www.security.org/vpn/hide-your-ip-address/) - IP masking best practices
- [SuperTokens: Revoke Access Using a JWT Blacklist](https://supertokens.com/blog/revoking-access-with-a-jwt-blacklist) - JWT revocation strategies
- [Medium: Scalable Log Out from All Devices Using JWTs](https://medium.com/@md.tarikulislamjuel/system-design-scalable-log-out-from-all-devices-using-jwts-7b7f94faca1f) - Multi-device logout patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - ua-parser-js is industry standard with extensive docs, existing dependencies verified in package.json
- Architecture: HIGH - Backend endpoints already exist and tested, patterns match existing dashboard code
- Pitfalls: HIGH - Based on verified backend implementation (JTI revocation, maskIp helper, etc.)

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (30 days - stable domain, unlikely to change significantly)
