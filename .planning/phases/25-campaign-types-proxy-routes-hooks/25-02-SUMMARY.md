---
phase: 25-campaign-types-proxy-routes-hooks
plan: 02
subsystem: ui
tags: [react-query, hooks, campaigns, infinite-scroll, optimistic-updates]

# Dependency graph
requires:
  - phase: 25-01
    provides: campaign types, proxy routes, ConflictError class
provides:
  - campaignKeys query key factory for narrow cache invalidation
  - 6 read hooks (campaigns list, detail, analytics, payouts, history, export status)
  - 6 mutation hooks (create, update, delete, mark-paid, bulk-mark-paid, trigger-export)
affects: [26-campaign-list-page, 27-campaign-detail-page, 28-campaign-payouts, 29-campaign-export]

# Tech tracking
tech-stack:
  added: []
  patterns: [campaign query key factory, mixed cursor/offset pagination hooks, ConflictError handling in mutations]

key-files:
  created: [src/hooks/use-campaigns.ts]
  modified: []

key-decisions:
  - "Optimistic updates only for single mark-paid (not bulk) per user decision"
  - "ConflictError on 409 not toasted -- consuming component handles via instanceof check"
  - "Payouts page 0-indexed, history page 1-indexed to match respective backend schemas"

patterns-established:
  - "campaignKeys factory: all keys under ['guild', guildId, 'campaigns'] for narrow invalidation"
  - "Audit log invalidation on state-changing mutations (create, delete, markPaid, bulkMarkPaid)"

requirements-completed: [CAMP-01, CAMP-02, CAMP-03, CAMP-04, CAMP-05, CAMP-06, CAMP-07, CAMP-08, CAMP-09, ANAL-01, ANAL-02, PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, EXP-01, EXP-02]

# Metrics
duration: 2min
completed: 2026-03-09
---

# Phase 25 Plan 02: Campaign Hooks Summary

**12 React Query hooks with campaignKeys factory providing complete data layer for campaign UI phases**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T17:40:12Z
- **Completed:** 2026-03-09T17:42:12Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created campaignKeys factory with hierarchical query keys scoped to prevent bonus/tracking cache contamination
- Built 6 read hooks: cursor-based infinite scroll for campaigns/analytics, offset pagination for payouts/history, polling for export status
- Built 6 mutation hooks: CRUD + optimistic mark-paid + bulk payments + export trigger, all with proper error handling and cache invalidation
- ConflictError (409) handling on update lets UI components show merge conflict resolution

## Task Commits

Each task was committed atomically:

1. **Task 1: Create campaign hooks file with query key factory and all 12 hooks** - `65ed270` (feat)

## Files Created/Modified
- `src/hooks/use-campaigns.ts` - Complete campaign data layer with 12 hooks and query key factory (495 lines)

## Decisions Made
- Optimistic updates only for single mark-paid, not bulk (per user decision -- bulk is too complex)
- ConflictError on 409 is not toasted by the hook -- consuming component handles it via `instanceof ConflictError`
- Payouts use 0-indexed pages, history uses 1-indexed pages to match their respective backend schemas

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 12 hooks ready for consumption by campaign UI phases (26-29)
- Query key factory enables narrow invalidation without cross-contaminating bonus/tracking caches

---
*Phase: 25-campaign-types-proxy-routes-hooks*
*Completed: 2026-03-09*
