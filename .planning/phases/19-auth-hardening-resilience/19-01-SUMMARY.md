---
phase: 19-auth-hardening-resilience
plan: 01
subsystem: auth
tags: [next.js, cookies, ssr, bearer-token, dynamic-import]

# Dependency graph
requires: []
provides:
  - "backendFetch auto-forwards auth_token cookie as Authorization: Bearer header in SSR context"
  - "Dynamic import try/catch guard skips forwarding when not in server context"
  - "!headers.has('Authorization') guard prevents double-injection for existing routes"
affects: [all API route handlers using backendFetch, server components calling backendFetch]

# Tech tracking
tech-stack:
  added: []
  patterns: [dynamic-import-guard-for-server-only-modules, ssr-cookie-auto-forwarding]

key-files:
  created: []
  modified:
    - src/lib/server/backend-fetch.ts

key-decisions:
  - "Dynamic import of next/headers with try/catch rather than static import — defensive pattern even though file is server-only in practice (imports crypto)"
  - "Forward-only (no expiry check in backendFetch) — middleware proxy.ts already proactively refreshes auth_token before SSR page requests; duplicating expiry logic would be redundant"
  - "!headers.has('Authorization') guard ensures backward-compatibility — existing routes that explicitly pass Authorization header are completely unaffected"

patterns-established:
  - "Dynamic import guard: await import('server-only-module') inside try/catch for modules that throw at build time if bundled for client"
  - "Auto-forwarding pattern: check caller hasn't already set header before auto-injecting, preventing double-injection"

requirements-completed: [AUTH-02]

# Metrics
duration: 37s
completed: 2026-02-23
---

# Phase 19 Plan 01: Auth Hardening — SSR Cookie Auto-Forwarding Summary

**backendFetch now auto-injects auth_token cookie as Authorization: Bearer in SSR context via dynamic import guard, with !headers.has guard preventing double-injection for existing routes**

## Performance

- **Duration:** 37s
- **Started:** 2026-02-23T03:55:08Z
- **Completed:** 2026-02-23T03:55:45Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added SSR cookie auto-forwarding to backendFetch — route handlers and server components no longer need to manually extract auth_token cookie and pass it as Authorization header
- `!headers.has('Authorization')` guard ensures all existing API routes that explicitly set Authorization remain fully backwards-compatible with zero changes required
- Dynamic import try/catch ensures the function is safe to call from any context — the catch block silently skips forwarding if next/headers is unavailable
- TypeScript compilation passes cleanly with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add SSR cookie auto-forwarding to backendFetch** - `180f22f` (feat)

**Plan metadata:** `a681113` (docs: complete plan)

## Files Created/Modified
- `src/lib/server/backend-fetch.ts` - Added auto-forwarding block before INTERNAL_SECRET block; updated JSDoc

## Decisions Made
- Dynamic import of `next/headers` with try/catch rather than static import — recommended defensive pattern for modules that throw at build time if they land in a client bundle; even though `backend-fetch.ts` is server-only in practice (imports Node.js `crypto`), the guard is explicitly required by the plan spec
- Forward-only without expiry check — `proxy.ts` middleware already proactively refreshes `auth_token` before SSR page requests land, so adding expiry logic inside `backendFetch` would duplicate middleware responsibility
- Guard placed before `INTERNAL_SECRET` block — auth token injection logically precedes internal secret injection

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- backendFetch auto-forwarding is live — Phase 19 Plan 02 can build on this to clean up redundant explicit token extraction in API route handlers
- All existing routes are backwards-compatible — no migration needed before the next plan ships

---
*Phase: 19-auth-hardening-resilience*
*Completed: 2026-02-23*
