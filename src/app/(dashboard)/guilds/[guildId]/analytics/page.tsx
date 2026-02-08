'use client'

import { useParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import dynamic from 'next/dynamic'
import { useGuild } from '@/hooks/use-guilds'
import { usePersistentState } from '@/hooks/use-persistent-state'
import {
  useAnalytics,
  useAnalyticsLeaderboard,
  useTopAccounts,
  useWeeklySubmissions,
} from '@/hooks/use-analytics'
import { TimeRangeSelector } from '@/components/analytics/time-range-selector'
import { CounterCard } from '@/components/analytics/counter-card'
import { CounterCardSkeleton } from '@/components/analytics/counter-card-skeleton'
import { AnalyticsChartSkeleton } from '@/components/analytics/analytics-chart-skeleton'
import { Leaderboard } from '@/components/analytics/leaderboard'
import { LeaderboardSkeleton } from '@/components/analytics/leaderboard-skeleton'
import { TopAccounts, TopAccountsSkeleton } from '@/components/analytics/top-accounts'
import { WeeklySubmissions, WeeklySubmissionsSkeleton } from '@/components/analytics/weekly-submissions'
import type { TimeRange, ChartDataPoint } from '@/types/analytics'

// Code-split Recharts-using components
const AnalyticsChart = dynamic(
  () => import('@/components/analytics/analytics-chart').then((mod) => mod.AnalyticsChart),
  { ssr: false, loading: () => <AnalyticsChartSkeleton /> }
)
const ActivityTimeline = dynamic(
  () => import('@/components/analytics/activity-timeline').then((mod) => mod.ActivityTimeline),
  { ssr: false }
)

export default function AnalyticsPage() {
  const params = useParams()
  const guildId = params.guildId as string

  const [range, setRange] = usePersistentState<TimeRange>(`${guildId}-analytics-range`, 7)

  const { data: guild } = useGuild(guildId)
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics(guildId, range)
  const { data: leaderboard, isLoading: leaderboardLoading } = useAnalyticsLeaderboard(
    guildId,
    range,
    10
  )
  const { data: topAccounts, isLoading: topAccountsLoading } = useTopAccounts(guildId, range, 10)
  const { data: weeklyData, isLoading: weeklyLoading } = useWeeklySubmissions(guildId, 8)

  // Transform weekly submissions data for chart (from /sendlast7days)
  const weeklyViewsChartData: ChartDataPoint[] = weeklyData?.weeks
    ? [...weeklyData.weeks].reverse().map((week) => ({
        date: format(parseISO(week.week_start), 'MMM d'),
        value: week.total_views,
        rawDate: week.week_start,
      }))
    : []

  const totalWeeklyViews = weeklyViewsChartData.reduce((sum, d) => sum + d.value, 0)

  // Transform views series data for chart (daily VideoMetrics)
  const chartData: ChartDataPoint[] = analytics?.views_series
    ? analytics.views_series.map((point) => ({
        date: format(parseISO(point.period), 'MMM d'),
        value: point.views,
        rawDate: point.period,
      }))
    : []

  const totalDailyViews = chartData.reduce((sum, d) => sum + d.value, 0)

  // Transform time series data for submissions count chart
  const submissionsChartData: ChartDataPoint[] = analytics?.time_series
    ? analytics.time_series.map((point) => ({
        date: format(parseISO(point.period), 'MMM d'),
        value: point.count,
        rawDate: point.period,
      }))
    : []

  const totalSubmissions = submissionsChartData.reduce((sum, d) => sum + d.value, 0)

  // Refresh tracking status
  const refreshEnabled = guild?.auto_refresh?.enabled ?? false

  // Calculate platform split total
  const platformSplitValue = analytics?.counters.by_platform
    ? Object.values(analytics.counters.by_platform).reduce((sum, count) => sum + count, 0)
    : 0

  const platformSplitPreviousValue = analytics?.previous_period.total_accounts ?? 0

  return (
    <div className="space-y-6">
      {/* Header with time range selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>

      {/* Counter cards - 5 across on large screens */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
        {analyticsLoading && !analytics ? (
          <CounterCardSkeleton count={5} />
        ) : analytics ? (
          <>
            <CounterCard
              label="Tracked Accounts"
              value={analytics.counters.total_accounts}
              previousValue={analytics.previous_period.total_accounts}
            />
            <CounterCard
              label="Posts This Period"
              value={analytics.counters.total_posts}
              previousValue={analytics.previous_period.total_posts}
            />
            <CounterCard
              label="Total Views"
              value={analytics.counters.total_views}
              previousValue={analytics.previous_period.total_views}
            />
            <CounterCard
              label="Total Brands"
              value={analytics.counters.total_brands}
              previousValue={analytics.previous_period.total_brands}
            />
            <CounterCard
              label="Platform Split"
              value={platformSplitValue}
              previousValue={platformSplitPreviousValue}
              breakdown={Object.entries(analytics.counters.by_platform).map(
                ([platform, count]) => ({
                  platform,
                  count,
                })
              )}
            />
          </>
        ) : null}
      </div>

      {/* Chart + Account Groups leaderboard - 2/3 + 1/3 split */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Weekly Submission Views (from /sendlast7days) */}
          {weeklyLoading && !weeklyData ? (
            <AnalyticsChartSkeleton />
          ) : weeklyData ? (
            <AnalyticsChart
              data={weeklyViewsChartData}
              title="Weekly Submission Views"
              totalValue={totalWeeklyViews}
              tooltipLabel="views"
              granularity="week"
            />
          ) : null}

          {/* Daily Post Submissions */}
          {analyticsLoading && !analytics ? (
            <AnalyticsChartSkeleton />
          ) : analytics ? (
            <AnalyticsChart
              data={submissionsChartData}
              title="Daily Post Submissions"
              totalValue={totalSubmissions}
              tooltipLabel="posts"
              granularity={analytics.granularity}
            />
          ) : null}

          {/* Daily Views from post metrics */}
          {analyticsLoading && !analytics ? (
            <AnalyticsChartSkeleton />
          ) : analytics ? (
            <AnalyticsChart
              data={chartData}
              title="Daily Views"
              totalValue={totalDailyViews}
              tooltipLabel="views"
              granularity={analytics.granularity}
              statusBadge={
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                  refreshEnabled
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  Refresh Tracking {refreshEnabled ? 'On' : 'Off'}
                </span>
              }
            />
          ) : null}
        </div>

        <div className="lg:col-span-1">
          {leaderboardLoading && !leaderboard ? (
            <LeaderboardSkeleton count={5} />
          ) : leaderboard ? (
            <Leaderboard entries={leaderboard.leaderboard} guildId={guildId} limit={10} />
          ) : null}
        </div>
      </div>

      {/* Top Accounts (by post metrics) + Weekly Submissions side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          {topAccountsLoading && !topAccounts ? (
            <TopAccountsSkeleton />
          ) : topAccounts ? (
            <TopAccounts accounts={topAccounts.accounts} />
          ) : null}
        </div>

        <div>
          {weeklyLoading && !weeklyData ? (
            <WeeklySubmissionsSkeleton />
          ) : weeklyData ? (
            <WeeklySubmissions weeks={weeklyData.weeks} />
          ) : null}
        </div>
      </div>

      {/* Activity Timeline - full width */}
      <ActivityTimeline guildId={guildId} />
    </div>
  )
}
