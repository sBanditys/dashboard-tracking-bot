---
phase: 07-data-management
plan: 08
subsystem: ui
tags: [react, typescript, trash, soft-delete, type-to-confirm]

# Dependency graph
requires:
  - phase: 07-03
    provides: Trash management hooks (useTrashItems, useRestoreItem, usePermanentDelete)
provides:
  - TrashItemCard with platform icon, deletion date, and expiry countdown
  - TrashList with tabbed interface and type-to-confirm permanent delete
  - Trash page at /guilds/[guildId]/settings/trash
affects: [07-09-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Expiry countdown with color-coded urgency (gray > 7d, yellow <= 7d, red <= 1d)"
    - "Left border accent for urgency indicators"
    - "Segmented tab bar (inline-flex with rounded-lg container)"

key-files:
  created:
    - src/components/trash/trash-item-card.tsx
    - src/components/trash/trash-list.tsx
    - src/app/(dashboard)/guilds/[guildId]/settings/trash/page.tsx
  modified: []

key-decisions:
  - "DEV-074: Color-coded left border for urgency (yellow for <= 7 days, red for <= 1 day)"
  - "DEV-075: Per-item restore loading state tracked by restoringId (avoids all cards showing spinner)"

patterns-established:
  - "Trash item cards use left border color to indicate urgency level"
  - "Mutation tracking via individual item ID state (restoringId pattern)"
  - "Segmented tab buttons in inline-flex container for type filtering"

# Metrics
duration: 1m 42s
completed: 2026-02-07
---

# Phase 07 Plan 08: Trash Management Page Summary

**Trash page with tabbed item list, expiry countdown warnings, restore/permanent-delete actions, and type-to-confirm deletion modal**

## Performance

- **Duration:** 1m 42s
- **Started:** 2026-02-07T15:58:27Z
- **Completed:** 2026-02-07T16:00:09Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments
- TrashItemCard with platform icon, type badge, relative deletion date, and color-coded expiry countdown
- TrashList with Accounts/Posts tabbed interface, skeleton loading, empty states, and TypeToConfirmModal for permanent deletion
- Trash page at /guilds/[guildId]/settings/trash with header, 30-day retention info banner, and GuildTabs navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: TrashItemCard and TrashList components** - `ef190fd` (feat)
2. **Task 2: Trash page under guild settings** - `e638f5f` (feat)

## Files Created/Modified
- `src/components/trash/trash-item-card.tsx` - Card component displaying item name, platform icon, type badge, deletion date (via date-fns formatDistanceToNow), and urgency-colored expiry countdown with restore/delete actions
- `src/components/trash/trash-list.tsx` - Tabbed list (Accounts | Posts) with segmented button tabs, skeleton loading state, empty state messaging, per-item restore tracking, and TypeToConfirmModal integration for permanent deletion
- `src/app/(dashboard)/guilds/[guildId]/settings/trash/page.tsx` - Page component with GuildTabs, header, yellow info banner about 30-day retention, and TrashList integration

## Decisions Made

**DEV-074: Color-coded left border for urgency**
- Items expiring within 7 days get yellow left border + yellow text
- Items expiring within 1 day get red left border + red "Expires today" text
- Items with > 7 days remaining show gray text without border accent

**DEV-075: Per-item restore loading state**
- Track `restoringId` string state instead of boolean
- Only the specific card being restored shows spinner
- Prevents all cards from appearing to load simultaneously

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Trash management UI complete. The page is accessible at /guilds/[guildId]/settings/trash but not yet linked from the sidebar navigation. Integration plan (07-09) will handle sidebar linking.

Ready for:
- Sidebar navigation link to trash page
- End-to-end testing with actual soft-deleted items from backend

---
*Phase: 07-data-management*
*Completed: 2026-02-07*

## Self-Check: PASSED
