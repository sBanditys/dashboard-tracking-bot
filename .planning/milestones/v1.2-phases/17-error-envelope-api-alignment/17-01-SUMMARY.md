---
phase: 17-error-envelope-api-alignment
plan: 01
subsystem: api
tags: [error-handling, csrf, typescript, proxy, fetch]

# Dependency graph
requires: []
provides:
  - Dual-envelope error parsing in error-sanitizer.ts (isNewEnvelope, extractBackendError)
  - Client-side error extraction helper (parseApiError in src/lib/api-error.ts)
  - Dual-code lookup for CSRF/unverified_email detection in fetchWithRetry (extractErrorCode)
  - CSRF cookie renamed from _csrf_token to csrf_token everywhere in src/
affects:
  - 17-02 (error display hooks — parseApiError available for use)
  - All API route handlers using sanitizeError
  - All mutation requests relying on CSRF cookie

# Tech tracking
tech-stack:
  added: []
  patterns:
    - isNewEnvelope type guard pattern for dual envelope detection
    - extractBackendError centralizes envelope normalization at sanitizer boundary
    - extractErrorCode centralizes envelope normalization at fetchWithRetry boundary
    - parseApiError reads .error field from proxy SanitizedError shape (not .message)

key-files:
  created:
    - src/lib/api-error.ts
  modified:
    - src/lib/server/error-sanitizer.ts
    - src/lib/fetch-with-retry.ts
    - src/proxy.ts
    - src/app/api/auth/refresh/route.ts

key-decisions:
  - "Hard switch on CSRF cookie rename from _csrf_token to csrf_token — no fallback to old name"
  - "parseApiError reads .error field (not .message) — proxy SanitizedError always outputs { error: string, code? }"
  - "Proxy continues to output old envelope shape { error: string, code? } to clients — only consumes new shape from backend"

patterns-established:
  - "isNewEnvelope type guard: typeof body === object && body !== null && error in body && typeof body.error === object && body.error !== null"
  - "extractBackendError: normalize either envelope shape to { code?, message? } before consuming"
  - "extractErrorCode: normalize either envelope shape to code string in fetchWithRetry"

requirements-completed:
  - ERR-01
  - ERR-02
  - ERR-03

# Metrics
duration: 2min 21s
completed: 2026-02-23
---

# Phase 17 Plan 01: Error Envelope & CSRF Cookie Alignment Summary

**Dual-envelope backend error parsing (old flat + new nested shapes), shared parseApiError client helper, and hard CSRF cookie rename from _csrf_token to csrf_token across all of src/**

## Performance

- **Duration:** 2 min 21s
- **Started:** 2026-02-22T23:13:21Z
- **Completed:** 2026-02-22T23:15:42Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added isNewEnvelope type guard and extractBackendError helper in error-sanitizer.ts — sanitizeError now handles both old `{ error: string, code? }` and new `{ error: { code, message } }` backend envelope shapes
- Created src/lib/api-error.ts with exported parseApiError for client-side hooks to extract error messages from proxy responses (reads .error field, strips HTML tags)
- Added extractErrorCode in fetch-with-retry.ts — EBADCSRFTOKEN and unverified_email detection now works from either envelope shape
- Hard-renamed CSRF cookie from _csrf_token to csrf_token in proxy.ts (setCsrfCookie, validation block, refreshTokensFromMiddleware) and auth/refresh/route.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Add dual-envelope parsing to error-sanitizer and create parseApiError helper** - `a6067a8` (feat)
2. **Task 2: Add dual-code lookup in fetchWithRetry and rename CSRF cookie everywhere** - `eab9814` (feat)

**Plan metadata:** (docs commit — see final_commit step)

## Files Created/Modified
- `src/lib/server/error-sanitizer.ts` - Added NewBackendErrorEnvelope interface, isNewEnvelope type guard, extractBackendError helper; updated sanitizeError to use extractBackendError
- `src/lib/api-error.ts` - New file: parseApiError client helper that reads .error from SanitizedError proxy responses, strips HTML tags
- `src/lib/fetch-with-retry.ts` - Added extractErrorCode helper; replaced body?.code === checks with extractErrorCode; renamed CSRF cookie from _csrf_token to csrf_token in getCsrfToken()
- `src/proxy.ts` - Renamed _csrf_token to csrf_token in setCsrfCookie(), CSRF validation block, and refreshTokensFromMiddleware()
- `src/app/api/auth/refresh/route.ts` - Renamed _csrf_token to csrf_token (auto-fix: cookie rename consistency)

## Decisions Made
- Hard switch on CSRF cookie rename — no dual-read fallback per user decision
- parseApiError reads .error field, not .message, because the proxy's SanitizedError shape uses { error: string, code? }
- Proxy output remains old envelope shape — it only consumes new shapes from backend, converts to old shape for clients

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed _csrf_token cookie read in auth/refresh/route.ts**
- **Found during:** Task 2 (CSRF cookie rename in proxy.ts and fetch-with-retry.ts)
- **Issue:** src/app/api/auth/refresh/route.ts was reading `_csrf_token` from the cookie store with a comment saying the proxy sets it as `_csrf_token`. Since the proxy was renamed to set `csrf_token`, this read would silently return undefined, breaking CSRF forwarding on token refreshes.
- **Fix:** Updated cookieStore.get('_csrf_token') to cookieStore.get('csrf_token') and corrected the comment
- **Files modified:** src/app/api/auth/refresh/route.ts
- **Verification:** grep -r '_csrf_token' src/ returns zero results; npx tsc --noEmit passes
- **Committed in:** eab9814 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — cookie rename consistency)
**Impact on plan:** Fix was essential for CSRF token forwarding during session refresh. No scope creep.

## Issues Encountered
None — all tasks completed cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dual-envelope error infrastructure is in place — plan 17-02 can safely update client hooks to use parseApiError
- All error codes (EBADCSRFTOKEN, unverified_email) detected from both envelope shapes
- CSRF cookie naming is consistent throughout src/ — no stale _csrf_token references remain

---
*Phase: 17-error-envelope-api-alignment*
*Completed: 2026-02-23*
