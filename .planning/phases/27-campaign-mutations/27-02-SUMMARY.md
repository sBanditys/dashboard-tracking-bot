---
phase: 27-campaign-mutations
plan: 02
subsystem: ui
tags: [react, headless-ui, optimistic-locking, campaign, modal]

requires:
  - phase: 27-campaign-mutations/01
    provides: CampaignForm component with create/edit modes and diff-only PATCH
  - phase: 25-campaign-hooks
    provides: useUpdateCampaign, useDeleteCampaign hooks with ConflictError
provides:
  - EditCampaignModal with diff-only PATCH and 409 conflict handling
  - Campaign detail page admin edit/delete buttons with status guards
affects: [28-campaign-detail-tabs, 29-campaign-export]

tech-stack:
  added: []
  patterns: [optimistic-lock-409-toast-refresh, admin-status-guard-visibility]

key-files:
  created:
    - src/components/campaigns/edit-campaign-modal.tsx
  modified:
    - src/app/(dashboard)/guilds/[guildId]/campaigns/[campaignId]/page.tsx

key-decisions:
  - "409 ConflictError closes modal and shows toast with Refresh action to invalidate detail query"
  - "Delete button completely hidden (not disabled) for Active/Paused/SubmissionsClosed campaigns"

patterns-established:
  - "Conflict handling pattern: catch ConflictError in mutate onError, toast with refresh action, close modal"
  - "Status guard pattern: canDelete derived from campaign.status, controls button visibility not disabled state"

requirements-completed: [CAMP-06, CAMP-07]

duration: 3min
completed: 2026-03-09
---

# Phase 27 Plan 02: Edit/Delete Campaign Summary

**EditCampaignModal with diff-only PATCH, 409 conflict toast+refresh, and admin-only edit/delete buttons with Draft/Completed status guard on campaign detail page**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-09T23:12:22Z
- **Completed:** 2026-03-09T23:15:22Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- EditCampaignModal pre-fills form from campaign data and sends only changed fields + version
- 409 ConflictError handled with toast "Campaign was modified by someone else" + Refresh action + modal close
- Admin-only Edit button always visible; Delete button only for Draft/Completed campaigns
- ConfirmationModal for delete with redirect to campaign list on success

## Task Commits

Each task was committed atomically:

1. **Task 1: Build EditCampaignModal with diff-only PATCH and 409 handling** - `5556034` (feat)
2. **Task 2: Wire edit/delete buttons into campaign detail page** - `20d952c` (feat)

## Files Created/Modified
- `src/components/campaigns/edit-campaign-modal.tsx` - Dialog modal wrapping CampaignForm in edit mode with conflict handling
- `src/app/(dashboard)/guilds/[guildId]/campaigns/[campaignId]/page.tsx` - Added admin edit/delete buttons, modals, router navigation

## Decisions Made
- 409 ConflictError closes modal and shows toast with Refresh action (invalidates detail query so user sees latest)
- Delete button completely hidden (not disabled) for Active/Paused/SubmissionsClosed campaigns per plan spec

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 27 complete -- all campaign CRUD operations (create, edit, delete) available to admin users
- Ready for Phase 28 (Analytics & Payouts) and Phase 29 (Campaign Export)

---
*Phase: 27-campaign-mutations*
*Completed: 2026-03-09*
