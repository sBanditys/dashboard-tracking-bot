---
phase: 07
plan: 06
status: complete
started: 2026-02-07T15:57:10Z
completed: 2026-02-07T15:59:02Z
duration: 1m 52s
subsystem: data-management
tags: [selection, bulk-operations, export, integration, accounts, posts]

requires:
  - 07-03 (frontend hooks for bulk operations and exports)
  - 07-04 (selectable card wrappers and selection bar components)
  - 07-05 (export dropdown and reassign modal components)

provides:
  - Accounts page with checkbox selection, bulk delete/reassign/export
  - Posts page with checkbox selection, bulk delete/export
  - Export dropdown in filter bar on both pages
  - Type-to-confirm modals for destructive operations

affects:
  - 07-07 (trash management page)
  - 07-09 (final verification)

tech-stack:
  patterns:
    - Shift-click range selection via useShiftSelection hook
    - URL-to-ID mapping for post selection (postsWithId pattern)
    - Auto-dismissing toast pattern (8s timer with cleanup)
    - Bulk operation flow: SelectionBar -> Modal -> Mutation -> Toast

key-files:
  modified:
    - src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx
    - src/app/(dashboard)/guilds/[guildId]/posts/page.tsx

decisions:
  - id: DEV-074
    description: "Bulk export from SelectionBar sends selected IDs as CSV filter parameter (simple approach, no format picker)"
  - id: DEV-075
    description: "Posts mapped to postsWithId with id=url for useShiftSelection compatibility"

metrics:
  duration: 1m 52s
  completed: 2026-02-07
  tasks: 2/2

commits:
  - 2e09df8
  - 36f3a14
---

# Phase 7 Plan 6: Page Integration Summary

Wire selection, bulk operations, and export into Accounts and Posts pages.

**One-liner:** Accounts and Posts pages enhanced with shift-click selection, sticky bulk action bar, export dropdown, and type-to-confirm modals for delete/reassign

## What Was Done

### Task 1: Accounts Page Integration (2e09df8)
Enhanced the existing accounts page with full data management capabilities:
- Replaced `AccountCard` with `SelectableAccountCard` for checkbox-based selection
- Added `useShiftSelection` hook for shift-click range and single-click toggle selection
- Added `SelectionBar` (sticky bottom bar) with Delete, Export, and Reassign actions
- Added `ExportDropdown` in the filter bar for CSV/JSON/XLSX export (current view or all data)
- Added `TypeToConfirmModal` for bulk delete (type count to confirm, danger variant)
- Added `ReassignModal` for bulk reassign to different brand/group
- Added `BulkResultsToast` with auto-dismiss after 8 seconds
- Built `activeFiltersRecord` for passing current filter state to export
- All existing functionality preserved: filters, infinite scroll, add account modal, empty states

### Task 2: Posts Page Integration (36f3a14)
Same pattern as accounts with key differences:
- Posts use `url` as identifier, so created `postsWithId` mapping (`id: post.url`) for `useShiftSelection`
- No reassign action (reassign is accounts-only per domain rules)
- `SelectionBar` shows only Delete and Export buttons (no `onReassign` prop)
- Additional filter state for active filters record: status, dateRange (from/to)
- All existing functionality preserved: filters, infinite scroll, date range picker, empty states

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| DEV-074 | Bulk export from SelectionBar sends selected IDs as CSV filter parameter | Simple approach - no format picker needed from selection bar since ExportDropdown in filter bar handles full format selection |
| DEV-075 | Posts mapped with id=url for useShiftSelection compatibility | Hook requires items with `id` field; posts use `url` as unique identifier |

## Deviations from Plan

None - plan executed exactly as written.

## Task Commits

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Accounts page with selection and bulk operations | 2e09df8 | SelectableAccountCard, SelectionBar, ExportDropdown, modals |
| 2 | Posts page with selection and bulk operations | 36f3a14 | SelectablePostCard, postsWithId mapping, SelectionBar (no reassign) |

## Verification

- TypeScript: `npx tsc --noEmit` passes with zero errors after each task
- Both pages preserve all existing functionality (filters, infinite scroll, empty states)
- Accounts: checkboxes, shift-click, sticky bar with Delete/Export/Reassign
- Posts: checkboxes, shift-click, sticky bar with Delete/Export (no Reassign)
- ExportDropdown in filter bar on both pages
- Type-to-confirm modals for destructive operations

## Self-Check: PASSED
