---
phase: 05-configuration-mutations
plan: 06
subsystem: ui
tags: [react, modals, mutations, crud]

# Dependency graph
requires:
  - phase: 05-01
    provides: ConfirmationModal, useDeleteAccount, useDeleteBrand hooks
  - phase: 05-05
    provides: AddAccountModal, AddBrandModal components
provides:
  - Accounts page with Add Account button and modal integration
  - AccountCard with delete button and confirmation modal
  - Brands page with Add Brand button, delete buttons, and modals
  - Complete CRUD UI for accounts and brands
affects: [user-workflows, data-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Modal integration pattern: state + button + modal at end of component"
    - "Delete confirmation pattern: track item to delete in state, show modal when set"

key-files:
  created: []
  modified:
    - src/components/tracking/account-card.tsx
    - src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx
    - src/app/(dashboard)/guilds/[guildId]/brands/page.tsx

key-decisions:
  - "Delete button placement: in card header for accounts, next to expand icon for brands"
  - "Purple submit buttons for Add modals (bg-accent-purple)"
  - "Delete buttons use red color scheme (text-red-500 hover:text-red-400)"

patterns-established:
  - "Modal integration: state variable + button trigger + modal at component end"
  - "Delete flow: stopPropagation on button → set state → show modal → confirm → mutate"

# Metrics
duration: 2min 29s
completed: 2026-02-06
---

# Phase 05 Plan 06: Wire Up Add and Delete Summary

**Accounts and Brands pages now have Add buttons with modals, AccountCard has delete with confirmation, and Brands page has delete per brand**

## Performance

- **Duration:** 2min 29s
- **Started:** 2026-02-06T00:20:47Z
- **Completed:** 2026-02-06T00:23:16Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- AccountCard accepts guildId and includes delete button with ConfirmationModal
- Accounts page has Add Account button in header and AddAccountModal integration
- Brands page has Add Brand button, delete buttons per brand, and both modals wired up
- All delete buttons stop propagation to prevent card expansion
- All modals use consistent pattern: state → button → modal at end

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Delete to Account Card** - `68fb785` (feat)
2. **Task 2: Wire Up Accounts Page** - `5b07824` (feat)
3. **Task 3: Wire Up Brands Page** - `185e2f3` (feat)

## Files Created/Modified

- `src/components/tracking/account-card.tsx` - Added guildId prop, delete button, ConfirmationModal, useDeleteAccount mutation
- `src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx` - Added Add Account button in header, AddAccountModal, passes guildId to AccountCard
- `src/app/(dashboard)/guilds/[guildId]/brands/page.tsx` - Added Add Brand button, delete buttons per brand item, AddBrandModal, ConfirmationModal, useDeleteBrand mutation

## Decisions Made

**Delete button styling consistency**
- Account cards: red text-red-500 hover:text-red-400
- Brand items: same red styling for visual consistency
- Trash icon SVG used for both

**Delete button placement**
- Account cards: placed in header after status badge, before expand icon
- Brand items: placed next to expand icon in actions area

**Modal integration pattern**
- State variable tracks modal visibility (showAddModal) or item to delete (brandToDelete)
- Button onClick sets state to open modal
- Modal receives open/onClose/onConfirm props
- Modal placed at end of component return for proper rendering

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all components and hooks were available from previous plans as expected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Complete CRUD UI for tracking data is now functional:
- Users can add accounts and brands via modal forms
- Users can delete accounts and brands with confirmation
- Cache invalidation ensures lists refresh immediately
- Wave 3 of Phase 5 complete

Ready for remaining Phase 5 plans or Phase 6.

---
*Phase: 05-configuration-mutations*
*Completed: 2026-02-06*

## Self-Check: PASSED

All modified files exist:
- src/components/tracking/account-card.tsx ✓
- src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx ✓
- src/app/(dashboard)/guilds/[guildId]/brands/page.tsx ✓

All commits verified:
- 68fb785 ✓
- 5b07824 ✓
- 185e2f3 ✓
