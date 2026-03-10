# Phase 29: Campaign Export - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Admins can export campaign data for external reporting and accounting. Select format (CSV/XLSX) and scope (payment summary/full data), trigger export via modal, see progress via polling, and download the result. No campaign CRUD — that's Phase 27. No analytics/payouts — that's Phase 28.

Requirements: EXP-01, EXP-02

</domain>

<decisions>
## Implementation Decisions

### Export trigger placement
- Export button in campaign detail header, next to Edit and Delete
- Admin-only (hidden for non-admin users, same `isAdmin` guard as Edit/Delete)
- Available for all campaign statuses (Draft, Active, Paused, SubmissionsClosed, Completed)
- Button disabled with tooltip "Export in progress" while an export is active (exportId is set)
- Re-enabled after export completes or fails

### Export button styling
- Matches Edit button style: `bg-surface border border-border text-gray-300 hover:text-white`
- Uses Download/export icon from lucide-react
- Same size and weight as Edit button — secondary action, not primary

### Export modal (ExportCampaignModal)
- New dedicated component: `src/components/campaigns/export-campaign-modal.tsx`
- Multi-state modal with 4 states: options → progress → complete → error
- Opens when Export header button is clicked

### Format selection
- Radio buttons (not dropdown): CSV and XLSX side by side
- Default: CSV selected

### Scope selection
- Radio buttons with descriptions:
  - "Payment summary" — Participant earnings, payment status, amounts
  - "Full data" — All campaign data including posts, platforms, timestamps
- Default: Payment summary selected

### No file name preview
- Modal shows format + scope radios and Export button only
- Backend decides the file name

### Progress tracking
- Uses `useCampaignExportStatus` polling hook (3s interval) — NOT SSE
- ExportStatusResponse has `status`, `downloadUrl`, `expiresAt`, `error`
- No cancel support — close button only (export continues on backend)

### Loading state
- Between clicking Export and receiving exportId: button shows spinner + "Exporting..." text, radios disabled
- Once exportId received, modal transitions to progress view

### Error handling
- Export failure: inline error in modal with message + "Try Again" button (resets to options view)
- 429 quota exceeded: inline warning in modal "Daily export limit reached (10/10). Try again tomorrow." with Export button disabled and Close button only

### Download behavior
- Direct URL link: `<a href={downloadUrl} download>` — no proxy
- Modal shows "Export ready" with Download button + Close button
- Expiry hint shown below Download: "Link expires in 24h" (calculated from `expiresAt` in response)

### Quota display
- Query guild export quota via `useExportHistory(guildId, 1, 1)` when modal opens (already cached with 2min staleTime)
- Show remaining quota at bottom of modal: "7 of 10 daily exports remaining"
- Disable Export button when quota is 0
- Campaign exports share the guild-level daily export quota (10/day total across all export types)

### State persistence
- exportId stored in parent component state (campaign detail page), not inside modal
- Closing modal during progress preserves exportId — re-opening resumes progress view
- Only reset to options after: complete + close, error + close, or error + retry

### No campaign export history
- No export history section on campaign detail page
- Past exports accessible through guild-level Data Management > Export tab

### Claude's Discretion
- Mobile responsiveness (standard responsive modal patterns, radios stack vertically)
- Accessibility (focus trap, aria-labelledby, aria-live for progress, Escape to close)
- Exact spacing, typography within modal
- Progress percentage display format
- Skeleton/shimmer during quota fetch
- Modal overlay animation

</decisions>

<specifics>
## Specific Ideas

- Modal flow mirrors a wizard: options → (loading) → progress → complete/error — each state replaces the previous in the same modal shell
- Quota display follows the guild export tab pattern where `useExportHistory` returns `quota.standard.remaining`
- Download link expiry calculated as relative time from `expiresAt` field (e.g., "24h", "12h")
- Export button position: between Edit and Delete in the header action row

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useTriggerExport` (`src/hooks/use-campaigns.ts`): POST mutation returning `{ exportId, status: 'queued' }`
- `useCampaignExportStatus` (`src/hooks/use-campaigns.ts`): Polling query (3s) returning `{ exportId, status, downloadUrl, expiresAt, error }`
- `useExportHistory` (`src/hooks/use-exports.ts`): Returns `data.quota.standard.remaining` for quota display
- `ExportTriggerResponse`, `ExportStatusResponse` (`src/types/campaign.ts`): Export type definitions
- `ConfirmationModal` (`src/components/ui/confirmation-modal.tsx`): Modal shell pattern reference (overlay, close, animation)
- `export-tab.tsx` (`src/components/import-export/export-tab.tsx`): Full ProgressSection pattern with SSE, cancel, error/complete states — reference for state machine
- `centsToDisplay` (`src/lib/format.ts`): Currency formatting if needed in export context

### Established Patterns
- Admin guard: `isAdmin` boolean from guild permissions, conditional rendering with `{isAdmin && ...}`
- Modal: Headless UI Dialog or custom overlay with backdrop click to close, Escape key support
- Mutation loading: `isPending` from useMutation to disable buttons and show spinner
- Radio buttons: standard `<input type="radio">` with Tailwind styling (no existing radio component — create inline)
- Button styles: `bg-surface border border-border text-gray-300 hover:text-white` for secondary actions

### Integration Points
- Campaign detail page (`src/app/(dashboard)/guilds/[guildId]/campaigns/[campaignId]/page.tsx`): Add Export button to header, manage exportId state, render ExportCampaignModal
- Campaign proxy routes: `POST .../campaigns/[campaignId]/export/route.ts` and `GET .../campaigns/[campaignId]/export/[exportId]/route.ts` already exist
- Export hooks: `useTriggerExport` and `useCampaignExportStatus` already built in Phase 25

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-campaign-export*
*Context gathered: 2026-03-10*
