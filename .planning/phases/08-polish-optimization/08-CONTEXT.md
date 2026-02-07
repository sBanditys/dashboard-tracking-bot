# Phase 8: Polish & Optimization - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the dashboard production-ready with performance tuning, error resilience, and edge case handling. No new features — this phase polishes everything built in Phases 1-7 for real-world usage. Success criteria: 2s initial load on 3G, instant page transitions, smooth 1000+ item rendering, graceful error handling, and complete edge case coverage.

</domain>

<decisions>
## Implementation Decisions

### Loading & Perceived Speed
- Initial load approach: Claude's discretion (skeleton-first vs progressive reveal)
- Page priority: All pages optimized equally — no priority ordering
- Route transitions: Prefetch where possible + purple-themed progress bar (accent-purple) when data isn't ready
- Avatar optimization: Lazy load Discord avatars with blur-up placeholders, proper sizing
- Code splitting: Claude's discretion on splitting strategy
- Progress bar style: Branded accent-purple thin bar at top of viewport (like NProgress but themed)
- Prefetching: Click-only for guild switcher (no hover prefetch)
- Skeleton placeholders: Shaped skeletons matching real card layout (avatar circle, text lines, badges)

### Error Handling UX
- API unreachable: Toast notification + continue showing cached/stale data
- Mutation failures: Form validation errors shown inline, action failures (delete, save) as toast notifications
- Permission revocation: Show overlay on current page explaining access was revoked, with link to guild list
- Session expiry: Claude's discretion on best approach

### Large Data Performance
- List virtualization: Claude's discretion based on current implementation
- Search: Move search to server-side for better performance on large datasets
- Chart aggregation: Server-side pre-aggregation for large time ranges (e.g., weekly buckets for 90-day)
- Bulk operation limit: Cap at 100 items per bulk operation
- Cache management: Set gcTime and max entry limits to prevent memory growth in long sessions
- Scroll memory: Keep all loaded pages in DOM (don't unload off-screen pages)
- Bundle analysis: Claude's discretion
- Request deduplication: Claude's discretion (React Query may already handle this)
- SSE lifecycle: Claude's discretion on tab visibility behavior
- Optimistic updates: Yes, for all mutations — show change immediately, rollback on error
- Loaded count display: Show "50 accounts" style count (no total server count)
- Rate limit handling: Auto-retry with exponential backoff on 429 responses
- Request throttling: Both layers — throttle outgoing requests AND handle 429s as safety net
- Stale data strategy: Serve cached data immediately, refresh in background (stale-while-revalidate)

### Edge Case Behaviors
- Browser back/forward: Preserve everything — scroll position, active filters, search query, expanded cards
- Unsaved changes: Custom styled modal matching dashboard design: "You have unsaved changes. Save or discard?"
- Expired exports: Show expired badge in history table, disable download — user creates new export manually
- Zero guilds: Simple clean message: "You don't have access to any servers"
- Responsive resizing: CSS transitions on layout changes for smooth reflow
- Keyboard shortcuts: Common shortcuts — Escape for modals, Ctrl+K for search, keyboard navigation in lists
- Offline detection: Show persistent banner when navigator.onLine is false, auto-dismiss on reconnect
- Concurrent edits: Stale data warning — if data changed since page load, warn before saving: "Settings were updated. Reload or overwrite?"
- Toast management: Stack up to 3 toasts, oldest dismissed first
- Form validation: Hybrid — validate on submit first time, then validate on blur after first attempt
- Focus trapping: Claude's discretion (audit existing Headless UI behavior)

### Claude's Discretion
- Initial load approach (skeleton-first vs progressive reveal)
- Code splitting strategy (aggressive vs heavy-pages-only)
- Session expiry handling flow
- List virtualization decision
- Bundle analysis approach
- Request deduplication strategy
- SSE tab-visibility lifecycle
- Focus trapping audit and fixes

</decisions>

<specifics>
## Specific Ideas

- User experienced rate limiting causing pages to stop loading — request throttling and 429 handling is a real pain point, not theoretical
- Progress bar must use the accent-purple brand color (matching existing theme)
- Stale-while-revalidate pattern is critical — pages should never show loading state after first visit

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-polish-optimization*
*Context gathered: 2026-02-07*
