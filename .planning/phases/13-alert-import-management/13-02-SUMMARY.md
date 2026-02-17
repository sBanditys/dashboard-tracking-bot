---
phase: 13-alert-import-management
plan: 02
subsystem: ui
tags: [react-query, hooks, infinite-query, sse, streaming, admin-guard, sidebar]

# Dependency graph
requires:
  - phase: 13-01
    provides: Alert, Import, and EmailConfig TypeScript types (alert.ts, import.ts)
provides:
  - useAlertThresholds infinite query with ThresholdFilters and active_count
  - useActiveThresholdCount derived from first page of thresholds cache
  - useCreateThreshold, useDeleteThreshold, useToggleThreshold, useUpdateAlertSettings mutations
  - useBulkToggleThresholds, useBulkDeleteThresholds bulk operations
  - useEmailConfig, useUpdateEmailConfig, useAddRecipient, useRemoveRecipient, useResendVerification
  - useImportTemplate (blob download), useImportPreview (multipart POST), useConfirmImport (POST-SSE stream)
  - AdminForbidden 403 component for non-admin users
  - ManageNav pill sub-navigation for Alerts/Data sections
  - ManageLayout admin-gated layout checking ADMINISTRATOR permission bit 0x8
  - Sidebar Manage section (Alerts + Data) visible only to guild admins with threshold badge count
affects: [13-03, 13-04, 13-05, 13-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useInfiniteQuery with getNextPageParam for threshold pagination
    - POST-SSE streaming via fetch + ReadableStream reader (not EventSource)
    - Permission bit check pattern: (Number(guild.permissions) & 0x8) !== 0
    - useActiveThresholdCount derived from infinite query first page

key-files:
  created:
    - src/hooks/use-alerts.ts
    - src/hooks/use-email-alerts.ts
    - src/hooks/use-import.ts
    - src/app/(dashboard)/guilds/[guildId]/manage/layout.tsx
    - src/components/manage/admin-guard.tsx
    - src/components/manage/manage-nav.tsx
  modified:
    - src/components/layout/sidebar.tsx

key-decisions:
  - "useConfirmImport uses fetch + ReadableStream (not EventSource) because POST endpoints cannot use EventSource"
  - "useActiveThresholdCount is derived from the first page of useAlertThresholds query cache (no separate endpoint)"
  - "ManageLayout is a client component (not server) because it calls useUser() hook for permission check"
  - "No optimistic update for useToggleThreshold — waits for API confirmation before cache invalidation"

patterns-established:
  - "POST-SSE: fetch() + response.body.getReader() + TextDecoder for streaming SSE over POST"
  - "Admin guard: client component checks ADMINISTRATOR bit 0x8 from useUser().guilds permissions"
  - "Sidebar badge: useActiveThresholdCount reads from existing infinite query cache, no extra fetch"

requirements-completed: [ALERT-01, ALERT-04, IMPEX-01, IMPEX-02, IMPEX-03, IMPEX-04]

# Metrics
duration: 3min
completed: 2026-02-17
---

# Phase 13 Plan 02: Hooks, Admin Guard, and Manage Navigation Summary

**React Query hooks for alert thresholds (infinite scroll), email config, and import (POST-SSE streaming), with admin-gated manage section layout and conditional sidebar navigation**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-17T16:38:28Z
- **Completed:** 2026-02-17T16:41:41Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- 16 React Query hooks across 3 files covering alert thresholds, email config, and CSV import
- POST-SSE streaming implementation for import confirmation using fetch + ReadableStream (EventSource cannot POST)
- Admin-gated manage layout checking ADMINISTRATOR bit 0x8 from user's guild permissions
- Sidebar conditionally shows Manage section (Alerts, Data) with active threshold count badge

## Task Commits

Each task was committed atomically:

1. **Task 1: React Query hooks for alerts, email config, and imports** - `2f345b5` (feat)
2. **Task 2: Manage section routing, admin guard, and sidebar navigation** - `9ca612d` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `src/hooks/use-alerts.ts` - 8 hooks: useAlertThresholds (infinite), useActiveThresholdCount, create/delete/toggle/update/bulk mutations
- `src/hooks/use-email-alerts.ts` - 5 hooks: useEmailConfig, useUpdateEmailConfig, useAddRecipient, useRemoveRecipient, useResendVerification
- `src/hooks/use-import.ts` - 3 hooks: useImportTemplate (blob download), useImportPreview (multipart), useConfirmImport (POST-SSE)
- `src/app/(dashboard)/guilds/[guildId]/manage/layout.tsx` - Client layout with admin check, loading skeleton, ManageNav
- `src/components/manage/admin-guard.tsx` - AdminForbidden 403 component with guild and list links
- `src/components/manage/manage-nav.tsx` - ManageNav pill navigation for Alerts/Data with active state
- `src/components/layout/sidebar.tsx` - Added Manage section with admin check and active threshold badge

## Decisions Made

- `useConfirmImport` uses `fetch` + `ReadableStream` reader instead of `EventSource` because SSE confirm endpoint is POST (EventSource only supports GET)
- `useActiveThresholdCount` is derived from the first page of the existing `useAlertThresholds` infinite query — avoids a separate lightweight endpoint
- `ManageLayout` is a client component to access `useUser()` hook for server-side-impossible permission check
- No optimistic update for `useToggleThreshold` — waits for API confirmation per plan's locked decision

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All hooks are ready for Phase 13 UI pages (Plans 03-06) to import and use
- Manage section layout provides admin protection automatically for all child pages
- Sidebar Manage nav is live for admin users navigating guild pages

---
*Phase: 13-alert-import-management*
*Completed: 2026-02-17*
