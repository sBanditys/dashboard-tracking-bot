# Phase 3: Tracking Data Display - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Display tracked accounts, posts, and brands within a selected guild. Users can view, search, and filter their tracked content with pagination. This phase is read-only — adding, editing, or removing tracked items belongs in Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Layout style
- Card-based layout for accounts and posts (not tables or lists)
- Account cards show: platform, username, post count, status
- Post cards show: account, timestamp, preview snippet of content
- Cards are clickable — click to expand inline and show full content
- No separate detail pages; expansion happens in place

### Search & filtering
- Sticky filter bar at top of each list (stays visible when scrolling)
- Instant filtering as you type (debounced, no submit button)
- Key filters: platform dropdown + date range picker
- Filter UI style: Claude's discretion (dropdowns vs chips based on filter count)

### Empty states
- Empty lists show illustration + guidance text + CTA button
- CTA button links to docs/help (Phase 3 is read-only, no add functionality yet)
- Filtered "no results" is distinct: shows "No results for [query]" with clear filters option
- Illustration style: Claude's discretion (full illustrations vs icons)

### Pagination behavior
- Infinite scroll (not page numbers or load more button)
- Scroll-to-top button appears when scrolled down
- Skeleton cards as loading indicator while fetching more
- Page size selector: 25, 50, or 100 items per batch (user choice)

### Claude's Discretion
- Filter component style (dropdowns vs chips)
- Empty state illustration style (full illustrations vs icons)
- Exact skeleton card design
- Card expansion animation
- Scroll-to-top button placement and appearance

</decisions>

<specifics>
## Specific Ideas

No specific product references mentioned — open to standard patterns that match the dark theme established in Phase 1.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-tracking-data-display*
*Context gathered: 2026-01-30*
