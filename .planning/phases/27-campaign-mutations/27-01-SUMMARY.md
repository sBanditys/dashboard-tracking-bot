---
phase: 27-campaign-mutations
plan: 01
subsystem: ui
tags: [react, headless-ui, zod, forms, campaigns]

requires:
  - phase: 25-campaign-hooks
    provides: useCreateCampaign mutation hook, useBrands query hook, campaign types
  - phase: 26-campaign-list
    provides: campaigns list page, campaign card components
provides:
  - CampaignForm shared component (create/edit modes)
  - CreateCampaignModal dialog wrapper
  - Admin-only create button on campaigns list page
affects: [27-02-edit-campaign-modal]

tech-stack:
  added: []
  patterns: [dollar-to-cents form conversion, collapsible Disclosure advanced settings, permission-gated UI actions]

key-files:
  created:
    - src/components/campaigns/campaign-form.tsx
    - src/components/campaigns/create-campaign-modal.tsx
  modified:
    - src/app/(dashboard)/guilds/[guildId]/campaigns/page.tsx

key-decisions:
  - "CampaignForm uses string state for all numeric inputs with dollar-to-cents conversion on submit (Math.round to avoid floating point)"
  - "Edit mode diffs current vs initial values to send minimal PATCH payload with optimistic lock version"
  - "Dirty tracking via wrapper div events rather than per-field onChange to keep CampaignForm reusable"

patterns-established:
  - "Dollar input pattern: string state + $ prefix + dollarsToCents(Math.round(parseFloat * 100)) on submit"
  - "Collapsible advanced settings: Headless UI Disclosure with defaultOpen based on existing values in edit mode"

requirements-completed: [CAMP-05]

duration: 3min
completed: 2026-03-09
---

# Phase 27 Plan 01: Campaign Create Form Summary

**Shared CampaignForm with dollar-to-cents conversion, collapsible advanced settings, and admin-gated CreateCampaignModal on campaigns list page**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-09T22:03:38Z
- **Completed:** 2026-03-09T22:06:47Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- CampaignForm component with create/edit modes, client-side validation (name, brand, at-least-one-rate), and Zod schema validation
- CreateCampaignModal wrapping the form with Dialog, brand dropdown from useBrands, and unsaved changes warning
- Admin-only "+ Create Campaign" button on campaigns list page using permission bit 0x8 guard

## Task Commits

Each task was committed atomically:

1. **Task 1: Build CampaignForm shared component and CreateCampaignModal** - `4907d87` (feat)
2. **Task 2: Wire create button into campaigns list page with admin guard** - `bdb27a0` (feat)

## Files Created/Modified
- `src/components/campaigns/campaign-form.tsx` - Shared form component for create and edit modes with dollar inputs, platform rates, collapsible advanced settings
- `src/components/campaigns/create-campaign-modal.tsx` - Dialog wrapper using useCreateCampaign hook and useBrands for dropdown
- `src/app/(dashboard)/guilds/[guildId]/campaigns/page.tsx` - Added admin check, create button, and CreateCampaignModal render

## Decisions Made
- Used string state for all numeric/dollar inputs to avoid controlled input issues with number type, converting to cents only on submit
- Edit mode computes diff against initialValues so only changed fields are sent in PATCH payload (always includes version for optimistic lock)
- Dirty state tracking in CreateCampaignModal uses wrapper div click/keydown events rather than lifting state from CampaignForm

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CampaignForm is ready to be reused in plan 02 (edit campaign modal) with mode="edit" and initialValues
- The edit mode diff logic is already implemented and tested via tsc

---
*Phase: 27-campaign-mutations*
*Completed: 2026-03-09*
