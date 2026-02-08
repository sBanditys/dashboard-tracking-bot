'use client'

import dynamic from 'next/dynamic'
import { useGuild, useGuildStatusRealtime, useGuildUsage } from '@/hooks/use-guilds'
import { useAnalytics, useWeeklySubmissions, useAnalyticsLeaderboard } from '@/hooks/use-analytics'
import { StatCard } from '@/components/stat-card'
import { BotStatus } from '@/components/bot-status'
import { GuildTabs } from '@/components/guild-tabs'
import { GuildSettingsForm } from '@/components/forms/guild-settings-form'
import { Skeleton } from '@/components/ui/skeleton'
import { Leaderboard } from '@/components/analytics/leaderboard'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'

// Code-split Recharts-using component
const MiniSparkline = dynamic(
  () => import('@/components/analytics/mini-sparkline').then((mod) => mod.MiniSparkline),
  { ssr: false, loading: () => <div className="h-16 bg-surface-dark/50 rounded animate-pulse" /> }
)

interface PageProps {
    params: { guildId: string }
}

export default function GuildDetailPage({ params }: PageProps) {
    const { guildId } = params
    const { data: guild, isLoading, error, isError } = useGuild(guildId)
    const { data: status, connectionState, reconnect } = useGuildStatusRealtime(guildId)
    const { data: usage } = useGuildUsage(guildId)
    const { data: analytics } = useAnalytics(guildId, 7)
    const { data: weeklyData } = useWeeklySubmissions(guildId, 8)
    const { data: leaderboardData } = useAnalyticsLeaderboard(guildId, 7, 5)

    // Daily post submissions for sparkline (last 14 days)
    const sparklineData = analytics?.time_series
        ? analytics.time_series.map((point) => ({
            label: format(parseISO(point.period), 'MMM d'),
            value: point.count,
        }))
        : []

    // Total weekly submission views (latest week)
    const totalWeeklyViews = weeklyData?.weeks && weeklyData.weeks.length > 0
        ? weeklyData.weeks[0].total_views
        : 0

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-6 w-32" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
            </div>
        )
    }

    if (isError) {
        const message = error?.message || 'Failed to load guild'
        const isRateLimit = message.includes('Rate limited')
        return (
            <div className="text-center py-12">
                <p className="text-red-400 mb-2">{isRateLimit ? 'Too many requests' : 'Failed to load guild'}</p>
                <p className="text-gray-400 text-sm mb-4">
                    {isRateLimit ? 'Please wait a moment and try again.' : message}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-accent-purple text-white rounded-md hover:bg-accent-purple/80 transition-colors"
                >
                    Try Again
                </button>
            </div>
        )
    }

    if (!guild) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400">Guild not found</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">{guild.name}</h1>
                    <p className="text-gray-400">{guild.client.name}</p>
                </div>
                {status && (
                    <BotStatus
                        healthy={status.bot_healthy}
                        lastHeartbeat={status.bot?.last_heartbeat}
                        version={status.bot?.version}
                        connectionState={connectionState}
                        onReconnect={reconnect}
                    />
                )}
            </div>

            <GuildTabs guildId={guildId} />

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Brands"
                    value={guild.brands.length}
                    icon="📁"
                />
                <StatCard
                    label="Total Accounts"
                    value={guild.brands.reduce((sum, b) => sum + b.account_count, 0)}
                    icon="👥"
                />
                <StatCard
                    label="Total Posts"
                    value={usage?.posts.total ?? '-'}
                    icon="📝"
                />
                <StatCard
                    label="Pending Jobs"
                    value={status?.pending_jobs ?? '-'}
                    icon="⏳"
                />
            </div>

            {/* Guild Settings */}
            {guild.settings && (
                <GuildSettingsForm guildId={guildId} settings={guild.settings} />
            )}

            {/* Quick Access Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Link
                    href={`/guilds/${guildId}/brands`}
                    className="bg-surface border border-border rounded-sm p-6 hover:border-accent-purple/50 transition-colors"
                >
                    <h3 className="text-lg font-semibold text-white mb-2">Brands</h3>
                    <p className="text-sm text-gray-400">
                        View and manage {guild.brands.length} brands and their account groups
                    </p>
                </Link>

                <Link
                    href={`/guilds/${guildId}/accounts`}
                    className="bg-surface border border-border rounded-sm p-6 hover:border-accent-purple/50 transition-colors"
                >
                    <h3 className="text-lg font-semibold text-white mb-2">Accounts</h3>
                    <p className="text-sm text-gray-400">
                        Browse all tracked social media accounts
                    </p>
                </Link>

                <Link
                    href={`/guilds/${guildId}/posts`}
                    className="bg-surface border border-border rounded-sm p-6 hover:border-accent-purple/50 transition-colors"
                >
                    <h3 className="text-lg font-semibold text-white mb-2">Posts</h3>
                    <p className="text-sm text-gray-400">
                        View submitted posts and their performance metrics
                    </p>
                </Link>
            </div>

            {/* Data Management */}
            <div className="grid gap-4 md:grid-cols-2">
                <Link
                    href={`/guilds/${guildId}/exports`}
                    className="bg-surface border border-border rounded-sm p-6 hover:border-accent-purple/50 transition-colors"
                >
                    <h3 className="text-lg font-semibold text-white mb-2">Exports</h3>
                    <p className="text-sm text-gray-400">
                        Download your tracking data in CSV, JSON, or XLSX format
                    </p>
                </Link>

                <Link
                    href={`/guilds/${guildId}/settings/trash`}
                    className="bg-surface border border-border rounded-sm p-6 hover:border-accent-purple/50 transition-colors"
                >
                    <h3 className="text-lg font-semibold text-white mb-2">Deleted Items</h3>
                    <p className="text-sm text-gray-400">
                        View and restore recently deleted accounts and posts
                    </p>
                </Link>
            </div>

            {/* Analytics Preview */}
            <div className="grid gap-4 md:grid-cols-3 items-start">
                {/* Analytics Sparkline Card - takes 2 columns */}
                <Link
                    href={`/guilds/${guildId}/analytics`}
                    className="md:col-span-2 bg-surface border border-border rounded-sm p-6 hover:border-accent-purple/50 transition-colors"
                >
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-semibold text-white">Daily Post Submissions</h3>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-white">
                                {totalWeeklyViews.toLocaleString()}
                            </span>
                            <p className="text-xs text-gray-400">weekly views</p>
                        </div>
                    </div>
                    <MiniSparkline
                        data={sparklineData}
                        height={64}
                        tooltipLabel="posts"
                    />
                    <p className="text-sm text-accent-purple mt-3">View full analytics →</p>
                </Link>

                {/* Top 5 Leaderboard Preview - takes 1 column */}
                <Leaderboard
                    entries={leaderboardData?.leaderboard ?? []}
                    guildId={guildId}
                    limit={5}
                    showViewAll
                    viewAllHref={`/guilds/${guildId}/analytics`}
                />
            </div>

            {/* Brands Preview */}
            {guild.brands.length > 0 && (
                <div className="bg-surface border border-border rounded-sm p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Brands Overview</h2>
                    <div className="space-y-3">
                        {guild.brands.slice(0, 5).map((brand) => (
                            <div
                                key={brand.id}
                                className="flex items-center justify-between py-2 border-b border-border last:border-0"
                            >
                                <div>
                                    <p className="font-medium text-white">{brand.label}</p>
                                    <p className="text-xs text-gray-500">{brand.slug}</p>
                                </div>
                                <div className="text-right text-sm">
                                    <p className="text-gray-300">{brand.account_count} accounts</p>
                                    <p className="text-gray-500">{brand.group_count} groups</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {guild.brands.length > 5 && (
                        <Link
                            href={`/guilds/${guildId}/brands`}
                            className="block mt-4 text-sm text-accent-purple hover:underline"
                        >
                            View all {guild.brands.length} brands →
                        </Link>
                    )}
                </div>
            )}
        </div>
    )
}
