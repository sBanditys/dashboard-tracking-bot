'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import {
  useAnalytics,
  useAnalyticsLeaderboard,
  useTopAccounts,
  useWeeklySubmissions,
} from '@/hooks/use-analytics'
import { TimeRangeSelector } from '@/components/analytics/time-range-selector'
import { CounterCard } from '@/components/analytics/counter-card'
import { CounterCardSkeleton } from '@/components/analytics/counter-card-skeleton'
import { AnalyticsChart } from '@/components/analytics/analytics-chart'
import { AnalyticsChartSkeleton } from '@/components/analytics/analytics-chart-skeleton'
import { Leaderboard } from '@/components/analytics/leaderboard'
import { LeaderboardSkeleton } from '@/components/analytics/leaderboard-skeleton'
import { TopAccounts, TopAccountsSkeleton } from '@/components/analytics/top-accounts'
import { WeeklySubmissions, WeeklySubmissionsSkeleton } from '@/components/analytics/weekly-submissions'
import { ActivityTimeline } from '@/components/analytics/activity-timeline'
import type { TimeRange, ChartDataPoint } from '@/types/analytics'

export default function AnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const guildId = params.guildId as string

  const [range, setRange] = useState<TimeRange>(30)

  const { data: analytics, isLoading: analyticsLoading } = useAnalytics(guildId, range)
  const { data: leaderboard, isLoading: leaderboardLoading } = useAnalyticsLeaderboard(
    guildId,
    range,
    10
  )
  const { data: topAccounts, isLoading: topAccountsLoading } = useTopAccounts(guildId, range, 10)
  const { data: weeklyData, isLoading: weeklyLoading } = useWeeklySubmissions(guildId, 8)

  // Transform time series data for chart
  const chartData: ChartDataPoint[] = analytics?.time_series
    ? analytics.time_series.map((point) => ({
        date: format(parseISO(point.period), 'MMM d'),
        count: point.count,
        rawDate: point.period,
      }))
    : []

  // Handle click on chart data point - navigate to posts filtered by that date
  function handleDateClick(rawDate: string) {
    const dateStr = rawDate.split('T')[0]
    router.push(`/guilds/${guildId}/posts?from=${dateStr}&to=${dateStr}`)
  }

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
        {analyticsLoading ? (
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
        <div className="lg:col-span-2">
          {analyticsLoading ? (
            <AnalyticsChartSkeleton />
          ) : analytics ? (
            <AnalyticsChart
              data={chartData}
              granularity={analytics.granularity}
              onDataPointClick={handleDateClick}
            />
          ) : null}
        </div>

        <div className="lg:col-span-1">
          {leaderboardLoading ? (
            <LeaderboardSkeleton count={5} />
          ) : leaderboard ? (
            <Leaderboard entries={leaderboard.leaderboard} guildId={guildId} limit={10} />
          ) : null}
        </div>
      </div>

      {/* Top Accounts (by post metrics) + Weekly Submissions side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          {topAccountsLoading ? (
            <TopAccountsSkeleton />
          ) : topAccounts ? (
            <TopAccounts accounts={topAccounts.accounts} />
          ) : null}
        </div>

        <div>
          {weeklyLoading ? (
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
