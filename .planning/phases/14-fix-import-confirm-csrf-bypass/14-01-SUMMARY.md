---
phase: 14-fix-import-confirm-csrf-bypass
plan: 01
subsystem: auth
tags: [csrf, fetch, security, import, sse]

# Dependency graph
requires:
  - phase: 10-fix-csrf-protection
    provides: fetchWithRetry with CSRF token injection and silent retry on EBADCSRFTOKEN
  - phase: 13-alerts-and-imports
    provides: useConfirmImport hook with POST-SSE streaming pattern
provides:
  - CSRF-protected import confirm mutation via fetchWithRetry in use-import.ts
affects: [auth, import-confirm, csrf-protection]

# Tech tracking
tech-stack:
  added: []
  patterns: [All mutation hooks use fetchWithRetry instead of raw fetch()]

key-files:
  created: []
  modified:
    - src/hooks/use-import.ts

key-decisions:
  - "Single-line fix: replace raw fetch() with fetchWithRetry() in useConfirmImport; no other changes needed since fetchWithRetry returns standard Response and credentials: include passes through"

patterns-established:
  - "All mutation fetch calls in dashboard hooks must use fetchWithRetry (not raw fetch) to ensure CSRF header injection"

requirements-completed: [AUTH-03, IMPEX-04]

# Metrics
duration: 1min
completed: 2026-02-22
---

# Phase 14 Plan 01: Fix Import Confirm CSRF Bypass Summary

**CSRF bypass gap closed in useConfirmImport by replacing raw fetch() with fetchWithRetry(), ensuring X-CSRF-Token header injection on all import confirm POST requests**

## Performance

- **Duration:** 41 seconds
- **Started:** 2026-02-22T02:16:28Z
- **Completed:** 2026-02-22T02:17:09Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced raw `fetch()` with `fetchWithRetry()` on line 95 of `src/hooks/use-import.ts` in `useConfirmImport`
- All three mutation functions in `use-import.ts` now consistently use `fetchWithRetry` (template download, import preview, import confirm)
- Import confirm POST will now include `X-CSRF-Token` header automatically via fetchWithRetry CSRF injection
- SSE streaming logic (response.body.getReader) remains fully intact — fetchWithRetry returns standard Response

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace raw fetch() with fetchWithRetry() in useConfirmImport** - `e98b97c` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/hooks/use-import.ts` - Replaced `await fetch(` with `await fetchWithRetry(` in `useConfirmImport` function (line 95); no other changes

## Decisions Made
None - followed plan as specified. Single-line change confirmed correct: fetchWithRetry returns standard Response, credentials: 'include' passes through to underlying fetch, SSE streaming via response.body.getReader() works identically.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
TypeScript compiler reported a pre-existing error in `.next/dev/types/validator.ts` (missing exports page module) — this is an unrelated build artifact issue, not caused by this change. All source files in `src/` compile without errors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AUTH-03 CSRF gap for import confirm endpoint is now closed
- All mutation hooks in the dashboard now consistently use fetchWithRetry
- Phase 14 is complete (single plan)

## Self-Check: PASSED
- FOUND: src/hooks/use-import.ts
- FOUND: commit e98b97c

---
*Phase: 14-fix-import-confirm-csrf-bypass*
*Completed: 2026-02-22*
