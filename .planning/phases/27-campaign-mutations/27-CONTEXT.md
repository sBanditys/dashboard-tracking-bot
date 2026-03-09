# Phase 27: Campaign Mutations - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Admins can create, configure, and clean up campaigns through the dashboard. Delivers: create campaign modal, edit campaign modal, delete with confirmation, and admin visibility guards. No status transitions — those are out of scope (backend lacks status in updateCampaignSchema).

Requirements: CAMP-05, CAMP-06, CAMP-07

</domain>

<decisions>
## Implementation Decisions

### Create campaign form
- Modal dialog (Headless UI Dialog), consistent with AddBrandModal and AddAccountModal patterns
- Triggered by "+ Create Campaign" button next to page title on campaign list page
- Fields organized with collapsible advanced section:
  - **Always visible:** Name, Brand (select dropdown), Budget ($), Per-user Cap ($), Platform Rates (IG, TikTok, YT)
  - **Collapsible "Advanced Settings":** closeThreshold, rules, dailySubmissionLimit, paymentMethods, channel IDs (reviewChannelId, alertsChannelId, announcementChannelId)
- Monetary fields entered as dollars (e.g., "50.00"), converted to cents on submit
- At least one platform rate must be non-zero to create a campaign (client-side validation)
- Uses `createCampaignSchema` for Zod validation on submit
- `useUnsavedChanges` hook for dirty form warning

### Edit campaign flow
- Edit modal from campaign detail page header — "Edit" button opens pre-filled modal
- Shared `CampaignForm` component used by both create and edit modals (mode prop controls behavior, initial values, submit handler)
- Only changed fields sent in PATCH payload (diff form state vs initial values) plus `version` field for optimistic locking
- 409 conflict handling: error toast "Campaign was modified by someone else" with refresh action — uses `ConflictError` instanceof check from Phase 25

### Delete campaign UX
- Delete button in campaign detail page header, next to Edit button (red secondary style)
- Button completely hidden for Active/Paused/SubmissionsClosed campaigns — only visible for Draft/Completed
- Confirmation via existing `ConfirmationModal` component: "Are you sure you want to delete [Campaign Name]?"
- After successful deletion: navigate to campaign list page with success toast
- Campaign list cache invalidated on delete

### Admin visibility guards
- Create, Edit, and Delete buttons completely hidden for non-admin users (not disabled — not rendered)
- Matches existing pattern from bonus and settings pages
- Admin check sourced from guild permissions (existing `isAdmin` pattern)
- Non-admins see a clean read-only campaign list and detail view

### Claude's Discretion
- Exact brand dropdown implementation (Headless UI Listbox or native select)
- Payment methods input format (comma-separated text vs multi-select)
- Channel ID input format (text input vs channel picker if available)
- Modal width (max-w-md vs max-w-lg depending on field layout)
- Toast message wording for create/edit/delete success
- Whether advanced section defaults to expanded in edit mode (when fields have values)
- Skeleton/loading state inside modals during submit

</decisions>

<specifics>
## Specific Ideas

- Create and edit share a single CampaignForm component — avoids duplicating 13+ field definitions
- Dollar-to-cents conversion mirrors how `centsToDisplay` works in reverse — familiar mental model
- Delete button placement matches the mockup: Edit and Delete side-by-side in header, Delete only for Draft/Completed
- The "+ Create Campaign" button sits in the header row next to "Campaigns" title (purple accent, admin-only)
- Empty state on campaign list already says "Create one to get started" — the create button completes this flow

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ConfirmationModal` (`src/components/ui/confirmation-modal.tsx`): Delete confirmation dialog — ready to use
- `AddBrandModal` (`src/components/forms/add-brand-modal.tsx`): Modal form pattern template (Dialog, form, validation, submit, useUnsavedChanges)
- `useCreateCampaign` / `useUpdateCampaign` / `useDeleteCampaign` (`src/hooks/use-campaigns.ts`): Mutation hooks already built in Phase 25
- `createCampaignSchema` / `updateCampaignSchema` (`src/types/campaign.ts`): Zod schemas for runtime validation
- `ConflictError` (`src/types/campaign.ts`): 409 error class with server campaign data
- `centsToDisplay` (`src/lib/format.ts`): Currency display formatting
- `useUnsavedChanges` (`src/hooks/use-unsaved-changes.ts`): Dirty form warning hook
- `PlatformIcon` (`src/components/platform-icon.tsx`): Platform icons for rate input labels

### Established Patterns
- Modal forms: Headless UI Dialog with backdrop, DialogPanel with bg-surface/border-border, form inside, Cancel/Submit buttons
- Input styling: bg-background border border-border, focus:ring-2 ring-accent-purple, text-white placeholder-gray-500
- Error display: red-500/10 bg with red-400 text inside form
- Admin check: `isAdmin` boolean from guild context, conditional rendering with `{isAdmin && <button>}`
- Mutation flow: mutate() with onSuccess (reset + close + toast) and onError (set error state)

### Integration Points
- Campaign list page (`src/app/(dashboard)/guilds/[guildId]/campaigns/page.tsx`): Add create button + create modal
- Campaign detail page (`src/app/(dashboard)/guilds/[guildId]/campaigns/[campaignId]/page.tsx`): Add edit/delete buttons + modals
- New components directory: `src/components/campaigns/` (already has campaign-card, campaign-card-skeleton, campaign-status-select, etc.)
- Router: `useRouter()` for post-delete navigation back to campaign list

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 27-campaign-mutations*
*Context gathered: 2026-03-09*
