---
phase: 16-restore-nextjs-middleware
plan: 01
subsystem: auth
tags: [nextjs, middleware, csrf, csp, security-headers, playwright]

# Dependency graph
requires:
  - phase: 15-reactivate-nextjs-middleware
    provides: proxy.ts with CSRF, CSP, auth redirect logic that was renamed from middleware.ts in commit 2feb03e

provides:
  - Active src/middleware.ts with named middleware export (Next.js runtime detectable)
  - CSRF double-submit cookie pattern active (_csrf_token)
  - CSP header with nonce-based script-src on all page responses
  - Auth redirect (307 to /?returnTo=/path) for unauthenticated dashboard routes
  - E2E verification script confirming all middleware behaviors

affects: [any future phase touching middleware, auth, or security headers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Next.js middleware must be named middleware.ts (not proxy.ts) for runtime detection via isMiddlewareFilename()"
    - "git mv preserves file history across renames"

key-files:
  created:
    - .planning/phases/16-restore-nextjs-middleware/verify-middleware.mjs
  modified:
    - src/middleware.ts (renamed from src/proxy.ts, function name changed from proxy to middleware)

key-decisions:
  - "middleware.ts is the correct convention — proxy.ts was a regression from commit 2feb03e; git mv src/proxy.ts src/middleware.ts preserves history"
  - "No logic changes during rename — file body identical, only file name and exported function name changed"
  - "Playwright API used directly (not test runner) for E2E verification because test runner hangs in sandbox environment"

patterns-established:
  - "Use verify-middleware.mjs pattern (Playwright API direct) for sandbox-safe E2E middleware verification"

requirements-completed: [AUTH-03, AUTH-04]

# Metrics
duration: 1m
completed: 2026-02-22
---

# Phase 16 Plan 01: Restore Next.js Middleware Summary

**Undid regression from commit 2feb03e by renaming proxy.ts back to middleware.ts, restoring CSRF cookie issuance, nonce-based CSP headers, and auth redirects — all 9 E2E checks pass**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-22T17:57:51Z
- **Completed:** 2026-02-22T17:59:06Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Renamed `src/proxy.ts` to `src/middleware.ts` using `git mv` to preserve git history
- Changed exported function name from `proxy` to `middleware` so Next.js runtime detects it via `isMiddlewareFilename()`
- Confirmed TypeScript compiles without new errors
- E2E verified: `_csrf_token` cookie (AUTH-03), `Content-Security-Policy` header with nonce (AUTH-04), and `307 → /?returnTo=%2Fguilds` auth redirect all confirmed active

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename proxy.ts to middleware.ts and restore middleware export** - `51ae02b` (feat)
2. **Task 2: Verify middleware activation with E2E tests** - `4f48704` (test)

## Files Created/Modified

- `src/middleware.ts` - Renamed from proxy.ts; only change is `export async function middleware` (was `proxy`) — all security logic intact
- `.planning/phases/16-restore-nextjs-middleware/verify-middleware.mjs` - Playwright API verification script (9 checks: static + runtime)

## Decisions Made

- No logic changes during rename — the entire file body stays identical, only file name and exported function name changed. This ensures no behavioral regression risk.
- Playwright API used directly for E2E verification (not `npx playwright test`) to avoid test runner subprocess IPC hang in sandbox environments — documented pattern from Phase 15-02.
- `git mv` used instead of copy+delete to preserve full git history for the middleware file.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - the rename was clean, TypeScript compiled without errors, and all 9 E2E checks passed on first run.

E2E results summary:
- PASS: src/middleware.ts exists
- PASS: src/proxy.ts does not exist (no dual-file conflict)
- PASS: middleware export name is correct
- PASS: Old proxy export name removed from src/middleware.ts
- PASS: Content-Security-Policy header present with nonce (nonce-ZTU0OWMzNGMt...)
- PASS: X-Request-ID header present
- PASS: _csrf_token cookie set (httpOnly=false, sameSite=Lax)
- PASS: Auth redirect issued: 307 to /?returnTo=%2Fguilds
- PASS: returnTo parameter present in redirect location

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- AUTH-03 (CSRF) and AUTH-04 (CSP) requirements are now fully satisfied
- Phase 16 goal achieved: Next.js middleware is active under the locked convention (middleware.ts)
- No known blockers

---
*Phase: 16-restore-nextjs-middleware*
*Completed: 2026-02-22*
