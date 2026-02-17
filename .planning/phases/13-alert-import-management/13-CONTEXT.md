# Phase 13: Alert & Import Management - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Admins can manage alert thresholds (view, create, delete, toggle), configure email alert delivery (recipients, delivery mode), and import/export accounts via CSV. Also exposes all backend export types (posts, metrics, analytics, accounts, GDPR, audit) in multiple formats (CSV, XLSX, JSON). Both features live under a new `/manage` section with sub-navigation, accessible only to admins.

Scope expanded from original requirements to include:
- Email alert configuration UI (delivery mode, recipients, verification)
- All export types (not just accounts)
- Format selector (CSV, XLSX, JSON)

</domain>

<decisions>
## Implementation Decisions

### Alert Threshold Display
- **Card-based layout** — each threshold as a card with metric icon, platform badge, value, enabled toggle, and last triggered timestamp
- **Flat list with filters** — all thresholds in one list, not grouped by account group
- **Three filter dropdowns**: account group, platform, metric type
- **Text search** — instant filter-as-you-type (debounced) to search by group name or threshold value
- **All fields on cards**: metric icon, platform badge, threshold value, enabled toggle, last triggered timestamp
- **Last triggered**: relative time by default ("2 hours ago"), absolute on hover/tooltip
- **Inline toggle** for enable/disable directly on card — waits for API confirmation before flipping (not optimistic)
- **Per-group alert settings** — Claude's discretion on presentation (e.g., banner when filtering by group)
- **Discord notification channel** shown as read-only info on the alerts page
- **Empty state**: friendly illustration + prominent "Create threshold" CTA button
- **Infinite scroll** for threshold list
- **Nav badge**: show count of active thresholds on the alerts nav item

### Alert Creation Form
- **Modal/dialog** — opens from "Create threshold" button
- **Metric type**: radio buttons with icons (eye for views, heart for likes, chat for comments)
- **Platform**: dropdown defaulting to "All platforms", can change to specific platform (instagram, tiktok, youtube, x, facebook)
- **Threshold value**: number input with context hints showing current metric averages if available
- **Account group selector**: only shows groups where user has admin permissions
- **Prevent duplicates** — warn if threshold for same metric+platform already exists on the group
- **Post-create**: modal closes, success toast, new card animates into list (fade + slide in)
- **Validation**: inline field errors for form validation + toast for server errors

### Alert Deletion
- **Type to confirm** — must type "delete" to confirm deletion (both single and bulk)
- **Card exit animation**: fade out + collapse, remaining cards slide up smoothly

### Bulk Operations
- **Checkboxes on each card** with "Select all" for visible (filtered) thresholds
- **Sticky bulk action bar** stays visible when scrolling — Enable All, Disable All, Delete actions
- **Bulk delete** requires same "type to confirm" pattern

### Email Alert Configuration
- **Placement**: Claude's discretion (section or tab within alerts page)
- **Delivery mode**: immediate vs daily digest toggle
- **Digest time picker**: Claude's discretion (dropdown or time input for UTC hour)
- **Recipients**: inline list with masked emails (first 3 chars visible always, even for admins), verification badge, resend button, remove button
- **Verification status**: show distinct "Verification expired" state with prominent resend button after 24h
- **Email validation**: client-side format check before sending to backend
- **Rate limit info**: display "Max X emails/hour per recipient" in email config section
- **Max 5 recipients** per guild (backend enforced)

### Import Flow
- **Dedicated import/export page** at `/guilds/[guildId]/manage/data`
- **Tabs**: Import | Export with slide transition between tabs
- **Drag & drop upload zone** on desktop, **tap-to-upload button** on mobile
- **Template download** button on import page only — relies on template, no inline column docs
- **Show limits**: "500 rows max, 1MB file size limit" displayed near upload area
- **All-or-nothing validation** — all rows must be valid before import can proceed
- **Validation error display**: Claude's discretion on best error presentation
- **Inline editing**: Claude decides safest approach against injection (likely re-upload only)
- **Extra confirmation dialog** before starting import — "Import X accounts?" with Cancel/Confirm
- **Progress bar + count** — animated bar showing "127/500 accounts imported" with percentage
- **SSE real-time progress** for import
- **Concurrent import**: Claude decides based on backend CSV lock behavior (likely block with message)
- **Post-import**: success summary showing "X accounts imported successfully" with link to view them
- **Import history**: show recent imports below upload area (date, row count, success/failure status)
- **Client pre-check**: verify file type and basic CSV structure before sending to backend for full validation

### Export Experience
- **All export types exposed**: accounts, posts, metrics, analytics, audit (+ GDPR separate)
- **Radio cards** for export type selection with icon and description per type
- **Format selector**: dropdown to choose CSV, XLSX, or JSON
- **XLSX format**: single sheet with platform column (not separate sheets per platform)
- **Three filter dropdowns**: brand, group, platform (type-specific filters — Claude decides per type)
- **Preview first**: show "X accounts match your filters" with sample rows before downloading
- **Row selection**: Claude decides (likely export all matching, no per-row selection)
- **Progress bar** during export generation with cancel button
- **SSE real-time progress** for export
- **Export history**: shared list across all types with type badge, date, format, row count, re-download link
- **Expiry display**: show "Expires in 18h" or "Expired" badge on history entries (24h download URL expiry)
- **Remaining quota**: display "8 of 10 exports remaining today" near export button
- **Empty state**: disable export button when 0 results match filters
- **File naming**: Claude decides (descriptive with date/filters)
- **GDPR export**: separate section with clear data privacy messaging and separate 3/day quota display

### Navigation & Routing
- **Routes**: `/guilds/[guildId]/manage/alerts` and `/guilds/[guildId]/manage/data`
- **Manage section**: sub-navigation in sidebar with items: Alerts, Data
- **Admin-only**: entire /manage section only visible to admins in sidebar
- **403 page**: non-admins navigating directly to /manage URLs see "You don't have permission" with back link

### Mobile Responsiveness
- **Full mobile support** across all pages
- **Alerts**: cards stack vertically, filters adapt to mobile layout
- **Import**: tap-to-upload replaces drag & drop on mobile
- **Validation table**: Claude decides (horizontal scroll or card layout on mobile)
- **Export radio cards**: Claude decides (stack or carousel on mobile)

### Accessibility
- **WCAG 2.1 AA** compliance across all Phase 13 pages
- **Keyboard navigation**: all interactive elements keyboard accessible
- **Upload zone**: Claude decides best keyboard-accessible alternative (visible browse button or hidden input)
- **Progress bars**: ARIA live region announcements at milestones (25%, 50%, 75%, complete)
- **Screen reader labels**: all toggles, buttons, and form controls properly labeled

### Animations
- **New threshold card**: fade in + slide down from top
- **Deleted threshold card**: fade out + collapse, remaining cards slide up
- **Tab switch**: slide left/right transition between Import and Export tabs

### Loading States
- **Alerts page**: skeleton cards matching threshold card shape
- **Export tab**: progressive load — show static UI immediately, history and quotas load inline

### Error Handling
- **Alert creation**: inline field errors + toast for server errors
- **CSV upload failure**: drop zone turns red with error message, user can try again
- **Export failure**: progress bar turns red + error message + "Try again" button
- **Toggle failure**: waits for API, shows loading state, only flips after confirmation

### Audit Logging
- Rely on existing audit log page (no inline audit on Phase 13 pages)
- Import entries: detailed with link — summary ("Imported 50 accounts from CSV") + link to import details

### Real-Time Updates
- **Import/Export**: SSE for both import and export progress tracking
- **Threshold data**: Claude's discretion (React Query polling consistent with existing patterns)

### Pagination & Data Loading
- **Thresholds**: infinite scroll
- **Import/export history**: paginated, 20 items per page

### Search
- **Alerts page**: instant filter-as-you-type text search (debounced) for group name or threshold value
- **Import/export history**: Claude's discretion based on expected volume

### Claude's Discretion
- Per-group alert settings presentation (banner vs collapsible header)
- Email config placement (section vs tab on alerts page)
- Digest time picker implementation
- Validation error display format (inline table vs split valid/invalid)
- Inline editing safety (likely re-upload only for injection safety)
- Concurrent import handling
- Export row selection (likely all matching)
- Export file naming convention
- Type-specific filter mapping for non-account export types
- Mobile table adaptation (horizontal scroll vs cards)
- Mobile radio card layout (stack vs carousel)
- Upload zone keyboard accessibility approach
- Threshold value min/max constraints
- Import/export history search/filtering
- Alert data refresh strategy (polling interval)

</decisions>

<specifics>
## Specific Ideas

- Export types should include all backend-supported types: accounts, posts, metrics, analytics, audit, GDPR
- GDPR export gets its own visually differentiated section with privacy messaging
- "Type to confirm" pattern for destructive actions (delete threshold, bulk delete)
- Context hints on threshold value input showing current metric averages when available
- Masked emails for all users (including admins who added the recipients)
- Show verification expired state distinctly from pending verification

</specifics>

<deferred>
## Deferred Ideas

- **In-app alert notifications** (browser/push) — separate notification system phase
- Scope was expanded during discussion to include email alert config UI and all export types

</deferred>

---

*Phase: 13-alert-import-management*
*Context gathered: 2026-02-17*
