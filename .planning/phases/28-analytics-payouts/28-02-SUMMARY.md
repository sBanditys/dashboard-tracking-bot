---
phase: 28-analytics-payouts
plan: 02
subsystem: ui
tags: [react, tanstack-query, next.js, tailwind, checkbox, pagination]

# Dependency graph
requires:
  - phase: 28-01
    provides: ConfirmationModal with description/confirmClassName/loadingLabel props, analytics tab infrastructure, tab bar, search input with debounce
provides:
  - PayoutsTab with checkbox selection (up to 50), status filter, single/bulk mark-paid confirmation dialogs, offset pagination
  - HistoryTab with DataTable audit trail and offset pagination
  - Bug fix: useBulkMarkPaid now sends userIds (not discordUserIds) to match backend schema
affects: [29-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Set<string> for checkbox multi-selection with MAX_SELECTION cap
    - Client-side status filtering on top of server offset pagination
    - useEffect watching prop to reset page/selection on search filter changes

key-files:
  created:
    - src/components/campaigns/payouts-tab.tsx
    - src/components/campaigns/history-tab.tsx
  modified:
    - src/hooks/use-campaigns.ts
    - src/app/(dashboard)/guilds/[guildId]/campaigns/[campaignId]/page.tsx

key-decisions:
  - "PayoutsTab uses custom table (not DataTable) because DataTable does not support checkbox columns"
  - "useBulkMarkPaid fixed to send { userIds } not { discordUserIds } to match bulkMarkPaidBodySchema"
  - "Status filter (All/Unpaid/Paid) defaults to Unpaid per CONTEXT decision, filters client-side on current page"

patterns-established:
  - "Pagination reset pattern: useEffect watching userId prop resets page to 0/1 and clears selection"
  - "Checkbox selection: selected Set cleared on page change and status filter change via separate useEffect"
  - "Offset pagination display: 0-indexed payouts shows page+1, 1-indexed history shows page as-is"

requirements-completed: [PAY-01, PAY-02, PAY-03, PAY-04, PAY-05]

# Metrics
duration: 2min
completed: 2026-03-10
---

# Phase 28 Plan 02: Payouts Tab and History Tab Summary

**PayoutsTab with checkbox selection, status filter, single/bulk mark-paid dialogs plus HistoryTab audit trail — payout management complete**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-10T15:17:08Z
- **Completed:** 2026-03-10T15:19:12Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created PayoutsTab (350+ lines) with checkbox multi-select (50 max), status filter defaulting to Unpaid, single/bulk mark-paid confirmation dialogs, and offset pagination
- Created HistoryTab with DataTable showing date/admin/participant/amount columns and offset pagination
- Fixed useBulkMarkPaid to send `{ userIds }` instead of `{ discordUserIds }` to match backend `bulkMarkPaidBodySchema`
- Wired both tabs into campaign detail page replacing "coming soon" placeholders

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix bulk endpoint field name and create PayoutsTab and HistoryTab** - `47bd091` (feat)
2. **Task 2: Wire PayoutsTab and HistoryTab into campaign detail page** - `3193922` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/components/campaigns/payouts-tab.tsx` - Full payout management UI with checkboxes, status filter, mark-paid actions, offset pagination
- `src/components/campaigns/history-tab.tsx` - Audit trail table using DataTable with offset pagination
- `src/hooks/use-campaigns.ts` - Fixed useBulkMarkPaid to send correct `userIds` field name
- `src/app/(dashboard)/guilds/[guildId]/campaigns/[campaignId]/page.tsx` - Replaced placeholder tab content with real components

## Decisions Made
- PayoutsTab uses a custom table layout (not DataTable component) because DataTable doesn't support checkbox columns in its current API
- Status filter operates client-side on the current page's data — not a separate backend query — as specified in plan Pattern 4
- Checkbox selection clears on page change and status filter change via separate `useEffect` to avoid stale selections

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Payout management fully complete: admins can view, filter, and mark participants as paid individually or in bulk
- History tab provides full audit trail for all payout operations
- Phase 29 (export) can proceed — all campaign tabs now functional

---
*Phase: 28-analytics-payouts*
*Completed: 2026-03-10*
