---
phase: 13-alert-import-management
plan: 05
subsystem: import-ui
tags: [import, csv, drag-drop, sse, progress, validation, ui]
dependency_graph:
  requires: ["13-02"]
  provides: ["import-ui", "data-page"]
  affects: ["guilds/[guildId]/manage/data"]
tech_stack:
  added: []
  patterns: ["state-machine-ui", "post-sse-streaming", "aria-live-announcements", "all-or-nothing-validation"]
key_files:
  created:
    - src/components/import-export/upload-zone.tsx
    - src/components/import-export/import-validation-display.tsx
    - src/components/import-export/import-tab.tsx
    - src/components/import-export/import-history.tsx
    - src/app/(dashboard)/guilds/[guildId]/manage/data/page.tsx
  modified: []
decisions:
  - "ImportTab uses 8-state flow machine (upload/validating/preview/confirm/importing/complete/error/locked) matching plan spec"
  - "409 conflict detected via error message string matching (includes 409/in progress/conflict) since error is thrown from fetch"
  - "ImportHistory renders stub when no entries (backend import history endpoint not yet available)"
  - "Data page uses local useState for tab switching (not URL search params) per plan preference"
metrics:
  duration: "2m 59s"
  completed_date: "2026-02-17"
  tasks_completed: 2
  files_created: 5
  files_modified: 0
---

# Phase 13 Plan 05: Data Page Shell and Import Tab UI Summary

**One-liner:** Drag-and-drop CSV import UI with 8-state flow machine, all-or-nothing validation, POST-SSE progress bar, ARIA live announcements, and Import/Export tab shell at `/guilds/[guildId]/manage/data`.

## What Was Built

### Task 1: Upload Zone and Validation Display

**`src/components/import-export/upload-zone.tsx`**
- Native HTML drag events (`onDragOver`/`onDragLeave`/`onDrop`) — no external library
- Three visual states: default (dashed border), drag hover (accent-purple), error (red-500)
- Client pre-checks: file type (.csv/text/csv), 1MB size limit (1024 * 1024), CSV structure (first line must have 2+ comma-separated values)
- Mobile support: `pointer-coarse:hidden` hides drag-and-drop text, shows "Tap to upload" button
- Keyboard accessible: focusable drop zone with Enter/Space activation, visible "Browse file" button
- Limits display: "500 rows max, 1MB file size limit" below drop zone

**`src/components/import-export/import-validation-display.tsx`**
- All-or-nothing validation: if any rows invalid, import button is absent
- Valid path: green success indicator + sample 5-row preview table (username/platform/brand/group)
- Invalid path: red error indicator + scrollable error table (row/column/message/value) with `bg-red-500/5`
- "Upload corrected file" button calls `onCancel` to go back to upload zone
- Error rows rendered with `role="alert"` for screen readers

### Task 2: Import Tab, Import History, Data Page

**`src/components/import-export/import-tab.tsx`**
- 8-state machine: `upload | validating | preview | confirm | importing | complete | error | locked`
- `upload`: UploadZone + "Download CSV template" button
- `validating`: spinner + "Validating CSV..." while `useImportPreview` in flight
- `preview`: `ImportValidationDisplay` with confirm/cancel wired to state transitions
- `confirm`: `ImportValidationDisplay` + `ConfirmationModal` dialog (locked decision: extra confirmation)
- `importing`: `role="progressbar"` with `aria-valuenow` + `aria-live="polite"` region for milestone announcements at 25/50/75/100%
- `complete`: success summary with imported/failed counts + link to `/guilds/${guildId}/accounts`
- `error`: red progress bar (100% width red-500) + error message + "Try again" button
- `locked` (409): yellow warning, disabled `UploadZone`, "Check status" button to retry

**`src/components/import-export/import-history.tsx`**
- Stub when no entries: "Import history will appear here"
- Loading skeleton: 3-row pulse animation
- Entry table: date/filename/rows/status badge (green completed, yellow partial, red failed)/created-by
- Pagination: 20 per page, prev/next buttons, page indicator

**`src/app/(dashboard)/guilds/[guildId]/manage/data/page.tsx`**
- Page header: "Data Management" with subtitle
- Segmented tab buttons: `bg-accent-purple text-white` for active, `transition-all duration-200`
- Import tab: renders `<ImportTab guildId={guildId} />`
- Export tab: placeholder "Export tab coming soon" (Plan 06)
- Admin gating handled by parent `ManageLayout`

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

Files created:
- `src/components/import-export/upload-zone.tsx`: FOUND
- `src/components/import-export/import-validation-display.tsx`: FOUND
- `src/components/import-export/import-tab.tsx`: FOUND
- `src/components/import-export/import-history.tsx`: FOUND
- `src/app/(dashboard)/guilds/[guildId]/manage/data/page.tsx`: FOUND

TypeScript: PASS (npx tsc --noEmit)

Commits:
- `9601bef`: feat(13-05): create upload zone and validation display components
- `0b67819`: feat(13-05): build import tab, data page shell, and import history

## Self-Check: PASSED
