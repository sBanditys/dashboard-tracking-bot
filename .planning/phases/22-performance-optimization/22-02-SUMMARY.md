---
phase: 22-performance-optimization
plan: "02"
subsystem: ui
tags: [next.js, dynamic-import, code-splitting, performance, react]

# Dependency graph
requires:
  - phase: 22-01
    provides: staleTime and refetchInterval tuning for query hooks

provides:
  - next/dynamic lazy loading for CreateRoundModal (29KB), LeaderboardTab (15KB), EmailConfigSection (13KB)
  - Skeleton fallbacks matching animate-pulse bg-surface codebase pattern
  - Separate JS chunks for heavy components, reducing initial bundle parse time

affects: [bonus-page, alerts-page, bundle-size]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "next/dynamic with .then((mod) => mod.ComponentName) for named exports"
    - "Modals use loading: () => null (hidden until user action)"
    - "Tab/section content uses animate-pulse bg-surface skeleton div fallbacks"

key-files:
  created: []
  modified:
    - src/app/(dashboard)/guilds/[guildId]/bonus/page.tsx
    - src/app/(dashboard)/guilds/[guildId]/manage/alerts/page.tsx

key-decisions:
  - "RoundsTab kept as static import — it is the default tab shown on page load; only non-default components are dynamically imported"
  - "CreateRoundModal uses loading: () => null — modal is hidden until user clicks button, no skeleton needed"
  - "LeaderboardTab and EmailConfigSection use animate-pulse bg-surface skeleton divs — visible on tab switch / scroll"

patterns-established:
  - "Dynamic import pattern: const Foo = dynamic(() => import('@/components/foo').then((mod) => mod.Foo), { ssr: false, loading: () => <Skeleton /> })"

requirements-completed: [PERF-03]

# Metrics
duration: 1min
completed: 2026-03-04
---

# Phase 22 Plan 02: Dynamic Imports for Heavy Components Summary

**next/dynamic code-splitting applied to CreateRoundModal (29KB), LeaderboardTab (15KB), and EmailConfigSection (13KB) — separate JS chunks with skeleton fallbacks, production build verified**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-04T15:23:17Z
- **Completed:** 2026-03-04T15:24:10Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Converted `CreateRoundModal` to `next/dynamic` with `loading: () => null` (modal hidden until triggered)
- Converted `LeaderboardTab` to `next/dynamic` with 3-item animate-pulse skeleton (non-default tab)
- Converted `EmailConfigSection` to `next/dynamic` with h-32 animate-pulse skeleton (below-the-fold section)
- Kept `RoundsTab` as static import (default tab, must render immediately on page load)
- Production build succeeds with separate JS chunks for all three dynamically imported components

## Task Commits

Each task was committed atomically:

1. **Task 1: Dynamic import heavy components in bonus and alerts pages** - `de5d45a` (feat)

## Files Created/Modified

- `src/app/(dashboard)/guilds/[guildId]/bonus/page.tsx` - Added `import dynamic from 'next/dynamic'`; replaced static imports of `LeaderboardTab` and `CreateRoundModal` with dynamic versions
- `src/app/(dashboard)/guilds/[guildId]/manage/alerts/page.tsx` - Added `import dynamic from 'next/dynamic'`; replaced static import of `EmailConfigSection` with dynamic version

## Decisions Made

- RoundsTab kept as static import — it is the default tab shown on page load; dynamically importing it would cause a flash/skeleton on first render
- CreateRoundModal uses `loading: () => null` — it is invisible until the user clicks "Create Round", so no placeholder is needed
- LeaderboardTab and EmailConfigSection use `animate-pulse bg-surface` skeleton divs — consistent with the established codebase pattern from analytics/page.tsx

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 22 dynamic import work complete
- Bundle now code-splits the three heaviest components identified in RESEARCH.md
- Ready for any remaining phase 22 plans or phase 23

---
*Phase: 22-performance-optimization*
*Completed: 2026-03-04*
