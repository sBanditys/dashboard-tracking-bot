---
phase: 20-cursor-pagination-migration
plan: 02
subsystem: frontend-hooks
tags: [react-query, infinite-scroll, optimistic-updates, cache-management]
dependency_graph:
  requires: [20-01]
  provides: [optimistic-account-mutations, resetQueries-migration]
  affects: [use-tracking, use-bulk-operations, use-trash, use-guilds, use-import]
tech_stack:
  added: []
  patterns: [optimistic-updates, onMutate-rollback, resetQueries-for-infinite]
key_files:
  modified:
    - src/hooks/use-tracking.ts
    - src/hooks/use-bulk-operations.ts
    - src/hooks/use-trash.ts
    - src/hooks/use-guilds.ts
    - src/hooks/use-import.ts
decisions:
  - "resetQueries used for all infinite list mutations (accounts, posts) to prevent mixed-shape cache pages with stale cursors"
  - "invalidateQueries kept for non-infinite queries (guild details, brands, trash) — not affected by cursor shape issue"
  - "No success toast for normal add/delete account operations — optimistic list update IS the feedback (per locked decision)"
  - "Retry-success toast ('Changes saved') kept for operations that went through retry path"
metrics:
  duration: 2m 14s
  completed: 2026-02-23
  tasks_completed: 2
  files_modified: 5
---

# Phase 20 Plan 02: Optimistic Updates and resetQueries Migration Summary

Replaced invalidateQueries with resetQueries for all mutations affecting infinite scroll lists (accounts/posts), and added optimistic update lifecycle (onMutate/onError/onSettled) to useAddAccount and useDeleteAccount in use-tracking.ts.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add optimistic updates to useAddAccount/useDeleteAccount and switch to resetQueries | 9b2ec5c | src/hooks/use-tracking.ts |
| 2 | Replace invalidateQueries with resetQueries in remaining mutation hooks | ac1923a | src/hooks/use-bulk-operations.ts, use-trash.ts, use-guilds.ts, use-import.ts |

## What Was Built

### Task 1: Optimistic account mutations (use-tracking.ts)

**useDeleteAccount** received full optimistic update lifecycle:
- `onMutate`: cancels outgoing refetches, snapshots all `['guild', guildId, 'accounts']` queries, then filters out the deleted account from all pages in the infinite cache
- `onError`: restores the previous cache snapshot from the `context.previousData` collected in `onMutate`
- `onSuccess`: removed normal success toast (optimistic removal IS the feedback); kept retry-path `toast.success('Changes saved')`; kept `invalidateQueries` for `['guild', guildId]` (account_count, non-infinite)
- `onSettled`: calls `resetQueries({ queryKey: ['guild', guildId, 'accounts'] })` — always re-fetches from page 1 regardless of success/failure to ensure cursor consistency

**useAddAccount** received the same lifecycle:
- `onMutate`: creates an `optimisticAccount` object with a temporary `optimistic-${Date.now()}` id and prepends it to the first page of the infinite cache
- `onError`: restores previous cache snapshot
- `onSuccess`: removed normal success toast; kept retry toast; kept `invalidateQueries` for guild details and brands (non-infinite)
- `onSettled`: `resetQueries` for accounts infinite list

`useMutation` generics updated to `useMutation<ResponseType, Error, ParamType, { previousData: [QueryKey, unknown][] }>` so `context` type flows correctly to `onError`.

### Task 2: resetQueries migration across remaining hooks

All five files migrated according to the rule: **only change invalidateQueries to resetQueries for query keys that are infinite scroll lists**.

| File | Mutation | Changed |
|------|----------|---------|
| use-bulk-operations.ts | useBulkDelete onSuccess | accounts/posts → resetQueries |
| use-bulk-operations.ts | useBulkReassign onSuccess | accounts → resetQueries |
| use-trash.ts | useRestoreItem onSuccess | accounts/posts → resetQueries |
| use-guilds.ts | useDeleteAccount onSuccess | accounts → resetQueries |
| use-import.ts | useConfirmImport (after stream) | accounts → resetQueries |

Non-infinite queries in all files left unchanged:
- `['guild', guildId]` (guild details, account_count) — still `invalidateQueries`
- `['guild', guildId, 'brands']` — still `invalidateQueries`
- `['guild', guildId, 'trash']` — still `invalidateQueries`

## Decisions Made

**resetQueries vs invalidateQueries for infinite lists:**
`invalidateQueries` on an infinite query re-fetches every accumulated page using its stored cursor chain. After a mutation, the earlier cursors may be stale or point to different offsets. `resetQueries` clears all accumulated pages and re-fetches only page 1 (initialPageParam null), guaranteeing a clean cursor chain.

**Optimistic update strategy for add:**
Prepend to first page with a temporary id. On settle, resetQueries clears the optimistic item and fetches the real server data. This gives instant visual feedback with zero stale-state risk.

**Optimistic update strategy for delete:**
Filter the account from all pages. On settle, resetQueries re-fetches from scratch. On error, the previousData snapshot restores the full original state.

**No toast for normal add/delete:**
Locked decision from planning: the optimistic list animation IS the user feedback for account add/delete. Toast notifications only fire on the retry-success path.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

All success criteria confirmed:

1. `npx tsc --noEmit` — PASSED, zero TypeScript errors
2. `grep -rn "invalidateQueries.*accounts" src/hooks/` — returns no results (all migrated)
3. `grep -rn "invalidateQueries.*posts" src/hooks/` — returns no results (all migrated)
4. `grep -rn "resetQueries" src/hooks/` — 9 entries across use-tracking.ts, use-bulk-operations.ts, use-trash.ts, use-guilds.ts, use-import.ts
5. `grep -n "onMutate" src/hooks/use-tracking.ts` — lines 178 and 283 (useDeleteAccount and useAddAccount)

## Self-Check: PASSED

Files exist:
- src/hooks/use-tracking.ts — FOUND
- src/hooks/use-bulk-operations.ts — FOUND
- src/hooks/use-trash.ts — FOUND
- src/hooks/use-guilds.ts — FOUND
- src/hooks/use-import.ts — FOUND

Commits exist:
- 9b2ec5c — Task 1 commit
- ac1923a — Task 2 commit
