# Phase 6: Analytics - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can see usage metrics and activity insights for their selected guild. This includes counter cards, a time-series submissions graph, an engagement leaderboard, and an activity timeline. The analytics page is a read-only view — no mutations or configuration changes happen here.

</domain>

<decisions>
## Implementation Decisions

### Dashboard layout
- Summary on guild overview: counter cards + mini sparkline graph + top-5 leaderboard preview
- Dedicated Analytics page in sidebar for full deep-dive
- Full analytics page layout: counters across top → graph + leaderboard side-by-side in middle → activity timeline below
- Global time range selector at top (7d / 30d / 90d) that affects all sections by default
- Individual sections can override the global time range if needed

### Graph presentation
- Area chart (line with filled area underneath) for main submissions/posts graph
- Time granularity auto-adjusts by range: daily for 7d, daily for 30d, weekly for 90d
- Single aggregated line for all post types (no breakdown by content type)
- Hover tooltips showing exact count and date
- Click a data point to navigate to posts from that day/week

### Activity timeline
- Grouped by day (date headers: Today, Yesterday, Jan 28, etc.)
- Shows posts captured + config changes (settings changes, account adds/removes)
- Infinite scroll for loading more events (consistent with tracking pages pattern)
- Events link to the related item (post, account, setting) — timeline doubles as navigation

### Counter cards
- Metrics shown: total tracked accounts, total posts captured, total brands + breakdown by platform
- Trend indicators: delta vs previous period (e.g., "+12 this week", "+15%")
- Platform split shows count per platform (e.g., 12 Twitter, 5 Instagram)

### Leaderboard
- Ranks tracked accounts by engagement metrics (likes, views, etc.)
- Shows top 5 with "View all" link to expanded full ranking
- Respects the global time range selector (or can override)

### Claude's Discretion
- Charting library choice (Recharts, Chart.js, etc.)
- Exact card styling and spacing
- Loading skeleton designs for charts
- Empty state illustrations
- How platform split is visualized within counter cards (badges, small bars, icons)
- Mini sparkline implementation on guild overview
- "View all" leaderboard expanded view design

</decisions>

<specifics>
## Specific Ideas

- User specifically mentioned "weekly submission graph" — the area chart should feel like a core feature, not an afterthought
- Time ranges: 7 days, 30 days, 90 days (user specified these)
- Leaderboard by engagement — user wants to see which accounts are performing best
- "Monthly videos" was mentioned — while the graph is single-line (no type breakdown), the data model should support filtering by content type for future phases
- Guild overview should show a compact preview (counters + mini graph + top-5 leaderboard) that entices users to click through to the full analytics page

</specifics>

<deferred>
## Deferred Ideas

- Content type breakdown in graph (videos vs images vs text) — could be a future enhancement
- Per-brand analytics view — potential future phase
- Export analytics data (CSV/PDF reports) — belongs in Phase 7 (Data Management)

</deferred>

---

*Phase: 06-analytics*
*Context gathered: 2026-02-06*
