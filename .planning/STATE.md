# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2025-01-24)

**Core value:** Server admins can access their tracking data and bot status through a reliable web interface — independent of bot uptime.
**Current focus:** Phase 6 Analytics - Complete, Phase 7 next

## Current Position

Phase: 7 of 8 (Data Management)
Plan: 2 of 5 complete (07-01 and 07-02 complete)
Status: In progress — API proxy routes complete
Last activity: 2026-02-07 — Completed 07-02-PLAN.md

Progress: [████████░░] ~81% (31 plans complete across 7 phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 31
- Average duration: 1m 58s (code plans only, excluding verification)
- Total execution time: ~60m 47s

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 5 | 17m 25s | 4m 26s |
| 02 | 2 | 1m 35s | 48s |
| 03 | 5 | 10m 44s | 2m 09s |
| 04 | 3 | 4m 24s | 1m 28s |
| 05 | 6 | 13m 04s | 2m 11s |
| 06 | 5 | 7m 38s | 1m 32s |
| 07 | 2 | 2m 59s | 1m 30s |

**Recent Trend:**
- Last 5 plans: 06-03 (1m 33s), 06-04 (1m 45s), 06-05 (1m 25s), 07-01 (1m 30s), 07-02 (1m 29s)
- Trend: Maintaining exceptional velocity - 6 consecutive plans under 2min, avg 1m 29s

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Separate repository from bot — Dashboard stays up when bot crashes
- Tailwind without component library — Full design control for SaaS branding
- API as single gateway — No direct DB access from dashboard, security boundary enforced
- SSE for real-time updates — Simpler than WebSockets for status updates

**From 01-01 execution:**
- DEV-001: Class-based dark mode strategy (enables programmatic theme control)
- DEV-002: React Query 5-minute stale time (reduces API calls)
- DEV-003: No component library (full design control per PROJECT.md)

**From 01-02 execution:**
- DEV-004: Server Components for legal pages (static content, better SEO)
- DEV-005: Placeholder values [Company Name], [Contact Email] for easy updates
- DEV-006: Auto-display current date for legal page timestamps

**From 01-03 execution:**
- DEV-007: API route proxy pattern for auth (backend owns OAuth secret)
- DEV-008: 30-day cookie expiry (balances UX and security)
- DEV-009: Suspense boundary for useSearchParams (Next.js 14 requirement)

**From 01-04 execution:**
- DEV-010: Always-expanded sidebar (per CONTEXT.md, no collapse to icons)
- DEV-011: Logout confirmation in dropdown (quick inline confirmation vs modal)
- DEV-012: Theme toggle in topbar (frequent action, accessible placement)

**From 02-01 execution:**
- DEV-013: Headless UI Menu for ARIA compliance (automatic keyboard nav, focus management)
- DEV-014: py-3 touch targets for mobile accessibility
- DEV-015: Auto-hide switcher when no guilds (clean UX)

**From 03-01 execution:**
- DEV-016: Generic useDebounce over lodash.debounce (smaller bundle, React-native pattern)
- DEV-017: Link icon fallback for unknown platforms (graceful handling)
- DEV-018: Separate EmptyState vs NoResults (different UX for no data vs no matches)

**From 03-03 execution:**
- DEV-019: Separate query builder helpers for filter params (consistent pattern)
- DEV-020: PostFiltersExtended extends PostFilters with search (type-safe extension)

**From 03-04 execution:**
- DEV-021: CSS Grid expansion animation (grid-rows-[1fr]/[0fr] for smooth expand/collapse)
- DEV-022: Skeleton count prop pattern (render multiple loading cards easily)
- DEV-023: Status color mapping standardized (green/yellow/blue/red/gray)

**From 03-05 execution:**
- DEV-024: StatusSelect as Headless UI Listbox (consistent accessibility with PlatformSelect)
- DEV-025: Separate empty state vs no results (different UX for data absence vs filter mismatch)
- DEV-026: Inline SVG icons for empty states (no additional icon library needed)

**From 04-01 execution:**
- DEV-027: Native EventSource over @microsoft/fetch-event-source (simpler, no extra dependency)

**From 04-03 execution:**
- DEV-028: Backend SSE endpoint added to API (GET /guilds/:guildId/status/stream)

**From 05-01 execution:**
- DEV-029: Reusable ConfirmationModal with configurable confirmLabel prop
- DEV-030: Cache invalidation invalidates both specific list and parent guild

**From 05-02 execution:**
- DEV-031: Channel combobox filters to text channels only (type === 0)
- DEV-032: Show permission warning inline for channels without bot access

**From 05-03 execution:**
- DEV-033: Guild-context navigation pattern (regex pathname matching)
- DEV-034: Action humanization strategy (account.create → Created account)
- DEV-035: Diff display color scheme (red strikethrough → green)

**From 05-04 execution:**
- DEV-039: Auto-save on channel change instead of save button (immediate feedback, better UX)
- DEV-040: Inline status indicators with 3-second auto-clear (saving/success/error)
- DEV-041: Settings component receives data as props (parent handles fetching, avoids duplicate queries)

**From 05-05 execution:**
- DEV-036: Purple submit buttons for modals (bg-accent-purple for primary actions)
- DEV-037: Username @ prefix stripping (handles both formats automatically)
- DEV-038: Slug auto-generation (optional field, backend generates from label)

**From 05-06 execution:**
- DEV-042: Delete button placement varies by context (card header for accounts, next to expand for brands)
- DEV-043: Delete buttons use red color scheme (text-red-500 hover:text-red-400)
- DEV-044: Modal integration pattern: state → button → modal at component end

**From 06-02 execution:**
- DEV-045: Trend delta calculation with previousValue > 0 guard
- DEV-046: Platform name capitalization in breakdown badges
- DEV-047: TimeRange type defined locally for Wave 1 parallel execution

**From 06-01 execution:**
- DEV-052: Analytics staleTime by data volatility (5min for analytics/leaderboard, 1min for activity)
- DEV-053: maxPages limit on infinite queries (prevent memory bloat)
- DEV-054: TimeRange as union type (7 | 30 | 90)

**From 06-02 execution:**
- DEV-045: Trend delta calculation with previousValue > 0 guard
- DEV-046: Platform name capitalization in breakdown badges
- DEV-047: TimeRange type defined locally for Wave 1 parallel execution

**From 06-03 execution:**
- DEV-048: Custom tooltip interface instead of Recharts TooltipProps for better type safety
- DEV-049: Explicit h-[300px] container height per Recharts best practices
- DEV-050: Empty state for zero data (centered message instead of empty chart)
- DEV-051: MiniSparkline returns null for insufficient data instead of rendering error state

**From 06-04 execution:**
- DEV-055: Medal colors for top 3 leaderboard ranks (gold/silver/bronze visual hierarchy)
- DEV-056: Event type to page link mapping (post_captured → /posts, account_added → /accounts)
- DEV-057: Day grouping uses reduce pattern for O(n) grouping

**From 06-05 execution:**
- DEV-058: Default 30-day range for analytics page (balances trends with data volume)
- DEV-059: Platform Split counter with breakdown badges (shows distribution inline)
- DEV-060: Analytics preview after Quick Access cards (maintains primary action flow)

**From 07-01 execution:**
- DEV-061: ID-based shift selection over index-based (stable range selection on filtered/sorted lists)
- DEV-062: Set<string> for selectedIds (O(1) lookup vs O(n) for array includes)
- DEV-063: Three color variants for TypeToConfirmModal (danger/warning/default for different operations)
- DEV-064: Case-sensitive confirmation text (forces user attention, "12" not "twelve")

**From 07-02 execution:**
- DEV-065: SSE proxy pattern reuse for export progress (consistent streaming implementation from status/stream)
- DEV-066: Status code forwarding for bulk operations (frontend needs to distinguish 200 vs 207 Multi-Status for partial failures)

### Phase 1 Deliverables

Completed foundation ready for Phase 2:

- **Authentication:** Discord OAuth flow, JWT cookies, middleware protection
- **Dashboard Shell:** Sidebar, topbar, mobile drawer, breadcrumbs
- **Theme System:** Dark mode default, toggle with persistence
- **Legal Pages:** Terms of Service, Privacy Policy
- **User Hooks:** useUser, useLogout for session management
- **API Client:** Type-safe wrapper for backend calls

### Phase 2 Deliverables

Completed guild management ready for Phase 3:

- **Guild List:** Cards showing accessible guilds with status indicators
- **Guild Detail:** Bot status, usage stats, brands preview
- **Guild Switcher:** Accessible dropdown in topbar for multi-guild navigation
- **API Integration:** Proxy routes for backend guild data with permission filtering

### Phase 3 Deliverables

Completed tracking data display (5/6 plans, pending verification):

- **Foundation:** PlatformIcon, Skeleton, useDebounce, EmptyState, NoResults
- **Filter Components:** PlatformSelect, StatusSelect, DateRangeFilter, PageSizeSelect
- **Data Hooks:** useAccountsInfinite, usePostsInfinite with infinite scroll
- **Card Components:** AccountCard, PostCard with expandable details, skeletons
- **Page Integration:** Accounts, Posts, Brands pages refactored with cards and infinite scroll

### Phase 4 Deliverables (Complete)

Completed real-time updates:

- **SSE Infrastructure:** Proxy route and useSSE hook with exponential backoff
- **Status Integration:** useGuildStatusRealtime hook, BotStatus with connection states
- **Backend SSE:** GET /guilds/:guildId/status/stream endpoint added to API
- **Verified:** All 4 success criteria met (real-time indicator, 5s updates, last seen, independent uptime)

### Phase 5 Deliverables (Complete)

Configuration mutations and settings UI:

- **Delete Mutations (05-01):** useDeleteAccount, useDeleteBrand hooks with confirmation modal, cache invalidation
- **Channel Selection (05-02):** ChannelSelect combobox with search, text-channel filtering, permission warnings
- **Audit Log (05-03):** Complete vertical slice with types, hook, API, table with filters, Activity page
- **Guild Settings (05-04):** GuildSettingsForm with ChannelSelect dropdowns, auto-save, useUpdateGuildSettings mutation
- **Create Modals (05-05):** AddAccountModal, AddBrandModal with validation, cache invalidation
- **UI Integration (05-06):** Accounts and Brands pages with Add/Delete buttons, modal wiring, complete CRUD flow
- **Type Infrastructure:** Channel and ChannelsResponse types, useGuildChannels hook, audit types

### Phase 6 Deliverables (Complete)

Analytics dashboard with metrics and visualizations:

- **Foundation (06-01):** Analytics types (AnalyticsData, LeaderboardResponse, ActivityResponse), three API proxy routes, React Query hooks (useAnalytics, useAnalyticsLeaderboard, useAnalyticsActivity), Recharts dependency
- **Counter Components (06-02):** CounterCard with trend indicators and platform breakdown, TimeRangeSelector toggle (7d/30d/90d)
- **Chart Components (06-03):** AnalyticsChart area chart with Recharts, purple gradient, dark theme tooltips, click navigation, MiniSparkline for guild overview
- **Leaderboard & Timeline (06-04):** Leaderboard with medal-colored top 3 ranks, "View all" link, ActivityTimeline with day grouping (Today/Yesterday/date), infinite scroll, clickable event navigation
- **Page Assembly (06-05):** Full analytics page at /guilds/:id/analytics with complete layout (counters → chart+leaderboard → timeline), sidebar Analytics link, guild overview preview with sparkline and top 5 leaderboard


### Phase 7 Deliverables (In Progress)

Data management with export and bulk operations:

- **Foundations (07-01):** Export types (CSV/JSON/XLSX), bulk operation types (delete/reassign/export), useShiftSelection hook with ID-stable range selection, TypeToConfirmModal with three color variants
- **API Proxy Routes (07-02):** 7 routes for exports (POST create, GET history/status, GET SSE progress), bulk operations (POST delete/reassign), trash management (GET list, POST restore, DELETE permanent)

### Pending Todos

None yet.

### Blockers/Concerns

None - execution proceeding smoothly.

## Session Continuity

Last session: 2026-02-07 15:39 UTC
Stopped at: Completed 07-02-PLAN.md
Resume file: None

**Next action:** Continue Phase 7 Data Management with 07-03 (Frontend Hooks)

---
*Last updated: 2026-02-07*
