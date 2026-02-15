---
phase: 07-data-management
plan: 02
subsystem: api
tags: [nextjs, api-routes, proxy, exports, bulk-operations, trash]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: API proxy pattern with auth token forwarding
  - phase: 04-real-time-updates
    provides: SSE proxy pattern for streaming
provides:
  - Export API proxy routes (POST create, GET history/status, GET SSE progress)
  - Bulk operation proxy routes (POST delete, POST reassign)
  - Trash management proxy routes (GET list, POST restore, DELETE permanent)
affects: [07-03-frontend-hooks, 07-04-export-ui, 07-05-bulk-ui, 07-06-trash-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - API gateway pattern for exports (POST create returns export record with id/status/downloadUrl)
    - SSE streaming for export progress monitoring
    - Status code forwarding including 207 Multi-Status for partial failures

key-files:
  created:
    - src/app/api/guilds/[guildId]/exports/route.ts
    - src/app/api/guilds/[guildId]/exports/[exportId]/route.ts
    - src/app/api/guilds/[guildId]/exports/[exportId]/progress/route.ts
    - src/app/api/guilds/[guildId]/bulk/delete/route.ts
    - src/app/api/guilds/[guildId]/bulk/reassign/route.ts
    - src/app/api/guilds/[guildId]/trash/route.ts
    - src/app/api/guilds/[guildId]/trash/[itemId]/route.ts
  modified: []

key-decisions:
  - "SSE proxy pattern for export progress streaming (reused from status/stream)"
  - "Status code forwarding for 207 Multi-Status responses on partial bulk operation failures"

patterns-established:
  - "Export routes follow POST create → GET status → GET SSE progress flow"
  - "Trash routes distinguish restore (POST) vs permanent delete (DELETE)"

# Metrics
duration: 1m 29s
completed: 2026-02-07
---

# Phase 07 Plan 02: API Proxy Routes Summary

**Seven Next.js API proxy routes for exports (create/history/status/progress), bulk operations (delete/reassign), and trash management (list/restore/permanent-delete) with SSE streaming**

## Performance

- **Duration:** 1 min 29 sec
- **Started:** 2026-02-07T15:37:29Z
- **Completed:** 2026-02-07T15:38:58Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Export workflow complete: POST create export, GET history, GET single status, GET SSE progress stream
- Bulk operations ready: POST soft-delete for accounts/posts, POST reassign accounts to different brands/groups
- Trash management operational: GET list trashed items, POST restore, DELETE permanent delete
- All routes follow established auth+proxy pattern with token extraction and header forwarding
- SSE progress route uses text/event-stream response body proxy for real-time export updates

## Task Commits

Each task was committed atomically:

1. **Task 1: Export API proxy routes** - `0ebf80f` (feat)
2. **Task 2: Bulk operation and trash API proxy routes** - `b56e7f7` (feat)

**Plan metadata:** (pending - will be added after SUMMARY creation)

## Files Created/Modified

**Export Routes:**
- `src/app/api/guilds/[guildId]/exports/route.ts` - POST create export with JSON body (format, mode, dataType, filters, filename), GET export history with pagination
- `src/app/api/guilds/[guildId]/exports/[exportId]/route.ts` - GET single export record with status and downloadUrl
- `src/app/api/guilds/[guildId]/exports/[exportId]/progress/route.ts` - GET SSE stream for real-time export progress (proxies text/event-stream)

**Bulk Operation Routes:**
- `src/app/api/guilds/[guildId]/bulk/delete/route.ts` - POST soft-delete with JSON body (ids, dataType), forwards 200/207 status codes
- `src/app/api/guilds/[guildId]/bulk/reassign/route.ts` - POST reassign accounts with JSON body (ids, dataType, targetBrandId, targetGroupId)

**Trash Management Routes:**
- `src/app/api/guilds/[guildId]/trash/route.ts` - GET list soft-deleted items with query params (type, page, limit)
- `src/app/api/guilds/[guildId]/trash/[itemId]/route.ts` - POST restore clears deletedAt, DELETE permanently removes item with dataType query param

## Decisions Made

**DEV-061: SSE proxy pattern reuse for export progress**
- Reused the SSE proxying pattern from status/stream route (text/event-stream headers, response.body forwarding)
- Rationale: Consistent streaming implementation, proven pattern for real-time updates

**DEV-062: Status code forwarding for bulk operations**
- Bulk operations forward exact status codes from backend (200 for all success, 207 Multi-Status for partial failures)
- Rationale: Frontend needs to distinguish complete vs partial success for user feedback

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all routes compiled on first attempt with no type errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 07-03 (Frontend Hooks):**
- All 7 API proxy routes operational and type-safe
- Export workflow endpoints established (create, history, status, progress stream)
- Bulk operations ready for React Query mutation hooks
- Trash management ready for list/restore/delete hooks

**Backend endpoints required:**
- Backend API does NOT yet implement these endpoints (07-07 backend wave will create them)
- Frontend hooks in 07-03 can be developed against API contract but will return 404 until backend implements

**No blockers** - frontend development can proceed with hook/UI layers while backend endpoints are created in parallel.

## Self-Check: PASSED

All files verified:
- 7/7 created files exist
- 2/2 commits verified (0ebf80f, b56e7f7)

---
*Phase: 07-data-management*
*Completed: 2026-02-07*
