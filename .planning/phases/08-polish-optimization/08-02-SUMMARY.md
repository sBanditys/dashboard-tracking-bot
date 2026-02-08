---
phase: 08
plan: 02
subsystem: error-handling-ux
tags: [error-boundaries, offline-detection, accessibility, keyboard-shortcuts]
requires: [root-layout, providers]
provides: [global-error-boundary, dashboard-error-boundary, guild-error-boundary, offline-detection, keyboard-shortcuts]
affects: [layout, user-experience]
tech-stack:
  added: []
  patterns: [next-error-boundaries, navigator-online-api, keyboard-event-handling]
key-files:
  created:
    - src/app/global-error.tsx
    - src/app/(dashboard)/error.tsx
    - src/app/(dashboard)/guilds/[guildId]/error.tsx
    - src/components/offline-banner.tsx
    - src/hooks/use-keyboard-shortcuts.ts
  modified:
    - src/app/layout.tsx
key-decisions:
  - decision: "DEV-081: Three-level error boundary hierarchy"
    rationale: "Global (catastrophic) → Dashboard (wide) → Guild (specific) provides targeted error recovery at each scope level"
  - decision: "DEV-082: Inline styles for global-error"
    rationale: "Global error boundary must render its own HTML/body tags, so Tailwind CSS may not be loaded. Using inline hex colors ensures styling works even in catastrophic failures"
  - decision: "DEV-083: Navigator.onLine API for offline detection"
    rationale: "Native browser API with online/offline events provides reliable detection without external dependencies"
  - decision: "DEV-084: Keyboard shortcuts hook pattern"
    rationale: "useKeyboardShortcuts hook with data-search-input selector enables consistent keyboard navigation without tight coupling to search components"
duration: 1m 50s
completed: 2026-02-08
---

# Phase 08 Plan 02: Error Resilience & UX Foundations Summary

**One-liner:** Error boundaries at three levels (global/dashboard/guild) with offline detection banner and keyboard shortcuts foundation for accessibility.

## Performance

**Execution:** 1m 50s
**Commits:** 2 (per-task atomic commits)
**Files created:** 5
**Files modified:** 1
**Build status:** ✓ Passed (production build successful)
**Type safety:** ✓ All TypeScript checks passed

## Accomplishments

### Error Boundaries

✓ **Global catastrophic error boundary** (`src/app/global-error.tsx`)
  - Renders own `<html>` and `<body>` tags per Next.js requirement
  - Uses inline hex colors (not Tailwind) for styling reliability
  - Shows warning icon, "Application Error" heading, actionable "Refresh Page" button
  - Logs errors to console via useEffect

✓ **Dashboard-wide error boundary** (`src/app/(dashboard)/error.tsx`)
  - Uses Tailwind classes for consistent styling
  - Shows red warning triangle, error message, "Try Again" and "Go to Dashboard" actions
  - Provides user-friendly error recovery at dashboard scope

✓ **Guild-specific error boundary** (`src/app/(dashboard)/guilds/[guildId]/error.tsx`)
  - Same UI pattern as dashboard error with guild-specific messaging
  - "Guild Error" heading with "Back to Guilds" link
  - Targeted error recovery for guild-level failures

### Offline Detection

✓ **OfflineBanner component** (`src/components/offline-banner.tsx`)
  - Detects offline state via `navigator.onLine` API
  - Listens to window 'offline'/'online' events for real-time updates
  - Fixed position yellow banner (z-50) with warning triangle icon
  - Message: "You're offline. Changes won't sync until connection is restored."
  - Auto-dismisses (returns null) when connection restored
  - Positioned with `md:left-64` to account for sidebar width

✓ **Layout integration** (`src/app/layout.tsx`)
  - OfflineBanner rendered inside Providers, before children
  - Appears globally across entire app

### Keyboard Shortcuts

✓ **useKeyboardShortcuts hook** (`src/hooks/use-keyboard-shortcuts.ts`)
  - Listens for Ctrl+K / Cmd+K keydown events
  - Finds `[data-search-input]` element and calls `.focus()`
  - Proper cleanup on unmount
  - Ready for integration with search components in Plan 08

## Task Commits

| Task | Name                                      | Commit  | Files                                                                                    |
| ---- | ----------------------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| 1    | Create error boundaries at three levels  | d5f83bf | global-error.tsx, (dashboard)/error.tsx, guilds/[guildId]/error.tsx                      |
| 2    | Create offline banner and keyboard shortcuts | 766b48a | offline-banner.tsx, use-keyboard-shortcuts.ts, layout.tsx                            |

## Files Created/Modified

**Created (5 files):**
- `src/app/global-error.tsx` — Root catastrophic error boundary with inline styles
- `src/app/(dashboard)/error.tsx` — Dashboard-wide error boundary with Try Again action
- `src/app/(dashboard)/guilds/[guildId]/error.tsx` — Guild-specific error boundary
- `src/components/offline-banner.tsx` — Offline detection banner with auto-dismiss
- `src/hooks/use-keyboard-shortcuts.ts` — Global keyboard shortcuts hook (Ctrl+K)

**Modified (1 file):**
- `src/app/layout.tsx` — Added OfflineBanner import and rendering

## Decisions Made

**DEV-081: Three-level error boundary hierarchy**
- Global (catastrophic errors) → Dashboard (wide errors) → Guild (specific errors)
- Each level provides targeted recovery actions appropriate to scope
- Global must render HTML/body, others use layout context

**DEV-082: Inline styles for global-error**
- Global error boundary exists outside normal app context
- Tailwind may not be loaded during catastrophic failures
- Inline hex colors (#1a1a1a, #2d2d2d, #404040, #8B5CF6) ensure styling always works

**DEV-083: Navigator.onLine API for offline detection**
- Native browser API with reliable online/offline event listeners
- No external dependencies needed
- Real-time updates with window event listeners

**DEV-084: Keyboard shortcuts hook pattern**
- Uses `data-search-input` selector for loose coupling
- Hook can be called from layout or specific pages
- Ctrl+K / Cmd+K standard pattern for search focus
- Will be wired to SearchInput component in Plan 08

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Issue:** Next.js build cache corruption (ENOENT: pages-manifest.json)
**Resolution:** Deleted `.next` directory and rebuilt successfully (Rule 3 - Blocking)
**Impact:** None on deliverables

## Next Phase Readiness

✓ Error boundaries capture uncaught errors at all levels
✓ Users see actionable recovery options instead of crash screens
✓ Offline state detection ready for mutation optimistic updates
✓ Keyboard shortcuts foundation ready for search integration
✓ No blockers for Phase 8 continuation

**Dependencies for next plans:**
- Plan 03 will add search components and wire `data-search-input` attribute
- Plan 04 will add loading states that complement error boundaries
- Keyboard shortcuts can be wired into any page with search functionality

## Self-Check: PASSED

✓ All created files exist:
  - src/app/global-error.tsx
  - src/app/(dashboard)/error.tsx
  - src/app/(dashboard)/guilds/[guildId]/error.tsx
  - src/components/offline-banner.tsx
  - src/hooks/use-keyboard-shortcuts.ts

✓ Modified file exists:
  - src/app/layout.tsx

✓ All commits exist:
  - d5f83bf: feat(08-02): add three-level error boundaries
  - 766b48a: feat(08-02): add offline banner and keyboard shortcuts

✓ TypeScript compilation passed
✓ Production build successful
