---
phase: 24-tech-debt-shared-utilities
plan: 01
subsystem: api
tags: [error-handling, security, open-redirect, error-envelope]

# Dependency graph
requires:
  - phase: 17-error-envelope-api-alignment
    provides: Stripe-inspired error envelope format
provides:
  - Cleaned error extraction functions without legacy flat envelope fallbacks
  - Secure callbackUrl redirect validation in auth callback
affects: [error-handling, auth-callback]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Error envelope extraction uses only { error: { code, message } } shape"
    - "callbackUrl validation: must start with '/' and not '//'"

key-files:
  created: []
  modified:
    - src/lib/fetch-with-retry.ts
    - src/lib/server/error-sanitizer.ts
    - src/app/auth/callback/page.tsx

key-decisions:
  - "Inlined isNewEnvelope type guard into extractBackendError for clarity"
  - "Removed NewBackendErrorEnvelope interface (only used internally by type guard)"
  - "Silent redirect to / on invalid callbackUrl (no toast or error)"

patterns-established:
  - "Error envelope parsing: single code path for { error: { code, message } } shape only"

requirements-completed: [DEBT-01, DEBT-02]

# Metrics
duration: 2min
completed: 2026-03-09
---

# Phase 24 Plan 01: Error Envelope Cleanup & Auth Redirect Fix Summary

**Removed legacy flat error envelope fallbacks from fetch-with-retry and error-sanitizer, and closed callbackUrl open redirect vulnerability**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T16:01:34Z
- **Completed:** 2026-03-09T16:03:07Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Removed old flat error envelope support (b.code fallback, BackendError interface, isNewEnvelope type guard)
- Simplified extractErrorCode and extractBackendError to handle only the Stripe-inspired envelope shape
- Fixed open redirect vulnerability in auth callback by validating callbackUrl starts with '/' and not '//'
- Removed all TODO(v1.3) comments from affected files

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove old error envelope paths** - `8a20cdb` (refactor)
2. **Task 2: Fix callbackUrl open redirect** - `b85eae2` (fix)

## Files Created/Modified
- `src/lib/fetch-with-retry.ts` - Cleaned extractErrorCode to only handle { error: { code } } shape
- `src/lib/server/error-sanitizer.ts` - Removed BackendError interface, old flat fallback, TODO comments; inlined type guard
- `src/app/auth/callback/page.tsx` - Added callbackUrl validation with startsWith('/') and !startsWith('//')

## Decisions Made
- Inlined isNewEnvelope type guard into extractBackendError (only used once, clearer inline)
- Removed NewBackendErrorEnvelope interface along with the type guard (not needed when logic is inline)
- Silent redirect to / on invalid callbackUrl per user decision (no toast)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Error handling stack is clean and simplified for future work
- Auth callback is secure against open redirect attacks
- Ready for next plan in phase 24

---
*Phase: 24-tech-debt-shared-utilities*
*Completed: 2026-03-09*
