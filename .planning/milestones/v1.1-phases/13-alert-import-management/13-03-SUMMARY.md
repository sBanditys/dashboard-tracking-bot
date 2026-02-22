---
phase: 13-alert-import-management
plan: 03
subsystem: ui
tags: [react, nextjs, headlessui, date-fns, react-query, react-intersection-observer]

# Dependency graph
requires:
  - phase: 13-alert-import-management
    provides: use-alerts hooks (useAlertThresholds, useCreateThreshold, useDeleteThreshold, useToggleThreshold)
  - phase: 13-alert-import-management
    provides: AlertThreshold, ThresholdFilters types from alert.ts
provides:
  - Alerts page at /guilds/[guildId]/manage/alerts with full threshold CRUD
  - ThresholdCard component with metric icon, platform badge, toggle, and delete
  - ThresholdCardSkeleton for loading states
  - ThresholdFilters with debounced search and 3 dropdowns
  - ThresholdCreateModal with radio cards, validation, and duplicate detection
  - fadeSlideIn keyframe animation added to globals.css
affects: [13-04, future manage pages]

# Tech tracking
tech-stack:
  added: [date-fns (formatDistanceToNow), react-intersection-observer (useInView), lucide-react icons]
  patterns: [infinite scroll with useInView sentinel, persistent filter state with usePersistentState, non-optimistic toggle with loading spinner, page-level delete modal with removingId animation]

key-files:
  created:
    - src/components/alerts/threshold-card.tsx
    - src/components/alerts/threshold-card-skeleton.tsx
    - src/components/alerts/threshold-filters.tsx
    - src/components/alerts/threshold-create-modal.tsx
    - src/app/(dashboard)/guilds/[guildId]/manage/alerts/page.tsx
  modified:
    - src/app/globals.css (added fadeSlideIn keyframe and animate-fadeSlideIn utility class)

key-decisions:
  - "Non-optimistic toggle: spinner shown during mutation, card state only flips after API confirms"
  - "Page-level delete modal: single TypeToConfirmModal instance at page level, card calls onDelete(threshold) to open it"
  - "Fade-out animation uses removingId state with opacity-0/max-h-0/overflow-hidden CSS transition on 300ms delay"
  - "groups list derived from loaded threshold data instead of a separate API call"

patterns-established:
  - "ThresholdCard: isRemoving prop triggers CSS collapse animation before cache invalidation"
  - "ThresholdFilters: local search state debounced 300ms before propagating to parent filter object"
  - "Duplicate detection: checks existingThresholds array for matching metricType+platform+accountGroupId"

requirements-completed: [ALERT-01, ALERT-02, ALERT-03]

# Metrics
duration: 3min
completed: 2026-02-17
---

# Phase 13 Plan 03: Alert Thresholds Core UI Summary

**Card-based threshold list with infinite scroll, debounced filter bar, create modal with radio cards and duplicate warning, and type-to-confirm delete with fade-out animation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-17T16:44:20Z
- **Completed:** 2026-02-17T16:48:03Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- ThresholdCard renders metric icon (lucide), platform badge (color-coded pill), threshold value, non-optimistic toggle with spinner, delete button, and relative last-triggered timestamp using date-fns
- ThresholdFilters provides debounced text search (300ms via useDebounce) + 3 Headless UI Listbox dropdowns for group, platform, and metric type, wrapped in the sticky FilterBar container
- ThresholdCreateModal uses Headless UI Dialog with radio card metric selector, group select, platform dropdown, number input, inline validation errors, and duplicate detection with yellow warning banner
- Alerts page assembles all components with useAlertThresholds infinite query, useInView scroll sentinel, persistent filter state, empty state with Bell icon, and delete flow with TypeToConfirmModal

## Task Commits

Each task was committed atomically:

1. **Task 1: Create threshold card, skeleton, and filter components** - `e631fc7` (feat)
2. **Task 2: Create threshold create modal with validation** - `1c5afa4` (feat)
3. **Task 3: Build alerts page with infinite scroll, delete flow, and empty state** - `60be76d` (feat)

## Files Created/Modified
- `src/components/alerts/threshold-card.tsx` - Individual threshold card with metric icon, platform badge, non-optimistic toggle, delete button, relative timestamp
- `src/components/alerts/threshold-card-skeleton.tsx` - Skeleton loading cards with shimmer animation matching real card layout
- `src/components/alerts/threshold-filters.tsx` - Filter bar with debounced search and 3 Headless UI Listbox dropdowns
- `src/components/alerts/threshold-create-modal.tsx` - Create modal with radio card metric selector, validation, and duplicate detection
- `src/app/(dashboard)/guilds/[guildId]/manage/alerts/page.tsx` - Full alerts page with infinite scroll, filter state persistence, delete animation, empty state
- `src/app/globals.css` - Added fadeSlideIn keyframe animation and animate-fadeSlideIn utility class

## Decisions Made
- Non-optimistic toggle confirmed: spinner overlays the toggle during mutation, card only reflects the new state after API confirms and query invalidates
- Groups list derived from loaded threshold data (accountGroup on each threshold) rather than a separate /groups API call — avoids extra requests while data is already available
- Page-level TypeToConfirmModal: single modal instance with `deletingThreshold` state, each card's delete button calls `onDelete(threshold)` which sets state and opens the modal
- Duplicate warning shows (not blocks) submission — consistent with the locked decision to allow duplicates with a warning

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Alerts page core CRUD complete: view, filter, create, and delete thresholds
- Plan 04 can add bulk operations (bulk toggle, bulk delete selection bar) and email configuration panel
- All mutations (create/delete/toggle) invalidate the alerts query cache on success
- The `newThresholdId` state variable is wired in the page but not yet set from mutation success — Plan 04 can wire this up when implementing creation animation on the refetched list

---
*Phase: 13-alert-import-management*
*Completed: 2026-02-17*
