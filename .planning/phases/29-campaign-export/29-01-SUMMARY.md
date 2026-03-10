---
phase: 29-campaign-export
plan: "01"
subsystem: campaigns
tags: [export, modal, admin, polling]
dependency_graph:
  requires: []
  provides: [ExportCampaignModal, export-button]
  affects: [campaign-detail-page]
tech_stack:
  added: []
  patterns: [headlessui-dialog, useMutation-mutateAsync, polling-useQuery]
key_files:
  created:
    - src/components/campaigns/export-campaign-modal.tsx
  modified:
    - src/app/(dashboard)/guilds/[guildId]/campaigns/[campaignId]/page.tsx
decisions:
  - "ExportCampaignModal view syncs on modal open via useEffect watching [open, exportId] to handle re-open mid-export"
  - "Quota error detection uses case-insensitive includes('quota') || includes('limit') on error message"
  - "useTriggerExport already toasts on success -- modal does NOT add a second toast"
metrics:
  duration: "~3 minutes"
  completed_date: "2026-03-10"
  tasks_completed: 2
  files_changed: 2
---

# Phase 29 Plan 01: Campaign Export Modal Summary

4-state export wizard modal (ExportCampaignModal) with admin-only Export button in campaign detail header; CSV/XLSX format and payment/full scope selection, polling-based progress, download link with expiry, and quota guard.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Build ExportCampaignModal component | 269631e | src/components/campaigns/export-campaign-modal.tsx |
| 2 | Integrate Export into campaign detail page | cea2a24 | src/app/(dashboard)/guilds/[guildId]/campaigns/[campaignId]/page.tsx |

## What Was Built

### ExportCampaignModal (`src/components/campaigns/export-campaign-modal.tsx`)

A 4-state wizard modal following the Headless UI Dialog pattern:

- **Options view:** Format radios (CSV/XLSX), scope radios (payment summary / full data with descriptions), quota display ("N of 10 daily exports remaining"), inline quota exceeded warning, Export button with spinner while pending.
- **Progress view:** Spinner + "Export in progress..." text, polled via `useCampaignExportStatus` every 3s. Close button preserves `exportId` in parent state.
- **Complete view:** Download anchor (`<a href download>`) styled as primary button, expiry hint computed from `expiresAt` via `formatExpiresIn`, Close button calls `onExportDone`.
- **Error view:** Error message from `exportStatus.data.error` or fallback, Try Again resets to options + calls `onExportDone`, Close calls `onExportDone`.

### Campaign Detail Page (`src/app/(dashboard)/guilds/[guildId]/campaigns/[campaignId]/page.tsx`)

- Added `exportOpen` and `exportId` state.
- Export button inserted before Edit button (order: Export, Edit, Delete), disabled with tooltip during active export.
- `ExportCampaignModal` rendered inside `{isAdmin && (...)}` block after the delete ConfirmationModal.
- `onExportStarted` stores exportId; `onExportDone` clears it and closes modal.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compiles with zero errors (`npx tsc --noEmit`)
- All 4 modal views implemented with correct transitions
- Quota guard disables Export button when remaining === 0
- Export button disabled (opacity-50, cursor-not-allowed) during active export
- Non-admin users: no Export button, no ExportCampaignModal rendered
- exportId persists in page state across modal close/reopen

## Self-Check: PASSED

- export-campaign-modal.tsx: FOUND
- page.tsx: FOUND
- Commit 269631e: FOUND
- Commit cea2a24: FOUND
