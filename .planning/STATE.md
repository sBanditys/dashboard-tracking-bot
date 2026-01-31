# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2025-01-24)

**Core value:** Server admins can access their tracking data and bot status through a reliable web interface — independent of bot uptime.
**Current focus:** Phase 4 - Real-Time Updates

## Current Position

Phase: 4 of 8 (Real-Time Updates)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-01-31 — Completed 04-02-PLAN.md

Progress: [████████░░] ~44% (14 plans complete, Phase 4 in progress)

## Performance Metrics

**Velocity:**
- Total plans completed: 14
- Average duration: 2m 15s (code plans only, excluding verification)
- Total execution time: ~31m 56s

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 5 | 17m 25s | 4m 26s |
| 02 | 2 | 1m 35s | 48s |
| 03 | 5 | 10m 44s | 2m 09s |
| 04 | 2 | 2m 12s | 1m 06s |

**Recent Trend:**
- Last 5 plans: 03-03 (1m 18s), 03-04 (2m 00s), 03-05 (3m 24s), 04-01 (1m 24s), 04-02 (48s)
- Trend: Consistent fast execution

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

Completed tracking data display ready for Phase 4:

- **Foundation:** PlatformIcon, Skeleton, useDebounce, EmptyState, NoResults
- **Filter Components:** PlatformSelect, StatusSelect, DateRangeFilter, PageSizeSelect
- **Data Hooks:** useAccountsInfinite, usePostsInfinite with infinite scroll
- **Card Components:** AccountCard, PostCard with expandable details, skeletons
- **Page Integration:** Accounts, Posts, Brands pages refactored with cards and infinite scroll

### Phase 4 Deliverables (In Progress)

- **SSE Infrastructure:** Proxy route and useSSE hook with exponential backoff
- **Status Integration:** useGuildStatusRealtime hook, BotStatus with connection states

### Pending Todos

None yet.

### Blockers/Concerns

None - execution proceeding smoothly.

## Session Continuity

Last session: 2026-01-31
Stopped at: Completed 04-02-PLAN.md
Resume file: None

**Next action:** Execute 04-03-PLAN.md (if exists) or complete Phase 4

---
*Last updated: 2026-01-31*
