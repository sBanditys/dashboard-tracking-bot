---
phase: 13-alert-import-management
plan: "06"
subsystem: ui
tags: [react, nextjs, tanstack-query, sse, export, csv, xlsx, json, lucide, date-fns]

requires:
  - phase: 13-01
    provides: Export types (ExportDataType, ExportFormat, ExportRecord, ExportHistoryResponse), use-exports hooks (useCreateExport, useExportHistory, useExportProgress)
  - phase: 13-05
    provides: Data management page shell with Import/Export tab navigation

provides:
  - ExportTypeSelector: 5 radio cards (accounts/posts/metrics/analytics/audit) with icons, descriptions, keyboard accessibility
  - ExportHistoryList: paginated history (20/page) with type badge, format badge, status badge, row count, expiry display, re-download link
  - ExportTab: complete export flow with format dropdown, context-aware filters, quota display, SSE progress bar with cancel, GDPR separate section
  - Data page export tab: replaced placeholder with fully functional ExportTab component

affects: [future data pages, export workflow, GDPR compliance features]

tech-stack:
  added: []
  patterns:
    - "Radio card grid with role=radiogroup + role=radio for accessible type selection"
    - "Context-aware filter display via getVisibleFilters() lookup per export type"
    - "Client-side SSE cancel via EventSource.close() stored in useRef"
    - "Quota estimation from useExportHistory response (today's export count vs daily limit)"
    - "ExportProgressState discriminated union (idle/in_progress/cancelled/complete/error)"

key-files:
  created:
    - src/components/import-export/export-type-selector.tsx
    - src/components/import-export/export-history-list.tsx
    - src/components/import-export/export-tab.tsx
  modified:
    - src/app/(dashboard)/guilds/[guildId]/manage/data/page.tsx

key-decisions:
  - "Client-side SSE cancel: EventSource.close() stored in ref; backend export continues but user stops waiting; completed export appears in history"
  - "Context-aware filters: accounts=brand+group+platform, posts=brand+platform, metrics/analytics=platform only, audit/gdpr=none"
  - "Quota estimated from today's export count in useExportHistory response (no separate quota endpoint needed)"
  - "ExportProgressSection is a sub-component consuming useExportProgress internally to avoid re-rendering parent on every SSE tick"

patterns-established:
  - "ExportProgressState: discriminated union for idle/in_progress/cancelled/complete/error phases"
  - "Separate EventSource management in parent component ref for cancel support"

requirements-completed: [IMPEX-01]

duration: 2m 42s
completed: 2026-02-17
---

# Phase 13 Plan 06: Export Tab UI Summary

**Export tab with radio card type selection, context-aware filters, SSE progress bar with client-side cancel, GDPR section, and paginated export history**

## Performance

- **Duration:** 2m 42s
- **Started:** 2026-02-17T16:50:25Z
- **Completed:** 2026-02-17T16:53:07Z
- **Tasks:** 2
- **Files modified:** 4 (3 created, 1 updated)

## Accomplishments
- ExportTypeSelector with 5 radio cards (accounts/posts/metrics/analytics/audit), lucide icons, descriptions, keyboard accessibility (role=radiogroup/radio), selected state highlighting
- ExportHistoryList with paginated entries (20/page), type/format/status colored badges, expiry display via formatDistanceToNow, re-download link for completed non-expired exports
- ExportTab orchestrating full export flow: type selector, format dropdown, context-aware filter dropdowns (brand/group/platform shown only for relevant export types), quota display, export button, SSE progress bar with cancel/error states, GDPR section with separate quota and privacy messaging
- Data page placeholder replaced with fully functional ExportTab component

## Task Commits

1. **Task 1: Create export type selector and export history list components** - `26eb9ea` (feat)
2. **Task 2: Build export tab with filters, preview, progress, quota, and GDPR section** - `ca3f3ab` (feat)

## Files Created/Modified
- `src/components/import-export/export-type-selector.tsx` - Radio card grid for 5 export types with icons, descriptions, keyboard accessibility
- `src/components/import-export/export-history-list.tsx` - Paginated export history with type/format/status badges, expiry, and re-download links
- `src/components/import-export/export-tab.tsx` - Complete export orchestration: type selector, format, filters, quota, SSE progress, GDPR section, history
- `src/app/(dashboard)/guilds/[guildId]/manage/data/page.tsx` - Replaced export placeholder with `<ExportTab guildId={guildId} />`

## Decisions Made
- Client-side cancel via `EventSource.close()`: backend export continues in background, completed export appears in history. No backend cancel endpoint needed.
- Context-aware filters implemented via `getVisibleFilters()` switch: accounts gets all 3 filters, posts gets brand+platform, metrics/analytics get platform only, audit/gdpr get no filters.
- Quota estimated from today's count in `useExportHistory` response rather than adding a separate API endpoint.
- `ProgressSection` is a standalone sub-component that calls `useExportProgress` internally so SSE ticks don't re-render the parent form.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Export tab fully functional. Phase 13 (Alert & Import Management) complete — all 3 active plans (13-01 data layer, 13-05 import UI, 13-06 export UI) delivered. Ready for any follow-up phases.

---
*Phase: 13-alert-import-management*
*Completed: 2026-02-17*

## Self-Check: PASSED

- FOUND: src/components/import-export/export-type-selector.tsx
- FOUND: src/components/import-export/export-history-list.tsx
- FOUND: src/components/import-export/export-tab.tsx
- FOUND commit: 26eb9ea (Task 1)
- FOUND commit: ca3f3ab (Task 2)
