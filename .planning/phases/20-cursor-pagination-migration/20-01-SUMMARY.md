---
phase: 20-cursor-pagination-migration
plan: "01"
subsystem: tracking
tags: [cursor-pagination, infinite-scroll, react-query, typescript, ui]
dependency_graph:
  requires: []
  provides:
    - cursor-based useAccountsInfinite hook
    - cursor-based usePostsInfinite hook
    - CursorPagination type
    - end-of-list UI on accounts and posts pages
    - stale cursor UI on accounts and posts pages
  affects:
    - src/types/tracking.ts
    - src/hooks/use-tracking.ts
    - src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx
    - src/app/(dashboard)/guilds/[guildId]/posts/page.tsx
    - src/lib/posts-csv-export.ts
    - src/lib/posts-excel-export.ts
    - src/lib/posts-json-export.ts
tech_stack:
  added: []
  patterns:
    - "initialPageParam: null as string | null for cursor-based useInfiniteQuery"
    - "getNextPageParam returns undefined (not null) when has_more is false"
    - "CURSOR_INVALID error code thrown on 400/422 for stale cursor detection"
    - "queryClient.resetQueries to restart from first page on stale cursor"
key_files:
  created: []
  modified:
    - src/types/tracking.ts
    - src/hooks/use-tracking.ts
    - src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx
    - src/app/(dashboard)/guilds/[guildId]/posts/page.tsx
    - src/lib/posts-csv-export.ts
    - src/lib/posts-excel-export.ts
    - src/lib/posts-json-export.ts
decisions:
  - "cursor param sent only when non-null — first page fetch has no cursor param"
  - "retry: 2 on infinite queries — 2 auto-retries before showing inline retry button"
  - "Posts page early return narrowed from isError to isError && !data — aligns with Phase 19 pattern"
metrics:
  duration: "4m 1s"
  completed: "2026-02-23"
  tasks: 2
  files: 7
---

# Phase 20 Plan 01: Cursor Pagination Migration Summary

Migrated useAccountsInfinite and usePostsInfinite from offset-based (page numbers) to cursor-based pagination using next_cursor/has_more fields, with end-of-list messaging and stale cursor recovery UI on both list pages.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrate types and infinite hooks to cursor pagination | cdce07a | src/types/tracking.ts, src/hooks/use-tracking.ts, src/lib/posts-csv-export.ts, src/lib/posts-excel-export.ts, src/lib/posts-json-export.ts |
| 2 | Add end-of-list message and stale cursor UI to page components | d5c3541 | src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx, src/app/(dashboard)/guilds/[guildId]/posts/page.tsx |

## What Was Built

**Types (src/types/tracking.ts):**
- Removed `Pagination` interface (offset-based: page/limit/total/total_pages)
- Added `CursorPagination` interface with `next_cursor: string | null` and `has_more: boolean`
- Updated `AccountsResponse` and `PostsResponse` to flat cursor fields (not nested pagination object)

**Hooks (src/hooks/use-tracking.ts):**
- Removed unused `useAccounts` and `usePosts` offset-based hooks
- Removed `buildPostQuery` (used only by deleted `usePosts`)
- Updated `buildAccountQuery` to accept `cursor: string | null` instead of `page: number`
- Updated `buildPostQueryExtended` identically
- `useAccountsInfinite`: `initialPageParam: null as string | null`, `getNextPageParam` uses `has_more`/`next_cursor`, throws `CURSOR_INVALID` on 400/422, `retry: 2`
- `usePostsInfinite`: identical cursor pattern

**Page UI (accounts/page.tsx, posts/page.tsx):**
- Added `useQueryClient` import and instantiation
- Added `isCursorInvalid` detection from error code
- Added "You've reached the end" end-of-list message when `!hasNextPage && items.length > 0`
- Added stale cursor UI: "List has changed." + "Refresh from start" button calling `queryClient.resetQueries`
- Added generic retry UI: "Failed to load more." + "Try again" button calling `fetchNextPage()`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed posts export files referencing deleted pagination field**
- **Found during:** Task 1 (TypeScript compilation after type changes)
- **Issue:** `posts-csv-export.ts`, `posts-excel-export.ts`, `posts-json-export.ts` all used `data.pagination?.total_pages` for offset-based loop termination — broke when `PostsResponse.pagination` was removed
- **Fix:** Changed `fetchPostsPage(guildId, page, limit)` to `fetchPostsPage(guildId, cursor, limit)` in all three files; replaced `page`/`totalPages` loop with `cursor`/`hasMore` loop using `data.has_more` and `data.next_cursor`
- **Files modified:** src/lib/posts-csv-export.ts, src/lib/posts-excel-export.ts, src/lib/posts-json-export.ts
- **Commit:** cdce07a

**2. [Rule 1 - Bug] Narrowed posts page early return from isError to isError && !data**
- **Found during:** Task 2 (TypeScript compilation — `fetchNextPage` inferred as `never` in dead code branch)
- **Issue:** Posts page had `if (isError) { return ... }` which caused TypeScript to narrow `fetchNextPage` to `never` in the main return block (dead code path), making the inline retry button uncompilable
- **Fix:** Changed condition to `if (isError && !data)` — matches Phase 19 architectural decision and accounts page pattern
- **Files modified:** src/app/(dashboard)/guilds/[guildId]/posts/page.tsx
- **Commit:** d5c3541

## Verification

- [x] `npx tsc --noEmit` passes — no TypeScript compilation errors
- [x] `Pagination` interface no longer exists in src/types/tracking.ts
- [x] `AccountsResponse` and `PostsResponse` have `next_cursor: string | null` and `has_more: boolean`
- [x] `useAccountsInfinite` uses `initialPageParam: null` and `getNextPageParam` returns `undefined` when `has_more` is false
- [x] `usePostsInfinite` uses the same cursor pattern
- [x] Both pages have end-of-list and stale cursor UI elements
- [x] No references to `page` parameter in query builders for infinite queries

## Self-Check: PASSED
