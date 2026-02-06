# Phase 6: Analytics - Research

**Researched:** 2026-02-06
**Domain:** Analytics dashboards, time-series visualization, React charting libraries
**Confidence:** HIGH

## Summary

Phase 6 implements a comprehensive analytics system for viewing guild metrics, activity insights, and performance data. The research confirms that Recharts is the industry-standard charting library for React applications in 2026, with excellent Next.js integration and 165+ code examples in Context7. The backend already has a `/usage` endpoint that returns time-series data and post statistics, which can be extended for analytics needs.

The standard approach combines:
- **Recharts** for time-series area charts with responsive containers and custom tooltips
- **React Query** (already in use) for data fetching with appropriate stale times
- **Counter cards** with trend indicators showing delta vs previous period
- **Activity timeline** using existing audit log infrastructure with infinite scroll
- **Leaderboard** component ranking accounts by engagement metrics

The phase requires three new backend endpoints for time-series aggregation, leaderboard data, and activity events, plus frontend components for visualizations following the project's established patterns (no component library, Tailwind styling, skeleton loading states).

**Primary recommendation:** Use Recharts AreaChart with daily/weekly granularity auto-adjustment, extend existing `/usage` endpoint patterns for analytics data, and leverage the audit log system for activity timeline.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dashboard layout:**
- Summary on guild overview: counter cards + mini sparkline graph + top-5 leaderboard preview
- Dedicated Analytics page in sidebar for full deep-dive
- Full analytics page layout: counters across top → graph + leaderboard side-by-side in middle → activity timeline below
- Global time range selector at top (7d / 30d / 90d) that affects all sections by default
- Individual sections can override the global time range if needed

**Graph presentation:**
- Area chart (line with filled area underneath) for main submissions/posts graph
- Time granularity auto-adjusts by range: daily for 7d, daily for 30d, weekly for 90d
- Single aggregated line for all post types (no breakdown by content type)
- Hover tooltips showing exact count and date
- Click a data point to navigate to posts from that day/week

**Activity timeline:**
- Grouped by day (date headers: Today, Yesterday, Jan 28, etc.)
- Shows posts captured + config changes (settings changes, account adds/removes)
- Infinite scroll for loading more events (consistent with tracking pages pattern)
- Events link to the related item (post, account, setting) — timeline doubles as navigation

**Counter cards:**
- Metrics shown: total tracked accounts, total posts captured, total brands + breakdown by platform
- Trend indicators: delta vs previous period (e.g., "+12 this week", "+15%")
- Platform split shows count per platform (e.g., 12 Twitter, 5 Instagram)

**Leaderboard:**
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

### Deferred Ideas (OUT OF SCOPE)

- Content type breakdown in graph (videos vs images vs text) — could be a future enhancement
- Per-brand analytics view — potential future phase
- Export analytics data (CSV/PDF reports) — belongs in Phase 7 (Data Management)

</user_constraints>

---

## Standard Stack

The established libraries/tools for analytics dashboards in React/Next.js:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Recharts | 3.3.0 | Time-series charts, area charts, tooltips | Industry standard for React charting, 165 code examples in Context7, native SVG, composable components, excellent TypeScript support |
| @tanstack/react-query | 5.x (already installed) | Analytics data fetching, caching | Already in use project-wide, perfect for dashboard analytics with stale-time strategies |
| date-fns | 3.x | Date formatting, time range calculations | Lightweight, tree-shakeable, perfect for "Today/Yesterday" labels and time-series aggregation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Prisma | (already installed) | Time-series aggregation with PostgreSQL | Backend aggregation queries for daily/weekly/monthly data |
| react-intersection-observer | 9.x | Infinite scroll detection | Activity timeline infinite loading (consistent with existing tracking pages) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Chart.js + react-chartjs-2 | Chart.js is canvas-based (not SVG), less React-native, requires more imperative code |
| Recharts | Victory Charts | Victory has fewer examples, smaller community, Recharts has 4x more GitHub stars |
| Recharts | Nivo | Nivo is heavier (includes D3), Recharts is more lightweight and focused |

**Installation:**
```bash
npm install recharts date-fns react-intersection-observer
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/(dashboard)/guilds/[guildId]/
│   ├── analytics/
│   │   └── page.tsx                    # Full analytics page
│   └── page.tsx                        # Guild overview (mini analytics preview)
├── components/
│   ├── analytics/
│   │   ├── analytics-chart.tsx         # Time-series area chart
│   │   ├── analytics-chart-skeleton.tsx
│   │   ├── counter-card.tsx            # Metric counter with trend
│   │   ├── counter-card-skeleton.tsx
│   │   ├── leaderboard.tsx             # Top accounts ranking
│   │   ├── leaderboard-skeleton.tsx
│   │   ├── activity-timeline.tsx       # Event timeline with infinite scroll
│   │   ├── activity-event.tsx          # Single event item
│   │   ├── mini-sparkline.tsx          # Small chart for overview
│   │   └── time-range-selector.tsx     # 7d/30d/90d toggle
│   └── stat-card.tsx                   # (already exists, can be reused/extended)
├── hooks/
│   └── use-analytics.ts                # Analytics data fetching hooks
└── types/
    └── analytics.ts                    # Analytics type definitions
```

### Pattern 1: Time-Series Data Aggregation

**What:** Backend aggregates post counts by day/week using PostgreSQL date_trunc and Prisma groupBy
**When to use:** For chart data that needs to be grouped by time periods
**Example:**

```typescript
// Backend: api/src/routes/dashboard/guilds.ts
// Source: PostgreSQL date_trunc + Prisma aggregation pattern

router.get('/:guildId/analytics/time-series', ...requireDashboardGuildAuth, async (req, res) => {
  const { range = '30' } = req.query; // 7, 30, 90
  const days = Math.min(parseInt(range as string, 10) || 30, 90);
  const granularity = days === 90 ? 'week' : 'day'; // Auto-adjust granularity

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // PostgreSQL date_trunc for time-series grouping
  const timeSeries = await prisma.$queryRaw`
    SELECT
      DATE_TRUNC(${granularity}, "submittedAt") as period,
      COUNT(*) as count
    FROM "Post"
    WHERE "brandId" IN (
      SELECT id FROM "Brand" WHERE "clientId" = ${guildAccess.clientId}
    )
    AND "submittedAt" >= ${startDate}
    GROUP BY period
    ORDER BY period ASC
  `;

  res.json({ time_series: timeSeries, granularity });
});
```

### Pattern 2: Recharts Area Chart with Responsive Container

**What:** Area chart with gradient fill, tooltips, and click handlers for navigation
**When to use:** Main submissions graph visualization
**Example:**

```tsx
// Source: Context7 /recharts/recharts - AreaChart with gradients
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AnalyticsChartProps {
  data: Array<{ date: string; count: number }>;
  onDataPointClick?: (date: string) => void;
}

export function AnalyticsChart({ data, onDataPointClick }: AnalyticsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} onClick={(e) => e?.activeLabel && onDataPointClick?.(e.activeLabel)}>
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="date" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
          labelStyle={{ color: '#f3f4f6' }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#8b5cf6"
          fillOpacity={1}
          fill="url(#colorCount)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

### Pattern 3: Counter Card with Trend Indicator

**What:** Metric card showing current value + delta percentage vs previous period
**When to use:** Dashboard counters for total accounts, posts, brands
**Example:**

```tsx
// Source: Existing StatCard component + trend calculation pattern
interface CounterCardProps {
  label: string;
  value: number;
  previousValue: number;
  icon?: string;
  breakdown?: { platform: string; count: number }[];
}

export function CounterCard({ label, value, previousValue, icon, breakdown }: CounterCardProps) {
  const delta = previousValue > 0
    ? Math.round(((value - previousValue) / previousValue) * 100)
    : 0;
  const isPositive = delta >= 0;

  return (
    <div className="bg-surface border border-border rounded-sm p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-3xl font-bold text-white">{value.toLocaleString()}</p>
          {delta !== 0 && (
            <p className={cn('text-xs', isPositive ? 'text-green-400' : 'text-red-400')}>
              {isPositive ? '↑' : '↓'} {Math.abs(delta)}% vs previous period
            </p>
          )}
          {breakdown && (
            <div className="flex gap-2 mt-2">
              {breakdown.map(({ platform, count }) => (
                <span key={platform} className="text-xs text-gray-400">
                  {count} {platform}
                </span>
              ))}
            </div>
          )}
        </div>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
    </div>
  );
}
```

### Pattern 4: Activity Timeline with Infinite Scroll

**What:** Grouped event timeline using existing audit log + infinite scroll
**When to use:** Activity section showing recent changes and posts
**Example:**

```tsx
// Source: TanStack Query useInfiniteQuery + react-intersection-observer
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';

export function ActivityTimeline({ guildId }: { guildId: string }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['guild', guildId, 'analytics', 'activity'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fetch(`/api/guilds/${guildId}/analytics/activity?page=${pageParam}`);
      return res.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.next_page,
    staleTime: 60 * 1000, // 1 minute
  });

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage) fetchNextPage();
  }, [inView, hasNextPage, fetchNextPage]);

  // Group by day
  const groupedEvents = groupEventsByDay(data?.pages.flatMap(p => p.events) || []);

  return (
    <div className="space-y-4">
      {Object.entries(groupedEvents).map(([date, events]) => (
        <div key={date}>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">{date}</h3>
          <div className="space-y-2">
            {events.map(event => <ActivityEvent key={event.id} event={event} />)}
          </div>
        </div>
      ))}
      {hasNextPage && <div ref={ref} />}
      {isFetchingNextPage && <Skeleton className="h-20" />}
    </div>
  );
}

function groupEventsByDay(events: Event[]): Record<string, Event[]> {
  return events.reduce((acc, event) => {
    const label = formatDateLabel(event.created_at); // "Today", "Yesterday", "Jan 28"
    if (!acc[label]) acc[label] = [];
    acc[label].push(event);
    return acc;
  }, {} as Record<string, Event[]>);
}
```

### Pattern 5: Mini Sparkline for Overview

**What:** Small inline chart without axes for guild overview page
**When to use:** Preview of analytics on main guild page
**Example:**

```tsx
// Source: Recharts sparkline pattern - minimal AreaChart
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export function MiniSparkline({ data }: { data: Array<{ value: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data}>
        <Area
          type="monotone"
          dataKey="value"
          stroke="#8b5cf6"
          fill="#8b5cf6"
          fillOpacity={0.3}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

### Anti-Patterns to Avoid

- **Client-side aggregation of large datasets:** Don't fetch all posts and aggregate in browser. Pre-aggregate on backend with PostgreSQL date_trunc
- **Re-fetching on every time range change:** Use React Query's queryKey to cache different time ranges independently
- **Blocking UI during data fetch:** Always show skeleton loaders, never spinner overlays that block interaction
- **Hardcoded date labels:** Use date-fns to format relative dates ("Today", "Yesterday") respecting user timezone
- **Layout shift during skeleton → content:** Match skeleton dimensions exactly to real content

---

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting ("Today", "Yesterday", "Jan 28") | Custom date formatter with if/else chains | date-fns `formatDistance`, `format` | Handles edge cases (timezone, leap years, locale), well-tested, tree-shakeable |
| Chart tooltips with hover states | Custom SVG overlay with mouse tracking | Recharts `<Tooltip />` component | Cross-browser compatibility, touch support, positioning logic, accessibility |
| Infinite scroll intersection detection | Manual scroll event listeners + getBoundingClientRect | react-intersection-observer | Performance optimized with IntersectionObserver API, handles edge cases |
| Time-series data aggregation | JavaScript array reduce/groupBy | PostgreSQL date_trunc + Prisma | 100-1000x faster, handles large datasets, prevents memory issues |
| Trend percentage calculation | Manual math with edge case handling | Standard formula: `((current - previous) / previous) * 100` | Handles division by zero, rounding, sign consistency |

**Key insight:** Analytics dashboards have well-established patterns. Recharts handles 90% of charting complexity (responsiveness, tooltips, interactions). PostgreSQL handles time-series aggregation far better than JavaScript. Don't reinvent these wheels.

---

## Common Pitfalls

### Pitfall 1: Time Zone Mismatches in Aggregation

**What goes wrong:** Backend aggregates in UTC, frontend displays in user's local timezone, causing day boundaries to misalign (e.g., post submitted at 11pm PST shows as next day)

**Why it happens:** PostgreSQL date_trunc uses server timezone by default, date-fns uses browser timezone

**How to avoid:**
- Backend: Explicitly use UTC for all aggregation: `DATE_TRUNC('day', "submittedAt" AT TIME ZONE 'UTC')`
- Frontend: Format dates in UTC for chart display, only convert to local for tooltips
- Store timezone preference in user settings if per-user localization needed

**Warning signs:** Chart data points shift by one day between different users, "Today" label shows yesterday's data

### Pitfall 2: N+1 Queries for Leaderboard Metrics

**What goes wrong:** Fetching account list, then looping to get metrics for each account (100 accounts = 101 queries)

**Why it happens:** Natural ORM usage pattern without considering performance

**How to avoid:**
```typescript
// BAD: N+1 queries
const accounts = await prisma.clientAccount.findMany({ ... });
const leaderboard = await Promise.all(
  accounts.map(async (acc) => ({
    ...acc,
    metrics: await prisma.videoMetrics.aggregate({ where: { accountId: acc.id } })
  }))
);

// GOOD: Single query with aggregation
const leaderboard = await prisma.$queryRaw`
  SELECT
    ca.id, ca.username, ca.platform,
    SUM(vm."viewCount") as total_views,
    SUM(vm."likeCount") as total_likes
  FROM "ClientAccount" ca
  LEFT JOIN "Post" p ON p."authorHandle" = ca.username
  LEFT JOIN "VideoMetrics" vm ON vm."videoId" = p.url
  WHERE ca."brandId" IN (...)
  GROUP BY ca.id
  ORDER BY total_views DESC
  LIMIT 10
`;
```

**Warning signs:** Leaderboard loading takes >2 seconds, database connection pool exhaustion, high CPU on database

### Pitfall 3: Memory Bloat from Infinite Scroll

**What goes wrong:** Activity timeline loads hundreds of pages, keeping all data in memory, causing browser slowdown/crashes

**Why it happens:** React Query's useInfiniteQuery keeps all pages cached by default

**How to avoid:**
- Set maxPages on infinite query: `maxPages: 10` (only keep last 10 pages)
- Use virtualization for long lists: react-window or @tanstack/react-virtual
- Add "Load more" button instead of pure infinite scroll after certain threshold

**Warning signs:** Browser memory usage grows unbounded, scrolling becomes janky after many pages, mobile devices crash

### Pitfall 4: Stale Counter Data After Mutations

**What goes wrong:** User adds account, counter shows old count until manual refresh

**Why it happens:** Counter data fetched separately from mutation, React Query cache not invalidated

**How to avoid:**
```typescript
// After account mutation, invalidate analytics queries
const addAccount = useMutation({
  mutationFn: createAccount,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'analytics'] });
    queryClient.invalidateQueries({ queryKey: ['guild', guildId] }); // Overview counters
  }
});
```

**Warning signs:** Counter cards show stale data, users report "numbers don't update", analytics don't reflect recent actions

### Pitfall 5: Chart Renders Before Container Dimensions Set

**What goes wrong:** Recharts ResponsiveContainer renders at 0x0 or wrong size on first render

**Why it happens:** Parent container hasn't calculated final dimensions when chart mounts

**How to avoid:**
- Ensure parent has explicit height: `<div className="h-[300px]">` not just `h-full`
- Use CSS aspect ratio for consistent sizing: `aspect-[2/1]`
- Add debounced resize observer if dynamic sizing needed

**Warning signs:** Chart appears squished, tooltip positions wrong, axes labels overlap

---

## Code Examples

Verified patterns from official sources:

### Time-Series Data Formatting for Charts

```typescript
// Source: date-fns + PostgreSQL date_trunc pattern
import { format, parseISO, startOfDay, subDays } from 'date-fns';

interface TimeSeriesPoint {
  period: Date;
  count: number;
}

function formatTimeSeriesForChart(
  data: TimeSeriesPoint[],
  granularity: 'day' | 'week'
): Array<{ date: string; count: number }> {
  return data.map(point => ({
    date: format(parseISO(point.period), granularity === 'day' ? 'MMM d' : 'MMM d'),
    count: point.count
  }));
}

// Generate date range for missing days (fill gaps with 0)
function fillMissingDays(data: TimeSeriesPoint[], days: number): TimeSeriesPoint[] {
  const result: TimeSeriesPoint[] = [];
  const dataMap = new Map(data.map(d => [startOfDay(d.period).toISOString(), d]));

  for (let i = 0; i < days; i++) {
    const date = startOfDay(subDays(new Date(), i));
    const key = date.toISOString();
    result.unshift(dataMap.get(key) || { period: date, count: 0 });
  }

  return result;
}
```

### Custom Recharts Tooltip with Dark Theme

```tsx
// Source: Context7 /recharts/recharts - Custom tooltip pattern
import { TooltipProps } from 'recharts';

interface CustomTooltipProps extends TooltipProps<number, string> {
  granularity: 'day' | 'week';
}

function CustomAnalyticsTooltip({ active, payload, label, granularity }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-surface border border-border rounded-sm p-3 shadow-lg">
      <p className="text-sm font-semibold text-white mb-1">
        {label}
      </p>
      <p className="text-xs text-gray-400">
        {payload[0].value} posts {granularity === 'week' ? 'this week' : 'on this day'}
      </p>
    </div>
  );
}

// Usage in AreaChart
<AreaChart data={data}>
  <Tooltip content={<CustomAnalyticsTooltip granularity="day" />} />
</AreaChart>
```

### React Query Hook for Analytics Data

```typescript
// Source: TanStack Query best practices for dashboard analytics
import { useQuery } from '@tanstack/react-query';

interface AnalyticsData {
  time_series: Array<{ date: string; count: number }>;
  counters: {
    total_accounts: number;
    total_posts: number;
    total_brands: number;
    by_platform: Record<string, number>;
  };
  previous_period: {
    total_accounts: number;
    total_posts: number;
  };
}

export function useAnalytics(guildId: string, range: 7 | 30 | 90 = 30) {
  return useQuery<AnalyticsData>({
    queryKey: ['guild', guildId, 'analytics', range],
    queryFn: async () => {
      const res = await fetch(`/api/guilds/${guildId}/analytics?range=${range}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - analytics don't change rapidly
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    enabled: !!guildId,
  });
}
```

### Skeleton Loading for Charts

```tsx
// Source: Existing skeleton pattern from DEV-022
export function AnalyticsChartSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-sm p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="space-y-2">
        {/* Simulate chart area */}
        <div className="h-[300px] flex items-end gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1"
              style={{ height: `${Math.random() * 80 + 20}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CounterCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-surface border border-border rounded-sm p-4">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Chart.js with canvas rendering | Recharts with SVG | ~2022 | Better React integration, easier styling, accessibility, better TypeScript support |
| Manual date manipulation with Moment.js | date-fns tree-shakeable functions | ~2020 | Smaller bundle size (20KB vs 70KB), better tree-shaking, immutable API |
| Client-side aggregation with lodash | PostgreSQL date_trunc + Prisma | Ongoing best practice | 100-1000x faster, scales to millions of rows, reduces memory usage |
| Redux for dashboard state | React Query for server state | ~2021 | Automatic caching, refetching, optimistic updates, less boilerplate |
| CSS-in-JS for chart styling | Tailwind utility classes + CSS variables | ~2023 | Better performance, smaller bundle, easier theme customization |

**Deprecated/outdated:**
- **Moment.js:** Deprecated, use date-fns or Day.js instead (Moment is 70KB, unmaintained since 2020)
- **Chart.js with react-chartjs-2:** Still viable but Recharts has better React integration and TypeScript support
- **Manual scroll listeners:** Use IntersectionObserver API (supported in all modern browsers since 2019)
- **Highcharts:** Requires commercial license for SaaS products, Recharts is MIT licensed

---

## Open Questions

Things that couldn't be fully resolved:

1. **Should WeeklySubmission metrics be included in leaderboard?**
   - What we know: Schema has WeeklySubmission with totalViews per account group
   - What's unclear: Whether this should rank account groups or individual accounts, and if it should combine with Post metrics or be separate
   - Recommendation: Start with Post metrics (views/likes from VideoMetrics), add WeeklySubmission leaderboard as Phase 6.1 if needed

2. **How far back should activity timeline load?**
   - What we know: DashboardAuditLog has unlimited history
   - What's unclear: Performance impact of loading months of audit logs, whether to add date range filter
   - Recommendation: Default to 30 days, add "Load older" button that extends range, or implement date range filter in header

3. **Should mini sparkline on overview be clickable?**
   - What we know: User wants mini sparkline + top-5 leaderboard on guild overview
   - What's unclear: Whether clicking sparkline should navigate to analytics page or be purely decorative
   - Recommendation: Make entire card clickable (not just sparkline) to navigate to /analytics, follows existing "Quick Access Cards" pattern

---

## Sources

### Primary (HIGH confidence)

- Context7 /recharts/recharts - AreaChart, tooltips, responsive containers (165 code snippets)
- Context7 /tanstack/query - useQuery, useInfiniteQuery, caching strategies (1650+ code snippets)
- Existing codebase: `/api/guilds/:guildId/usage` endpoint pattern, StatCard component, Skeleton pattern
- PostgreSQL documentation: date_trunc function for time-series aggregation

### Secondary (MEDIUM confidence)

- [Next.js SaaS Dashboard Development: Scalability & Best Practices](https://www.ksolves.com/blog/next-js/best-practices-for-saas-dashboards) - Dashboard layout patterns, SSR/ISR strategies
- [How to use Next.js and Recharts to build an information dashboard](https://ably.com/blog/informational-dashboard-with-nextjs-and-recharts) - Recharts integration patterns
- [Building a Next.js Dashboard with Dynamic Charts and SSR](https://cube.dev/blog/building-nextjs-dashboard-with-dynamic-charts-and-ssr) - Server-side rendering for analytics
- [Calculating Trend Indicators](https://analyticsdemystified.com/reporting/calculating-trend-indicators/) - Delta percentage formula
- [PostgreSQL Time-Series Aggregation](https://campus.datacamp.com/courses/time-series-analysis-in-postgresql/working-with-time-series?ex=1) - date_trunc granularity patterns

### Tertiary (LOW confidence)

- [React Skeleton Loading Patterns](https://blog.logrocket.com/handling-react-loading-states-react-loading-skeleton/) - Skeleton UI best practices (general patterns, not specific to this stack)
- [React Sparkline Libraries](https://dev.to/smartchainxdev/advanced-mini-chart-visualizations-with-react-sparklines-2066) - Alternative sparkline implementations

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Recharts and React Query are verified through Context7 documentation and existing project usage
- Architecture: HIGH - Patterns based on official Recharts examples and existing project structure
- Pitfalls: MEDIUM - Based on common PostgreSQL/React Query issues, some inferred from general best practices
- Code examples: HIGH - Directly from Context7 and adapted from existing codebase patterns

**Research date:** 2026-02-06
**Valid until:** ~30 days (stable ecosystem, Next.js 15 and Recharts 3.x are current major versions)

---

## Backend Endpoints Needed

Based on research, Phase 6 requires these new backend endpoints:

### 1. GET /api/v1/guilds/:guildId/analytics

**Purpose:** Main analytics data aggregation
**Returns:** Counter cards data + time-series + previous period comparison

```typescript
{
  counters: {
    total_accounts: number,
    total_posts: number,
    total_brands: number,
    by_platform: { instagram: number, tiktok: number, ... }
  },
  previous_period: {
    total_accounts: number,
    total_posts: number,
    total_brands: number
  },
  time_series: Array<{ period: string, count: number }>,
  granularity: 'day' | 'week'
}
```

### 2. GET /api/v1/guilds/:guildId/analytics/leaderboard

**Purpose:** Top accounts by engagement metrics
**Query params:** `?range=30&limit=10`
**Returns:** Ranked accounts with metrics

```typescript
{
  leaderboard: Array<{
    account_id: string,
    username: string,
    platform: string,
    total_views: number,
    total_likes: number,
    post_count: number
  }>
}
```

### 3. GET /api/v1/guilds/:guildId/analytics/activity

**Purpose:** Activity timeline events (extends existing audit log)
**Query params:** `?page=1&limit=50`
**Returns:** Paginated events grouped for timeline

```typescript
{
  events: Array<{
    id: string,
    type: 'post_captured' | 'settings_changed' | 'account_added' | ...,
    created_at: string,
    actor: string,
    description: string,
    link: string | null  // URL to related resource
  }>,
  next_page: number | null
}
```

**Note:** Can potentially reuse/extend existing `/audit-log` endpoint by adding post submission events
