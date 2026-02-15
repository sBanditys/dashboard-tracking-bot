# Phase 7: Data Management - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can export tracking data (accounts + posts) in multiple formats and perform bulk operations (delete, export, reassign) on tracked items. Includes soft-delete with trash recovery. Does NOT include new tracking capabilities, analytics exports, or settings exports.

</domain>

<decisions>
## Implementation Decisions

### Export format & scope
- Three export formats: CSV, JSON, and XLSX
- Exportable data: accounts and posts (not brands, settings, or audit log)
- Two export modes: "Export current view" (respects active filters) and "Export all" (full data)
- Export button on each data page (Accounts, Posts) in the filter bar area
- Dedicated export page in sidebar for full configuration and export history
- User-editable filename with descriptive default (e.g., "sonuhaempire-accounts-2026-02-07.csv")

### Selection & bulk actions
- Checkboxes on each card with shift-click for range selection
- Select-all selects visible items first, then offers "Select all X items" link for full selection (Gmail pattern)
- Three bulk operations: Delete, Export selected, Reassign (to different group/brand)
- Sticky bottom bar appears when items are selected showing "X selected" with action buttons

### Download experience
- Smart download: instant for small exports (<1000 items), background job for large exports
- Progress bar with item count for exports ("Exporting 450/1,200 items...")
- Background exports: toast notification if user is on the page + always available in export history
- Export history lives on the dedicated export page with download links

### Bulk confirmation flow
- Type-to-confirm pattern for ALL bulk operations (delete, reassign, export) — user types count or "DELETE"
- Partial failure handling: show results summary ("12 deleted, 3 failed") with details on which items failed
- Audit logging: one summary entry + individual entries per affected item

### Soft delete & trash
- Deleted items are soft-deleted, moved to trash (not permanently removed)
- Trash accessible under guild settings as "Deleted Items" sub-page
- Auto-purge after 30 days with warning when items approach expiry
- Users can permanently delete from trash with type-to-confirm
- Users can restore items from trash back to their original location

### Claude's Discretion
- Whether to reuse existing S3 bucket and `/exportdata` backend infrastructure or build separate export logic (existing AWS S3 bucket already available in backend API)
- XLSX generation library choice
- Exact progress tracking implementation for exports
- Trash UI layout and item grouping within settings

</decisions>

<specifics>
## Specific Ideas

- Existing AWS S3 bucket already configured in the backend API for the `/exportdata` bot command — researcher should investigate reuse
- Gmail-style "Select all X items" pattern after header checkbox
- Sticky bottom bar for bulk actions (like Gmail/Notion selection bar)
- Type-to-confirm pattern inspired by GitHub repo deletion
- Progress bar should show item counts, not just percentage

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-data-management*
*Context gathered: 2026-02-07*
