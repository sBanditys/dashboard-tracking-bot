# Phase 20: Cursor Pagination Migration - Research

**Researched:** 2026-02-23
**Domain:** TanStack React Query v5 — useInfiniteQuery, cursor pagination, infinite query cache management
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Loading experience**
- Skeleton rows (matching item shape) when fetching the next page — not a spinner
- Subtle end-of-list message (e.g., "You've reached the end") when no more items exist
- No toast or notification for add/remove mutations — the optimistic list change IS the feedback

**List reset behavior**
- Optimistic updates for add/remove tracked account — item appears/disappears immediately, then re-fetch confirms
- On mutation, reset the infinite query from the beginning (no mixed-shape cache pages)
- No toast confirmation — list change only

**Error handling**
- Auto-retry next-page fetches 2-3 times on failure, then show inline retry button at the bottom
- Stale/invalid cursor: show "List has changed" message with a reset button to refresh from the start
- Optimistic rollback UX: Claude's discretion

**Transition approach**
- Cursor-only TypeScript types from the start — delete offset pagination types, no dual-shape union
- Migrate accounts and posts lists together in one shot — single consistent migration
- One-way migration, no feature flag or environment toggle for fallback
- No backwards compatibility shim

### Claude's Discretion
- Skeleton row count for next-page loading
- Reset-load appearance (full skeleton page vs keep stale + overlay)
- Scroll position behavior after mutation reset
- Optimistic insert position (top of list vs current position)
- Optimistic rollback visual treatment
- Empty state handling (keep current or refresh)
- Whether to migrate other paginated lists beyond accounts and posts

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAGE-01 | Accounts and posts hooks migrated from offset-based (`page`, `total_pages`) to cursor-based (`next_cursor`, `has_more`) pagination using `useInfiniteQuery` with `initialPageParam: null` | useInfiniteQuery cursor pattern verified in Context7 (TanStack Query v5 docs); `initialPageParam: null` is the correct v5 default for "no cursor yet"; `getNextPageParam` returns `lastPage.next_cursor ?? undefined` |
| PAGE-02 | Pagination TypeScript types updated — offset types deleted, cursor as the only shape (per locked decision: cursor-only from the start, no dual-shape union) | `Pagination` interface in `src/types/tracking.ts` is replaced with `CursorPagination`; `AccountsResponse` and `PostsResponse` updated to use cursor shape; mirrors the existing `BonusRoundsResponse` pattern already in the codebase (`next_cursor: string \| null`, `has_more: boolean`) |
| PAGE-03 | Infinite scroll mutations use `queryClient.resetQueries` (not `invalidateQueries`) to prevent mixed-shape cache pages after data changes | `resetQueries` verified in TanStack Query v5 docs: resets to pre-loaded state (clears all accumulated pages), active queries re-fetch from scratch; `invalidateQueries` marks stale and refetches all accumulated pages which yields mixed-shape cache if API shape changed |
</phase_requirements>

---

## Summary

Phase 20 migrates `useAccountsInfinite` and `usePostsInfinite` from offset-based `useInfiniteQuery` (sending `page=1,2,3…`) to cursor-based `useInfiniteQuery` (sending `cursor=<opaque_string>`). The backend's Phase 39 will change the response envelope for accounts and posts from `{ accounts, pagination: { page, total_pages, … } }` to `{ accounts, next_cursor, has_more }`. The frontend must match this new shape.

The two plans map cleanly to two orthogonal concerns: (1) the hook + type migration (PAGE-01, PAGE-02), and (2) the mutation cache-management change from `invalidateQueries` to `resetQueries` (PAGE-03). The codebase already contains a working cursor pattern in `src/hooks/use-bonus.ts` and `src/types/bonus.ts` (`BonusRoundsResponse`), which provides a proven in-project reference for the cursor types and the `next_cursor / has_more` shape.

The migration is one-way and clean: the locked decision is cursor-only types with no backwards-compatibility shim. The accounts page (`src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx`) already uses `isFetchingNextPage` with `AccountCardSkeleton` for the next-page loading state, so the skeleton loading pattern for next-page fetches is already wired; only the hook internals change. The posts page is identical in structure.

**Primary recommendation:** Migrate `src/types/tracking.ts` (delete `Pagination`, add `CursorPagination`) and `src/hooks/use-tracking.ts` (fix `initialPageParam`, `getNextPageParam`, query builder functions) as one atomic task. Then, in a separate task, replace all `invalidateQueries` calls that target `['guild', guildId, 'accounts']` and `['guild', guildId, 'posts']` with `resetQueries` in: `use-tracking.ts`, `use-bulk-operations.ts`, `use-trash.ts`, and `use-guilds.ts`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | `^5.90.20` (installed) | Infinite query + cursor pagination + cache management | Already in project; v5 is current major; `useInfiniteQuery` with `initialPageParam` is the v5 cursor API |
| `react-intersection-observer` | `^10.0.2` (installed) | Sentinel element detection for infinite scroll trigger | Already wired in both pages (`useInView`); no change needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | `^5` (installed) | Type safety for cursor shapes | Replacing offset `Pagination` type with cursor-specific interface |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cursor-only types (locked) | Dual-shape union type | Rejected by user: dual-shape adds complexity, phase uses cursor-only from the start |
| `resetQueries` on mutation | `invalidateQueries` | `invalidateQueries` preserves all accumulated pages and re-fetches each — when page shapes change between cursor and offset this causes mixed-page cache; `resetQueries` clears all pages and restarts from `initialPageParam` |
| `useInfiniteQuery` | Manual accumulation pattern (like `useBonusRounds`) | `useBonusRounds` uses a manual accumulation `useEffect` + `useState` approach; this works but React Query's built-in `useInfiniteQuery` is the correct tool for this use case and already in use for accounts and posts |

**Installation:** No new packages required — all libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure

No structural changes needed. Files to modify:

```
src/
├── types/
│   └── tracking.ts         # Delete Pagination interface, add CursorPagination, update AccountsResponse + PostsResponse
└── hooks/
    ├── use-tracking.ts     # Update useAccountsInfinite + usePostsInfinite; update query builders; replace invalidateQueries → resetQueries for accounts/posts
    ├── use-bulk-operations.ts  # Replace invalidateQueries → resetQueries for accounts and posts query keys
    ├── use-trash.ts            # Replace invalidateQueries → resetQueries for accounts and posts query keys
    └── use-guilds.ts           # Replace invalidateQueries → resetQueries for accounts query key (line 291)
```

### Pattern 1: Cursor useInfiniteQuery (v5)

**What:** Pass `initialPageParam: null` so the first fetch sends no cursor. `getNextPageParam` extracts `next_cursor` from the last page — returns `undefined` (not `null`) when `has_more` is false to signal end-of-list. The query function sends `cursor` as a query param when `pageParam` is non-null.

**When to use:** Any list that the backend paginates with opaque cursor tokens, not page numbers.

**Example:**
```typescript
// Source: Context7 — TanStack Query v5 useInfiniteQuery docs
export function useAccountsInfinite(
    guildId: string,
    limit: number = 50,
    filters: AccountFilters = {}
) {
    return useInfiniteQuery({
        queryKey: ['guild', guildId, 'accounts', 'infinite', limit, filters],
        queryFn: async ({ pageParam }) => {
            const params = new URLSearchParams()
            params.set('limit', limit.toString())
            // Only set cursor when we have one (pageParam is null on first load)
            if (pageParam) params.set('cursor', pageParam)
            if (filters.search) params.set('search', filters.search)
            if (filters.platform) params.set('platform', filters.platform)
            if (filters.group) params.set('group', filters.group)
            const response = await fetchWithRetry(`/api/guilds/${guildId}/accounts?${params}`)
            if (!response.ok) throw new Error('Failed to fetch accounts')
            return response.json() as Promise<AccountsResponse>
        },
        initialPageParam: null as string | null,  // null = no cursor on first page
        getNextPageParam: (lastPage) =>
            lastPage.has_more ? lastPage.next_cursor : undefined,
        staleTime: 2 * 60 * 1000,
        enabled: !!guildId,
    })
}
```

### Pattern 2: resetQueries after mutation (PAGE-03)

**What:** After any mutation that changes the accounts or posts list (add, delete, bulk-delete, bulk-reassign, restore from trash), call `queryClient.resetQueries` targeting the infinite query key instead of `invalidateQueries`. This clears all accumulated pages and triggers a fresh fetch from `initialPageParam`.

**When to use:** Any mutation that adds, removes, or reorders items in an infinite-scrolled cursor list where the full page set cannot be re-validated incrementally.

**Example:**
```typescript
// Source: TanStack Query v5 reference — queryClient.resetQueries
// In mutation onSuccess (use-tracking.ts, use-bulk-operations.ts, use-trash.ts, use-guilds.ts):
queryClient.resetQueries({ queryKey: ['guild', guildId, 'accounts'] })
// Not: queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'accounts'] })
```

**Key difference from invalidateQueries:**
- `invalidateQueries`: marks all pages stale, re-fetches each accumulated page (pages 1–N) using their individual cursors — produces a mix of cursor and offset shapes if the backend switched formats
- `resetQueries`: removes accumulated pages from cache, resets query to `initialPageParam` state, re-fetches only the first page — starts clean

### Pattern 3: Cursor TypeScript types

**What:** Replace the offset-based `Pagination` interface with a cursor-based `CursorPagination` interface. Update response types accordingly.

**Example:**
```typescript
// DELETE:
export interface Pagination {
    page: number
    limit: number
    total: number
    total_pages: number
}

// ADD (mirrors existing BonusRoundsResponse pattern in src/types/bonus.ts):
export interface CursorPagination {
    next_cursor: string | null
    has_more: boolean
}

// UPDATE:
export interface AccountsResponse {
    accounts: Account[]
    next_cursor: string | null  // replaces pagination: Pagination
    has_more: boolean
}

export interface PostsResponse {
    posts: Post[]
    next_cursor: string | null
    has_more: boolean
}
```

### Pattern 4: Optimistic add/remove for accounts (Claude's discretion)

**What:** For `useAddAccount` and `useDeleteAccount`, use `onMutate` to immediately modify the infinite query cache (show item or hide item), then in `onSettled` call `resetQueries` to confirm with server state. On error in `onError`, restore the snapshot.

**When to use:** When the user decision is "item appears/disappears immediately, then re-fetch confirms."

**Example (add account — insert at top of first page):**
```typescript
// Source: TanStack Query v5 optimistic updates docs
onMutate: async (newAccountData) => {
    await queryClient.cancelQueries({ queryKey: ['guild', guildId, 'accounts'] })
    const previousData = queryClient.getQueriesData({ queryKey: ['guild', guildId, 'accounts'] })
    // Optimistically prepend to first page
    queryClient.setQueriesData(
        { queryKey: ['guild', guildId, 'accounts'] },
        (old: InfiniteData<AccountsResponse> | undefined) => {
            if (!old) return old
            return {
                ...old,
                pages: old.pages.map((page, i) =>
                    i === 0 ? { ...page, accounts: [optimisticAccount, ...page.accounts] } : page
                ),
            }
        }
    )
    return { previousData }
},
onError: (_err, _vars, context) => {
    if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) =>
            queryClient.setQueryData(queryKey, data)
        )
    }
},
onSettled: () => {
    queryClient.resetQueries({ queryKey: ['guild', guildId, 'accounts'] })
},
```

### Anti-Patterns to Avoid

- **Returning `null` from `getNextPageParam` instead of `undefined`:** In TanStack Query v5, `getNextPageParam` must return `undefined` (not `null`) to signal no more pages. Returning `null` will cause the query to treat `null` as a valid next page param and attempt an infinite fetch.
- **Keeping `page` in the query builder functions:** After migration, `buildAccountQuery` and `buildPostQueryExtended` must send `cursor` not `page`. Remove all `page` parameter logic from both builders.
- **Using `invalidateQueries` for infinite-scroll mutations:** With cursor pagination, `invalidateQueries` on an infinite query re-fetches all accumulated pages sequentially using their stored cursors. If the backend changed the response shape (removing `page`/`total_pages`), the re-fetch will fail or produce malformed data. Always use `resetQueries` for infinite query mutations.
- **Calling `resetQueries` on non-infinite queries:** `resetQueries` clears all cache data. For simple `useQuery` (non-infinite) lists like brands, the existing `invalidateQueries` is correct and should not be changed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cursor accumulation across pages | Manual `useState` + `useEffect` accumulation (like `useBonusRounds`) | `useInfiniteQuery` built-in `data.pages` array | `useInfiniteQuery` handles re-fetch-all-pages on stale, deduplication, and cursor tracking automatically |
| End-of-list detection | `cursor === null` check in component | `hasNextPage` from `useInfiniteQuery` return | `hasNextPage` is the canonical signal; derived from `getNextPageParam` returning `undefined` |
| Intersection-triggered pagination | Custom scroll event listener | `useInView` from `react-intersection-observer` (already installed and wired) | Already used in both pages; no change needed |

**Key insight:** The infinite scroll plumbing (sentinel div + `useInView` + `fetchNextPage` effect) is already wired and working in both pages. The migration only changes what the hook sends as query params and how it interprets the response envelope.

---

## Common Pitfalls

### Pitfall 1: Mixed-shape cache after invalidateQueries
**What goes wrong:** After a mutation (e.g., delete account), calling `invalidateQueries` on an infinite query causes React Query to re-fetch all accumulated pages using the stored `pageParams` array. If the backend already serves cursor responses but a cached page's `pageParam` is still `1` (from before the migration), the re-fetch will send `?page=1` to a cursor-only endpoint, producing a 400 or an empty result.
**Why it happens:** `invalidateQueries` preserves the `pageParams` array in the cache; `resetQueries` clears it.
**How to avoid:** Always use `resetQueries` for mutations that affect infinite-scroll lists.
**Warning signs:** Accounts or posts list shows duplicates or disappears entirely after add/delete.

### Pitfall 2: getNextPageParam returning null instead of undefined
**What goes wrong:** When `has_more` is false, if `getNextPageParam` returns `null`, React Query v5 treats `null` as a valid page param (since `initialPageParam: null` is valid). This causes an infinite fetch loop.
**Why it happens:** Developers may return `lastPage.next_cursor` directly without a fallback to `undefined`.
**How to avoid:** Always: `return lastPage.has_more ? lastPage.next_cursor : undefined`
**Warning signs:** Network tab shows repeated requests to `?cursor=null` or `?cursor=` after reaching end of list.

### Pitfall 3: Query builder functions still sending `page=` parameter
**What goes wrong:** After migrating `initialPageParam` from `1` to `null`, the query builder functions (`buildAccountQuery`, `buildPostQueryExtended`) still have `params.set('page', page.toString())`. When `pageParam` is `null`, this sends `?page=null` to the backend.
**Why it happens:** The builder functions are updated separately from the `useInfiniteQuery` config.
**How to avoid:** In the same commit, remove `page` from both builder functions and add conditional `cursor` setting.
**Warning signs:** TypeScript error `Argument of type 'string | null' is not assignable to parameter of type 'string'` when calling `.toString()` on a `string | null`.

### Pitfall 4: Scope of resetQueries — infinite vs. simple queries share key prefix
**What goes wrong:** `queryClient.resetQueries({ queryKey: ['guild', guildId, 'accounts'] })` matches BOTH the infinite query (`['guild', guildId, 'accounts', 'infinite', ...]`) AND the non-infinite `useAccounts` hook (`['guild', guildId, 'accounts', page, limit]`). The non-infinite `useAccounts` query has no `initialPageParam`, so resetting it behaves like `removeQueries` — data disappears until re-fetch.
**Why it happens:** `resetQueries` matches by prefix, same as `invalidateQueries`.
**How to avoid:** Since `useAccounts` (non-infinite, offset-based) and `useAccountsInfinite` share the same key prefix, be aware that `resetQueries` on `['guild', guildId, 'accounts']` will reset both. After the migration, `useAccounts` is no longer actively used on the accounts page (replaced entirely by the infinite query), but if it is used elsewhere, add `{ exact: false }` or use the full key prefix `['guild', guildId, 'accounts', 'infinite']` for infinite-specific resets.
**Warning signs:** Accounts count in guild header flickers or disappears after add/delete mutation.

### Pitfall 5: Stale/invalid cursor — backend returns 400 or 422
**What goes wrong:** If the user leaves the page open for a long time, stored cursors may expire on the backend. When `fetchNextPage()` fires with an expired cursor, the backend returns a 4xx error.
**Why it happens:** Cursor tokens are often time-limited or invalidated on data changes.
**How to avoid:** The locked decision mandates: "Stale/invalid cursor: show 'List has changed' message with a reset button to refresh from the start." Detect this by catching the error in the `queryFn` and re-throwing with a distinguishable error code, then in the component render an inline message at the bottom with a reset button.
**Warning signs:** Infinite scroll stops loading new items after long idle periods.

---

## Code Examples

Verified patterns from official sources and in-project patterns:

### Cursor useInfiniteQuery with null initialPageParam (v5)
```typescript
// Source: TanStack Query v5 — Context7 /tanstack/query
const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
} = useInfiniteQuery({
    queryKey: ['guild', guildId, 'accounts', 'infinite', limit, filters],
    queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams({ limit: limit.toString() })
        if (pageParam) params.set('cursor', pageParam)
        // ... filters
        const response = await fetchWithRetry(`/api/guilds/${guildId}/accounts?${params}`)
        if (!response.ok) throw new Error('Failed to fetch accounts')
        return response.json() as Promise<AccountsResponse>
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
        lastPage.has_more ? lastPage.next_cursor : undefined,
    staleTime: 2 * 60 * 1000,
    enabled: !!guildId,
})
```

### resetQueries after mutation (PAGE-03)
```typescript
// Source: TanStack Query v5 reference — queryClient.resetQueries
// In onSuccess of add/delete account mutations:
queryClient.resetQueries({ queryKey: ['guild', guildId, 'accounts'] })
// Reset clears pageParams array and all accumulated pages.
// Active components re-fetch from initialPageParam (null = first page).
```

### CursorPagination TypeScript types (mirrors existing BonusRoundsResponse in src/types/bonus.ts)
```typescript
// In src/types/tracking.ts — mirrors src/types/bonus.ts BonusRoundsResponse pattern
export interface CursorPagination {
    next_cursor: string | null
    has_more: boolean
}

export interface AccountsResponse {
    accounts: Account[]
    next_cursor: string | null
    has_more: boolean
}

export interface PostsResponse {
    posts: Post[]
    next_cursor: string | null
    has_more: boolean
}
```

### Stale cursor error detection
```typescript
// In queryFn — detect stale/invalid cursor (backend returns 400/422):
const response = await fetchWithRetry(...)
if (response.status === 400 || response.status === 422) {
    const err = new Error('Cursor expired or invalid')
    ;(err as Error & { code: string }).code = 'CURSOR_INVALID'
    throw err
}
```

```typescript
// In component — detect and surface reset UI:
const isCursorInvalid = isError && (error as Error & { code?: string })?.code === 'CURSOR_INVALID'

// Render at list bottom:
{isCursorInvalid && (
    <div className="text-center py-4 text-sm text-gray-400">
        <p>List has changed.</p>
        <button onClick={() => queryClient.resetQueries({ queryKey: ['guild', guildId, 'accounts'] })}>
            Refresh from start
        </button>
    </div>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `initialPageParam: 1` (page number) | `initialPageParam: null` (no cursor = first page) | This phase | Hook sends `cursor=<token>` instead of `page=<number>` |
| `getNextPageParam` uses `pagination.page >= pagination.total_pages` | `getNextPageParam` uses `lastPage.has_more` | This phase | Simpler, works regardless of total count |
| `pagination: { page, limit, total, total_pages }` in response | `next_cursor: string \| null, has_more: boolean` in response | Backend Phase 39 | Lighter payload; no total count needed |
| `invalidateQueries` for all mutations | `resetQueries` for infinite-scroll mutations only | This phase | Prevents stale-page accumulation after data changes |

**Deprecated/outdated after this phase:**
- `Pagination` interface in `src/types/tracking.ts`: replaced by inline fields on `AccountsResponse` / `PostsResponse`
- `page` parameter in `buildAccountQuery` and `buildPostQueryExtended`: removed
- `total_pages` comparison in `getNextPageParam`: removed

---

## Open Questions

1. **Backend Phase 39 deploy status**
   - What we know: Phase 20 is gated on backend Phase 39; STATE.md confirms "Phase 20 (Cursor pagination): Blocked until backend Phase 39 is deployed"
   - What's unclear: Whether backend Phase 39 is live yet; if not, the hook migration cannot be tested against real responses
   - Recommendation: Proceed with migration using the known cursor shape from `BonusRoundsResponse` as the model; use the dashboard proxy (route.ts passes queryString through transparently) — no proxy changes needed since cursor is just a query param

2. **Does `useAccounts` (non-infinite, offset) remain in use after migration?**
   - What we know: `useAccountsInfinite` is the hook used on the accounts page; `useAccounts` (offset-based, single-page `useQuery`) exists in `use-tracking.ts` but the accounts page does not import it
   - What's unclear: Whether any other page imports `useAccounts` directly
   - Recommendation: Grep for `useAccounts` usages before removing the non-infinite hook; if unused, delete it as part of plan 20-01 to avoid dead code with stale offset types

3. **Do bulk mutations need optimistic updates too?**
   - What we know: The locked decision says optimistic add/remove for tracked account; bulk operations are separate mutations (bulk-delete, bulk-reassign)
   - What's unclear: Whether bulk mutations need the same optimistic treatment
   - Recommendation: Bulk operations should use `resetQueries` on success (PAGE-03) without optimistic updates — bulk operations touch many items and the risk of partial rollback is high; the list will visually reset after completion

---

## Validation Architecture

> workflow.nyquist_validation is not present in `.planning/config.json` — skipping Validation Architecture section.

*(The config.json has `workflow.research: true` and `workflow.verifier: true` but no `nyquist_validation` key — treating as false/absent.)*

---

## Sources

### Primary (HIGH confidence)
- `/tanstack/query` (Context7) — `useInfiniteQuery` cursor pagination, `initialPageParam`, `getNextPageParam`, `resetQueries` vs `invalidateQueries`, optimistic updates with `onMutate`/`onError`
- `src/types/bonus.ts` — in-project precedent for `{ next_cursor: string | null, has_more: boolean }` shape
- `src/hooks/use-bonus.ts` — in-project manual cursor accumulation pattern (showing what `useInfiniteQuery` replaces)
- `src/hooks/use-tracking.ts` — existing `useAccountsInfinite` and `usePostsInfinite` implementations to be migrated
- `src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx` — existing infinite scroll wiring (`useInView` + `isFetchingNextPage` + skeleton)

### Secondary (MEDIUM confidence)
- TanStack Query v5 docs (via Context7): `queryClient.resetQueries` API reference confirms it resets to `initialPageParam` and re-fetches active queries

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use; React Query v5 docs verified via Context7
- Architecture: HIGH — existing in-project cursor pattern (`use-bonus.ts`) provides exact reference; `useInfiniteQuery` cursor pattern verified in official docs
- Pitfalls: HIGH — `null` vs `undefined` in `getNextPageParam` is documented behavior; `resetQueries` vs `invalidateQueries` distinction verified in official docs; remaining pitfalls derived from direct code inspection

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (TanStack Query v5 is stable; cursor pattern is well-established)
