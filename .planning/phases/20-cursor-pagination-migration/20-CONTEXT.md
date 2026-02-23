# Phase 20: Cursor Pagination Migration - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate accounts and posts infinite scroll from offset-based to cursor-based pagination to match the backend's cursor API (backend Phase 39). Covers hook migration, TypeScript type updates, cache management on mutations, and loading/error states. No new list features or capabilities.

</domain>

<decisions>
## Implementation Decisions

### Loading experience
- Skeleton rows (matching item shape) when fetching the next page — not a spinner
- Subtle end-of-list message (e.g., "You've reached the end") when no more items exist
- No toast or notification for add/remove mutations — the optimistic list change IS the feedback

### List reset behavior
- Optimistic updates for add/remove tracked account — item appears/disappears immediately, then re-fetch confirms
- On mutation, reset the infinite query from the beginning (no mixed-shape cache pages)
- No toast confirmation — list change only

### Error handling
- Auto-retry next-page fetches 2-3 times on failure, then show inline retry button at the bottom
- Stale/invalid cursor: show "List has changed" message with a reset button to refresh from the start
- Optimistic rollback UX: Claude's discretion

### Transition approach
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

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-cursor-pagination-migration*
*Context gathered: 2026-02-23*
