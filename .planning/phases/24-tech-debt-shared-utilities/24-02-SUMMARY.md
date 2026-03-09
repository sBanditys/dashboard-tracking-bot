---
phase: 24-tech-debt-shared-utilities
plan: 02
subsystem: ui
tags: [dead-code, connection-banner, format-utility, shared-lib]

# Dependency graph
requires:
  - phase: 12-bonus-round-system
    provides: centsToDisplay function in use-bonus.ts
provides:
  - Shared centsToDisplay utility in src/lib/format.ts
  - ConnectionIssuesBanner wired to posts page
  - Dead code (validators.ts) removed
affects: [25-campaign-list, 26-campaign-detail, 27-campaign-forms, 28-campaign-payout]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared-format-utility]

key-files:
  created:
    - src/lib/format.ts
  modified:
    - src/app/(dashboard)/guilds/[guildId]/posts/page.tsx
    - src/hooks/use-bonus.ts
    - src/components/bonus/round-card.tsx
    - src/components/bonus/create-round-modal.tsx
    - src/components/bonus/payments-tab.tsx
    - src/components/bonus/results-tab.tsx
    - src/components/bonus/leaderboard-tab.tsx

key-decisions:
  - "No re-export from use-bonus.ts -- clean break, all consumers import from @/lib/format directly"

patterns-established:
  - "Shared formatting utilities live in src/lib/format.ts"

requirements-completed: [DEBT-03, DEBT-04]

# Metrics
duration: 2min
completed: 2026-03-09
---

# Phase 24 Plan 02: Dead Code Removal & Shared Utilities Summary

**Deleted unused validators.ts, wired ConnectionIssuesBanner to posts page, and extracted centsToDisplay to shared src/lib/format.ts**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T16:01:49Z
- **Completed:** 2026-03-09T16:03:36Z
- **Tasks:** 2
- **Files modified:** 9 (1 deleted, 1 created, 7 modified)

## Accomplishments
- Removed dead code: validators.ts with 6 unused exports deleted (DEBT-04)
- Wired ConnectionIssuesBanner to posts page matching accounts page pattern (DEBT-03)
- Extracted centsToDisplay to shared src/lib/format.ts, all 5 bonus components updated

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete validators.ts and wire ConnectionIssuesBanner** - `8a20cdb` (chore)
2. **Task 2: Extract centsToDisplay to shared format.ts** - `75d442c` (refactor)

## Files Created/Modified
- `src/lib/validators.ts` - Deleted (zero imports, dead code)
- `src/lib/format.ts` - Created shared centsToDisplay utility
- `src/app/(dashboard)/guilds/[guildId]/posts/page.tsx` - Added ConnectionIssuesBanner import and render
- `src/hooks/use-bonus.ts` - Removed centsToDisplay function definition
- `src/components/bonus/round-card.tsx` - Import centsToDisplay from @/lib/format
- `src/components/bonus/create-round-modal.tsx` - Import centsToDisplay from @/lib/format
- `src/components/bonus/payments-tab.tsx` - Import centsToDisplay from @/lib/format
- `src/components/bonus/results-tab.tsx` - Import centsToDisplay from @/lib/format
- `src/components/bonus/leaderboard-tab.tsx` - Import centsToDisplay from @/lib/format

## Decisions Made
- No re-export from use-bonus.ts -- per user decision, clean break with no indirection layer

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- src/lib/format.ts is ready for campaign phases (25-28) to import centsToDisplay
- Posts page now shows degraded connection state like accounts page
- Clean codebase with no dead validation code

---
*Phase: 24-tech-debt-shared-utilities*
*Completed: 2026-03-09*
