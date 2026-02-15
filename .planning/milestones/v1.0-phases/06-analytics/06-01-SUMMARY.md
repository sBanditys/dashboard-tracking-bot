---
phase: 06-analytics
plan: 01
subsystem: ui
tags: [recharts, react-query, analytics, typescript]

# Dependency graph
requires:
  - phase: 05-configuration
    provides: API proxy patterns and mutation hooks
  - phase: 03-tracking-data
    provides: Pagination types and infinite query patterns
provides:
  - Analytics type definitions (counters, time-series, leaderboard, activity)
  - Three API proxy routes for analytics endpoints
  - React Query hooks for analytics data fetching
  - Recharts dependency for chart rendering
affects: [06-analytics Wave 2 (UI components)]

# Tech tracking
tech-stack:
  added: [recharts]
  patterns: [Analytics API proxy pattern, infinite scroll with maxPages, staleTime tuning by data volatility]

key-files:
  created:
    - src/types/analytics.ts
    - src/app/api/guilds/[guildId]/analytics/route.ts
    - src/app/api/guilds/[guildId]/analytics/leaderboard/route.ts
    - src/app/api/guilds/[guildId]/analytics/activity/route.ts
    - src/hooks/use-analytics.ts
  modified:
    - package.json

key-decisions:
  - "5-minute staleTime for analytics/leaderboard (slow-changing data)"
  - "1-minute staleTime for activity timeline (faster updates)"
  - "maxPages: 10 for infinite scroll to prevent memory bloat"

patterns-established:
  - "Data volatility determines staleTime: 5min for analytics, 1min for activity"
  - "Infinite query for timeline/activity patterns with maxPages limit"
  - "TimeRange type (7 | 30 | 90) for consistent period selection"

# Metrics
duration: 1m 36s
completed: 2026-02-07
---

# Phase 06 Plan 01: Analytics Foundation Summary

**Recharts integration with typed analytics hooks, API proxy routes, and data-fetching layer for counters, time-series, leaderboard, and activity timeline**

## Performance

- **Duration:** 1m 36s
- **Started:** 2026-02-07T02:21:00+01:00
- **Completed:** 2026-02-07T02:22:36+01:00
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Installed Recharts for chart visualization across Wave 2 components
- Created comprehensive analytics type definitions (AnalyticsData, LeaderboardResponse, ActivityResponse)
- Built three API proxy routes following established patterns from usage/audit-log routes
- Implemented three React Query hooks with appropriate staleTime based on data volatility

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Recharts and create analytics types** - `b577d9c` (feat)
   - Added recharts dependency
   - Created analytics.ts with 7 types: TimeRange, AnalyticsData, LeaderboardEntry/Response, ActivityEvent/Response, ChartDataPoint

2. **Task 2: Create API proxy routes and data hooks** - `9c872b6` (feat)
   - Created analytics/route.ts (main analytics endpoint)
   - Created analytics/leaderboard/route.ts (top accounts)
   - Created analytics/activity/route.ts (timeline events)
   - Created use-analytics.ts with useAnalytics, useAnalyticsLeaderboard, useAnalyticsActivity hooks

## Files Created/Modified
- `src/types/analytics.ts` - Analytics type definitions: counters, time-series, leaderboard, activity events
- `src/app/api/guilds/[guildId]/analytics/route.ts` - Main analytics proxy (forwards range param)
- `src/app/api/guilds/[guildId]/analytics/leaderboard/route.ts` - Leaderboard proxy (forwards range, limit)
- `src/app/api/guilds/[guildId]/analytics/activity/route.ts` - Activity timeline proxy (forwards page, limit)
- `src/hooks/use-analytics.ts` - Three hooks: useAnalytics, useAnalyticsLeaderboard, useAnalyticsActivity
- `package.json` - Added recharts dependency

## Decisions Made

**DEV-052: Analytics staleTime by data volatility**
- Analytics/leaderboard: 5min staleTime (aggregated data changes slowly)
- Activity timeline: 1min staleTime (new events appear more frequently)
- Rationale: Balance freshness with reduced API calls based on expected update frequency

**DEV-053: maxPages limit on infinite queries**
- Set maxPages: 10 for useAnalyticsActivity
- Rationale: Prevent memory bloat from excessive scrolling (per research pitfall 3)
- Pattern follows audit log and tracking pages

**DEV-054: TimeRange as union type**
- Used `type TimeRange = 7 | 30 | 90` instead of enum
- Rationale: Simpler type checking, easier to use in queries, consistent with backend contract

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compilation clean, all hooks export correctly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Wave 2 component development:**
- Analytics types defined and exported
- API proxy routes forward requests with auth to backend
- Hooks available for components to import and use
- Recharts installed for chart rendering

**Backend dependency:**
- Backend endpoints assumed to exist at:
  - GET /api/v1/guilds/:guildId/analytics?range=30
  - GET /api/v1/guilds/:guildId/analytics/leaderboard?range=30&limit=10
  - GET /api/v1/guilds/:guildId/analytics/activity?page=1&limit=50
- If endpoints don't exist, components will receive 404/500 responses
- No blocker for Wave 2 development (can build UI with mock data)

## Self-Check: PASSED

All created files verified:
- src/types/analytics.ts ✓
- src/app/api/guilds/[guildId]/analytics/route.ts ✓
- src/app/api/guilds/[guildId]/analytics/leaderboard/route.ts ✓
- src/app/api/guilds/[guildId]/analytics/activity/route.ts ✓
- src/hooks/use-analytics.ts ✓

All commits verified:
- b577d9c ✓
- 9c872b6 ✓

---
*Phase: 06-analytics*
*Completed: 2026-02-07*
