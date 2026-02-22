---
phase: 15-reactivate-nextjs-middleware
plan: 01
subsystem: auth
tags: [nextjs, middleware, csrf, csp, security-headers, rate-limiting]

# Dependency graph
requires:
  - phase: 10-frontend-security
    provides: security-headers.ts with CSP builder, CSRF double-submit cookie pattern
provides:
  - Active Next.js middleware with CSRF cookie issuance, CSP header injection, and auth redirects
  - Enhanced CSP with font-src fonts.gstatic.com, connect-src wss:, report-uri /api/csp-report
  - X-Request-ID per-request UUID on all responses
  - Cache-Control: no-store on authenticated page responses
  - HSTS header in production
  - /api/csp-report endpoint with IP rate limiting and webhook forwarding
  - Auth redirect chain: middleware(/?returnTo) -> landing -> login -> OAuth -> callback -> original path
affects:
  - future auth phases
  - any phase modifying middleware or security headers

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Middleware matcher with missing-header prefetch filtering for better performance"
    - "CSRF exemption for CSP report route (browsers send reports without custom headers)"
    - "In-memory rate limiter with periodic cleanup via setInterval for edge routes"
    - "X-Request-ID propagated from middleware to downstream request and all response paths"

key-files:
  created:
    - src/middleware.ts
    - src/app/api/csp-report/route.ts
  modified:
    - src/lib/server/security-headers.ts
    - src/app/page.tsx
  deleted:
    - src/proxy.ts

key-decisions:
  - "Auth redirect changed from /login?callbackUrl to /?returnTo to route through landing page which bridges to /login?callbackUrl"
  - "CSP report route is CSRF-exempt because browsers send violation reports without custom headers"
  - "X-Request-ID always propagated via NextResponse.next({ request: { headers: requestHeaders } }) since requestHeaders is always modified"
  - "HSTS guarded by production-only check (max-age=31536000; includeSubDomains)"

patterns-established:
  - "Pattern: All response paths (early returns, redirects, main response) get X-Request-ID and HSTS applied"
  - "Pattern: In-memory rate limiter with setInterval cleanup for Next.js edge API routes"

requirements-completed: [AUTH-03, AUTH-04]

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 15 Plan 01: Reactivate Next.js Middleware Summary

**Active Next.js middleware with CSRF cookie issuance, nonce-based CSP injection, X-Request-ID tracking, HSTS, Cache-Control, and returnTo-aware auth redirect chain — fixing the root cause of v1.1 middleware inactivity (proxy.ts rename)**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-22T12:21:56Z
- **Completed:** 2026-02-22T12:24:53Z
- **Tasks:** 2
- **Files modified:** 4 (+ 1 created, 1 deleted)

## Accomplishments
- Renamed proxy.ts to middleware.ts and fixed the exported function name — restoring active middleware (root cause of all v1.1 audit gaps)
- Enhanced security headers: font-src fonts.gstatic.com, connect-src wss:, report-uri /api/csp-report, X-Request-ID, HSTS (prod only), Cache-Control: no-store (authenticated pages)
- Created /api/csp-report endpoint with 10 req/min IP rate limiting and optional webhook forwarding to CSP_REPORT_URI
- Updated auth redirect chain: middleware now redirects to /?returnTo=/path; landing page bridges to /login?callbackUrl=/path

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename proxy.ts to middleware.ts with enhancements and create CSP report route** - `25a494a` (feat)
2. **Task 2: Update landing page to handle returnTo parameter** - `43f57f3` (feat)

## Files Created/Modified
- `src/middleware.ts` - Active Next.js middleware (created from proxy.ts with enhancements)
- `src/proxy.ts` - Deleted (was inactive; Next.js requires the file to be named middleware.ts)
- `src/lib/server/security-headers.ts` - Added fonts.gstatic.com, wss:, report-uri to CSP
- `src/app/api/csp-report/route.ts` - CSP violation report proxy with IP rate limiting
- `src/app/page.tsx` - Updated to handle returnTo param and route unauthenticated users to login

## Decisions Made
- Auth redirect flow changed from middleware → /login?callbackUrl to middleware → /?returnTo → /login?callbackUrl: this preserves the existing login page's callbackUrl handling while allowing the landing page to be the auth state router
- CSP report route added to CSRF exemption list: browsers automatically send violation reports without custom headers, so CSRF validation would block all reports
- Always use `NextResponse.next({ request: { headers: requestHeaders } })` since X-Request-ID is always added to requestHeaders — no conditional branching needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript error in `.next/dev/types/validator.ts` (auto-generated file referencing a missing exports page) — unrelated to this plan's changes; confirmed by filtering errors to source files only, which showed zero errors.

## User Setup Required
None - no external service configuration required. CSP_REPORT_URI is optional: if unset, the /api/csp-report endpoint silently accepts reports with 204 (no webhook forwarding).

## Next Phase Readiness
- Middleware is now active and all security headers (CSRF, CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Request-ID, Cache-Control) are applied on every page response
- AUTH-03 and AUTH-04 requirements are now fully satisfied
- Phase 15 plan 01 is the only plan — phase is complete after this

---
*Phase: 15-reactivate-nextjs-middleware*
*Completed: 2026-02-22*
