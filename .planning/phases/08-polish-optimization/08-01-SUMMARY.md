---
phase: 08-polish-optimization
plan: 01
subsystem: infrastructure
tags: [dependencies, retry-logic, progress-bar, notifications, performance]
requires: []
provides: [fetchWithRetry, nprogress, sonner, bundle-analyzer]
affects: [all-pages, api-calls, user-experience]
tech-stack:
  added: [nprogress, sonner, @next/bundle-analyzer]
  patterns: [exponential-backoff, jitter, toast-notifications, progress-indicators]
key-files:
  created:
    - src/lib/fetch-with-retry.ts
  modified:
    - package.json
    - src/app/providers.tsx
    - next.config.mjs
    - src/app/globals.css
key-decisions:
  - DEV-088: nprogress over BProgress (BProgress doesn't exist on npm)
  - DEV-089: Inline NProgress style injection for accent-purple customization (ensures color consistency)
  - DEV-090: gcTime set to 10 minutes (balances memory usage with cache performance)
  - DEV-091: Max 3 visible toasts (prevents notification overflow)
metrics:
  duration: 3m 2s
  completed: 2026-02-08
---

# Phase 8 Plan 01: Core Dependencies & Retry Logic Summary

**One-liner:** Exponential backoff retry utility with 429 handling, accent-purple progress bar, dark-themed toast system, and bundle analyzer integration.

## Performance

- **Plan Duration:** 3m 2s
- **Tasks Completed:** 2/2
- **Commits:** 2
- **Files Modified:** 5

## Accomplishments

### Task 1: Install dependencies and create fetchWithRetry utility
- Installed nprogress (progress bar), sonner (toast notifications), @next/bundle-analyzer
- Created `fetchWithRetry` utility with comprehensive retry logic:
  - Handles 429 responses with Retry-After header support
  - Exponential backoff (1s, 2s, 4s...) capped at 30s
  - Jitter (0-50%) to prevent thundering herd
  - Network error retry with same backoff strategy
  - Max 3 retries by default

### Task 2: Configure providers with progress bar, toast, and gcTime
- Added gcTime: 10 minutes to React Query (prevents memory growth)
- Integrated Sonner Toaster:
  - Position: top-right
  - Max 3 visible toasts
  - Dark theme (#2d2d2d background, #404040 border)
- Created NavigationProgress component:
  - NProgress integration with accent-purple (#8B5CF6)
  - 2px height progress bar
  - Custom styling injection for brand consistency
  - Suspense wrapper for useSearchParams compatibility
- Configured bundle analyzer (enabled via ANALYZE=true env var)

## Task Commits

| Task | Commit  | Description                                           |
| ---- | ------- | ----------------------------------------------------- |
| 1    | 6309e63 | Install dependencies and create fetchWithRetry        |
| 2    | 3300bb4 | Configure providers with progress bar, toast, gcTime  |

## Files Created/Modified

**Created:**
- `src/lib/fetch-with-retry.ts` - Exponential backoff retry wrapper with 429 handling

**Modified:**
- `package.json` - Added nprogress, sonner, @next/bundle-analyzer dependencies
- `src/app/providers.tsx` - Added NavigationProgress, Toaster, gcTime config
- `next.config.mjs` - Wrapped config with bundle analyzer
- `src/app/globals.css` - Imported nprogress CSS

## Decisions Made

**DEV-088: nprogress over BProgress**
- **Context:** Plan specified BProgress but package doesn't exist on npm
- **Decision:** Use nprogress (de facto standard for Next.js progress bars)
- **Rationale:** Mature library with proven Next.js integration, similar API

**DEV-089: Inline NProgress style injection**
- **Context:** Need accent-purple (#8B5CF6) instead of default blue
- **Decision:** Inject custom styles in NavigationProgressInner component
- **Rationale:** Ensures styles load after NProgress CSS, maintains brand consistency

**DEV-090: React Query gcTime set to 10 minutes**
- **Context:** Default gcTime is 5 minutes, could lead to memory buildup
- **Decision:** Increase to 10 minutes for better cache retention
- **Rationale:** Balances cache performance (fewer refetches) with memory constraints

**DEV-091: Max 3 visible toasts**
- **Context:** Need notification limits to prevent UI overflow
- **Decision:** Set visibleToasts={3} with oldest dismissed first
- **Rationale:** Prevents notification stack from blocking content, forces priority

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Package name correction**
- **Found during:** Task 1 dependency installation
- **Issue:** Plan specified `bprogress` but package doesn't exist on npm
- **Fix:** Switched to `nprogress` (industry standard for Next.js)
- **Files modified:** package.json, providers.tsx
- **Commit:** 6309e63

**2. [Rule 3 - Blocking] NProgress TypeScript types missing**
- **Found during:** Task 1 type check
- **Issue:** TypeScript couldn't find nprogress type definitions
- **Fix:** Added `@types/nprogress` to devDependencies
- **Files modified:** package.json
- **Commit:** 6309e63

**3. [Rule 3 - Blocking] NProgress CSS import required**
- **Found during:** Task 2 implementation
- **Issue:** NProgress needs base CSS import for functionality
- **Fix:** Added `@import 'nprogress/nprogress.css'` to globals.css
- **Files modified:** src/app/globals.css
- **Commit:** 3300bb4

## Issues Encountered

**Build cache issue (resolved):**
- Initial build failed with `.next/types` error
- **Resolution:** Cleared `.next` directory and rebuilt successfully
- **Root cause:** Next.js caching issue when modifying providers
- **Prevention:** Standard practice for provider changes

## Next Phase Readiness

**Ready for Phase 8 Plans 02-07:**
- fetchWithRetry utility ready for hook integration (Plan 04)
- Toast system ready for mutation feedback (Plans 02, 05)
- Progress bar active for all route transitions
- Bundle analyzer available for optimization verification (Plan 06)

**Dependencies satisfied:**
- Plan 02 (Loading states) can use toast for error feedback
- Plan 03 (Error boundaries) can use toast for error notifications
- Plan 04 (API retry integration) has fetchWithRetry ready
- Plan 05 (Optimistic updates) has toast for confirmation feedback
- Plan 06 (Bundle optimization) has analyzer configured
- Plan 07 (Accessibility) has proper ARIA-compliant toast system

**No blockers for subsequent plans.**

## Self-Check: PASSED

**Created files verification:**
```
FOUND: src/lib/fetch-with-retry.ts
```

**Commits verification:**
```
FOUND: 6309e63 (chore(08-01): install dependencies and create fetchWithRetry utility)
FOUND: 3300bb4 (feat(08-01): configure providers with progress bar, toast, and gcTime)
```

**Build verification:**
```
✓ npm run build completed successfully
✓ npx tsc --noEmit passed with no errors
```

**Functionality verification:**
- fetchWithRetry exports verified in src/lib/fetch-with-retry.ts
- Providers.tsx contains Toaster, NavigationProgress, and gcTime config
- next.config.mjs wrapped with withBundleAnalyzer
- nprogress, sonner, @next/bundle-analyzer present in package.json
