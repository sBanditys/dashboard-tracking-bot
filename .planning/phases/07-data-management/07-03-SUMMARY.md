---
phase: 07-data-management
plan: 03
subsystem: ui
tags: [react-query, sse, hooks, exports, bulk-operations, trash]

# Dependency graph
requires:
  - phase: 07-01
    provides: Export, bulk, and trash type definitions
  - phase: 07-02
    provides: API proxy routes for exports, bulk ops, and trash
provides:
  - React Query hooks for export operations with SSE progress tracking
  - Bulk operation hooks (delete, reassign) with cache invalidation
  - Trash management hooks (list, restore, permanent delete)
affects: [07-04, 07-05, 07-06 - UI components will consume these hooks]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Native EventSource for SSE progress tracking (useExportProgress)
    - Dynamic refetchInterval based on query state (useExportStatus)
    - Comprehensive cache invalidation across related data types

key-files:
  created:
    - src/hooks/use-exports.ts
    - src/hooks/use-bulk-operations.ts
    - src/hooks/use-trash.ts
  modified: []

key-decisions:
  - "DEV-027 reuse: Native EventSource pattern for export progress (consistent with status stream)"
  - "Dynamic polling: 2s refetch interval while export active, stops when complete/failed"
  - "Granular cache invalidation: Mutations invalidate specific data types + guild details + parent queries"

patterns-established:
  - "SSE progress hook pattern: useState for progress fields, EventSource lifecycle in useEffect"
  - "Mutation cache invalidation: Always invalidate both specific query and parent guild query"
  - "Query parameter handling: Optional type filters with URLSearchParams builder"

# Metrics
duration: 1m 29s
completed: 2026-02-07
---

# Phase 7 Plan 3: Frontend Hooks Summary

**React Query hooks for exports, bulk operations, and trash with SSE-based progress tracking and comprehensive cache invalidation**

## Performance

- **Duration:** 1m 29s
- **Started:** 2026-02-07T15:48:01Z
- **Completed:** 2026-02-07T15:49:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Export hooks with native EventSource SSE progress tracking (useExportProgress)
- Dynamic polling for export status (2s while active, stops when complete)
- Bulk operation hooks with multi-query cache invalidation (accounts, posts, brands, guild)
- Trash management with restore and permanent delete mutations

## Task Commits

Each task was committed atomically:

1. **Task 1: Export hooks (create, history, progress)** - `3416d05` (feat)
2. **Task 2: Bulk operation and trash hooks** - `bfbab6c` (feat)

## Files Created/Modified

- `src/hooks/use-exports.ts` - Four hooks: create export mutation, paginated history query, polling status query, SSE progress hook
- `src/hooks/use-bulk-operations.ts` - Bulk delete and reassign mutations with comprehensive cache invalidation
- `src/hooks/use-trash.ts` - Trash listing query, restore mutation, permanent delete mutation

## Decisions Made

**DEV-027 pattern reuse:** Used native EventSource for export progress (consistent with existing useSSE pattern for status stream)

**Dynamic refetchInterval:** useExportStatus polls every 2s while export is 'pending' or 'processing', automatically stops when 'completed' or 'failed' to avoid unnecessary requests

**Granular cache invalidation:** Each mutation invalidates all related queries - bulk delete invalidates accounts/posts + guild, reassign invalidates accounts + brands + guild, trash operations invalidate trash + restored data type + guild

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Frontend hooks complete and ready for UI integration:
- Export dialog can use useCreateExport + useExportProgress for real-time feedback
- Bulk action toolbar can use useBulkDelete + useBulkReassign
- Trash page can use useTrashItems + useRestoreItem + usePermanentDelete

All hooks follow established React Query patterns with proper TypeScript types, cache invalidation, and error handling.

---
*Phase: 07-data-management*
*Completed: 2026-02-07*

## Self-Check: PASSED

All files created:
- src/hooks/use-exports.ts ✓
- src/hooks/use-bulk-operations.ts ✓
- src/hooks/use-trash.ts ✓

All commits verified:
- 3416d05 ✓
- bfbab6c ✓
