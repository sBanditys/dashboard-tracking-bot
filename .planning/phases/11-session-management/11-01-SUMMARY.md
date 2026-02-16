---
phase: 11-session-management
plan: 01
subsystem: session-management
tags: [auth, api-proxy, react-query, user-agent-parsing]

dependency_graph:
  requires: []
  provides:
    - session-types
    - sessions-api-routes
    - session-management-hooks
  affects:
    - dashboard-auth-layer

tech_stack:
  added:
    - ua-parser-js@2.0.9
    - lucide-react@0.564.0
  patterns:
    - Server-side UA parsing for security
    - Current session detection via UA + IP prefix matching
    - IP address masking for privacy
    - React Query with optimistic invalidation

key_files:
  created:
    - src/types/session.ts
    - src/app/api/auth/sessions/route.ts
    - src/app/api/auth/sessions/[sessionId]/route.ts
    - src/app/api/auth/logout-all/route.ts
    - src/hooks/use-sessions.ts
  modified:
    - package.json
    - package-lock.json

decisions:
  - title: "Server-side UA parsing"
    rationale: "Parse user-agents server-side to prevent client tampering and reduce bundle size"
    alternatives: ["Client-side parsing (rejected - security risk)"]
  - title: "IP prefix matching for current session"
    rationale: "Match first 2 octets (IPv4) or 4 groups (IPv6) to detect current session without exact IP match (handles NAT/proxy scenarios)"
    alternatives: ["Exact IP match (rejected - fails behind NAT/proxies)"]
  - title: "30s staleTime with 60s refetch"
    rationale: "Balance freshness with API efficiency - sessions don't change rapidly but need reasonable updates"
    alternatives: ["Real-time websocket (rejected - overkill for this feature)"]

metrics:
  duration: 2m 14s
  completed_at: 2026-02-16T12:16:04Z
---

# Phase 11 Plan 01: Session Management Data Layer Summary

**One-liner:** JWT session list, revocation, and logout-all with server-side UA parsing (desktop/mobile/tablet detection) and React Query hooks

## Execution

### Tasks Completed

| Task | Name                                          | Commit  | Files |
| ---- | --------------------------------------------- | ------- | ----- |
| 1    | Install deps, create types, build API routes  | f8191fb | 6     |
| 2    | Create use-sessions React Query hooks        | b234fb4 | 1     |

### Implementation Details

**Task 1: Session types and API proxy routes**
- Installed `ua-parser-js` and `lucide-react` dependencies
- Created `BackendSession`, `ParsedSession`, and `DeviceType` type definitions
- Built GET `/api/auth/sessions` route with:
  - Server-side user-agent parsing via `ua-parser-js`
  - Device type classification (desktop/mobile/tablet/unknown)
  - Browser and OS extraction with fallbacks
  - IP address masking (xxx.xxx for privacy)
  - Current session detection via UA + IP prefix matching
  - Fallback: marks most recent session as current if no match
- Built DELETE `/api/auth/sessions/[sessionId]` route for single session revocation
- Built POST `/api/auth/logout-all` route with cookie clearing on success
- All routes follow established patterns: `backendFetch`, async cookies API, try/catch error handling

**Task 2: React Query hooks**
- Created `useSessions()` hook with 30s staleTime and 60s background refetch
- Created `useRevokeSession()` mutation with automatic cache invalidation
- Created `useLogoutAll()` mutation with full cache clear and redirect to `/login`
- All hooks use `fetchWithRetry` for automatic retry logic
- Toast notifications on error using `sonner`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed UAParser import syntax**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** `import UAParser from 'ua-parser-js'` failed with "not constructable" error (ua-parser-js v2 exports named export)
- **Fix:** Changed to `import { UAParser } from 'ua-parser-js'`
- **Files modified:** src/app/api/auth/sessions/route.ts
- **Commit:** Included in f8191fb (fix applied before commit)

## Verification Results

All verification checks passed:
- ✅ TypeScript compilation passes with no errors
- ✅ ua-parser-js and lucide-react packages confirmed installed
- ✅ All 5 new source files exist and have correct exports
- ✅ API routes follow established patterns (backendFetch, cookies, error handling)
- ✅ Hooks use fetchWithRetry, React Query, and toast notification patterns

## Self-Check

**Files created:**
```
FOUND: src/types/session.ts
FOUND: src/app/api/auth/sessions/route.ts
FOUND: src/app/api/auth/sessions/[sessionId]/route.ts
FOUND: src/app/api/auth/logout-all/route.ts
FOUND: src/hooks/use-sessions.ts
```

**Commits verified:**
```
FOUND: f8191fb (Task 1 - Session types and API routes)
FOUND: b234fb4 (Task 2 - React Query hooks)
```

**Exports verified:**
```
✅ ParsedSession, DeviceType, BackendSession, SessionsResponse from session.ts
✅ GET from sessions/route.ts
✅ DELETE from sessions/[sessionId]/route.ts
✅ POST from logout-all/route.ts
✅ useSessions, useRevokeSession, useLogoutAll from use-sessions.ts
```

## Self-Check: PASSED

## Success Criteria

- ✅ Session types defined with ParsedSession interface including device/browser/OS fields and isCurrent flag
- ✅ GET /api/auth/sessions proxy route parses user-agents server-side via ua-parser-js and detects current session
- ✅ DELETE /api/auth/sessions/[sessionId] proxy route forwards revocation to backend
- ✅ POST /api/auth/logout-all proxy route revokes all sessions and clears cookies
- ✅ useSessions hook fetches and caches session data with 30s staleTime
- ✅ useRevokeSession hook deletes a session and invalidates the sessions cache
- ✅ useLogoutAll hook triggers logout-all, clears React Query cache, and redirects to /login

## Next Steps

Phase 11 Plan 02: Build the session management UI components (session list card, device icons, revoke buttons).
