---
phase: 03-tracking-data-display
plan: 03
subsystem: data-fetching
tags: [react-query, infinite-scroll, hooks, scroll-to-top]
depends_on:
  requires: ["03-01"]
  provides: ["useAccountsInfinite", "usePostsInfinite", "ScrollToTop"]
  affects: ["03-04", "03-05"]
tech_stack:
  added: []
  patterns: ["useInfiniteQuery", "scroll-event-tracking"]
key_files:
  created:
    - src/components/scroll-to-top.tsx
  modified:
    - src/hooks/use-tracking.ts
decisions:
  - id: "DEV-019"
    description: "buildAccountQuery/buildPostQueryExtended helpers for filter params"
    rationale: "Reusable query string builders matching existing buildPostQuery pattern"
  - id: "DEV-020"
    description: "PostFiltersExtended extends PostFilters with search"
    rationale: "Maintains type compatibility with existing filters while adding search capability"
metrics:
  duration: "1m 18s"
  completed: "2026-01-30"
---

# Phase 3 Plan 3: Infinite Scroll Hooks and ScrollToTop Summary

**One-liner:** Infinite query hooks for accounts/posts with filter support plus floating scroll-to-top button.

## What Was Built

### useAccountsInfinite Hook
- Implemented with React Query v5 `useInfiniteQuery`
- Parameters: guildId, limit (default 50), filters (search, platform)
- Includes filters in queryKey for automatic cache invalidation on filter changes
- `getNextPageParam` returns undefined when page >= total_pages
- 2-minute staleTime per DEV-002

### usePostsInfinite Hook
- Implemented with React Query v5 `useInfiniteQuery`
- Parameters: guildId, limit (default 50), filters (PostFiltersExtended)
- Extended filters include: search, platform, status, brand_id, from, to, sort_by, sort_order
- Includes filters in queryKey for automatic cache invalidation
- 1-minute staleTime (posts update more frequently)

### ScrollToTop Component
- Floating button fixed at bottom-6 right-6
- Shows when scrollY > 300px threshold
- Smooth scroll behavior with window.scrollTo
- Accessible with aria-label="Scroll to top"
- Focus ring for keyboard navigation

## Task Breakdown

| Task | Name | Commit | Duration |
|------|------|--------|----------|
| 1 | Add useAccountsInfinite hook | c5324ba | ~25s |
| 2 | Add usePostsInfinite hook | c3ff1be | ~25s |
| 3 | Create ScrollToTop component | a023376 | ~25s |

## Decisions Made

### DEV-019: Separate query builder helpers
- **Context:** Needed to build query strings with filter params
- **Decision:** Create buildAccountQuery and buildPostQueryExtended helpers
- **Rationale:** Follows existing buildPostQuery pattern, keeps hooks clean
- **Impact:** Consistent approach to query string building

### DEV-020: PostFiltersExtended extends PostFilters
- **Context:** Infinite posts hook needs search capability not in base PostFilters
- **Decision:** Create PostFiltersExtended interface extending PostFilters
- **Rationale:** Maintains backwards compatibility while adding search
- **Impact:** Type-safe filter handling with optional search

## Files Changed

### Created
- `src/components/scroll-to-top.tsx` - Floating scroll-to-top button

### Modified
- `src/hooks/use-tracking.ts` - Added useAccountsInfinite, usePostsInfinite, AccountFilters, PostFiltersExtended

## Exports Added

```typescript
// From src/hooks/use-tracking.ts
export interface AccountFilters
export interface PostFiltersExtended
export function useAccountsInfinite(guildId, limit?, filters?)
export function usePostsInfinite(guildId, limit?, filters?)

// From src/components/scroll-to-top.tsx
export function ScrollToTop()
```

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compilation: PASSED
- npm run build: PASSED
- All exports verified present
- Infinite hooks properly handle pagination end (getNextPageParam returns undefined)
- Filter changes reset pagination (filters in queryKey)

## Next Phase Readiness

Ready for 03-04 (Card components):
- Infinite hooks ready to be consumed by card list components
- ScrollToTop ready to be added to pages with infinite scroll
- Filter state management prepared for FilterBar integration

## API Contract

```typescript
// useAccountsInfinite returns InfiniteData<AccountsResponse>
const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useAccountsInfinite(
  guildId,
  50,
  { search: 'term', platform: 'instagram' }
)

// Flatten pages for rendering
const accounts = data?.pages.flatMap(page => page.accounts) ?? []

// usePostsInfinite returns InfiniteData<PostsResponse>
const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = usePostsInfinite(
  guildId,
  50,
  { search: 'term', platform: 'tiktok', from: '2026-01-01', to: '2026-01-31' }
)

// Flatten pages for rendering
const posts = data?.pages.flatMap(page => page.posts) ?? []
```
