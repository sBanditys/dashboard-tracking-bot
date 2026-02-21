'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Trophy, Medal, Award, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBonusLeaderboard, centsToDisplay } from '@/hooks/use-bonus'
import type { BonusLeaderboardEntry } from '@/types/bonus'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

// Backend leaderboardQuerySchema max is 52 (from 12-01-SUMMARY.md)
const WEEK_OPTIONS = [
  { label: '4 weeks', value: 4 },
  { label: '8 weeks', value: 8 },
  { label: '12 weeks', value: 12 },
  { label: 'All time', value: 52 },
]

type RankingMetric = 'hit_rate' | 'total_bonus'

// ─────────────────────────────────────────────────────────────
// Hit rate color coding
// ─────────────────────────────────────────────────────────────

function getHitRateColor(percent: number): string {
  if (percent >= 75) return 'text-green-400'
  if (percent >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

// ─────────────────────────────────────────────────────────────
// Podium display for top 3
// ─────────────────────────────────────────────────────────────

interface PodiumBlockProps {
  entry: BonusLeaderboardEntry
  rank: 1 | 2 | 3
}

function PodiumBlock({ entry, rank }: PodiumBlockProps) {
  const config = {
    1: {
      Icon: Trophy,
      color: '#FFD700',
      heightClass: 'h-32',
      label: '1st',
      order: 'order-2',
    },
    2: {
      Icon: Medal,
      color: '#C0C0C0',
      heightClass: 'h-24',
      label: '2nd',
      order: 'order-1',
    },
    3: {
      Icon: Award,
      color: '#CD7F32',
      heightClass: 'h-20',
      label: '3rd',
      order: 'order-3',
    },
  }[rank]

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 flex-1 max-w-[200px]',
        config.order
      )}
    >
      {/* Info card above podium block */}
      <div className="text-center px-3 py-2 bg-surface border border-border rounded-lg w-full">
        <config.Icon
          className="mx-auto mb-1"
          style={{ color: config.color }}
          size={24}
        />
        <div className="text-sm font-semibold text-white truncate">
          {entry.group_label}
        </div>
        <div className="text-xs text-gray-500 truncate mb-1">
          {entry.brand_label}
        </div>
        <div
          className={cn('text-sm font-medium', getHitRateColor(entry.hit_rate_percent))}
        >
          {entry.hit_rate_percent.toFixed(1)}% hit rate
        </div>
        <div className="text-xs text-gray-400">
          {centsToDisplay(entry.total_bonus_cents)} total
        </div>
      </div>

      {/* Podium block */}
      <div
        className={cn(
          'w-full rounded-t-md flex items-end justify-center pb-2',
          config.heightClass,
          rank === 1
            ? 'bg-yellow-500/20 border-t-2 border-x-2 border-yellow-500/40'
            : rank === 2
              ? 'bg-gray-400/10 border-t-2 border-x-2 border-gray-400/30'
              : 'bg-orange-700/10 border-t-2 border-x-2 border-orange-700/30'
        )}
      >
        <span className="text-xs text-gray-500 font-semibold">{config.label}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────

function LeaderboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Controls bar skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="h-8 bg-surface-hover rounded-md w-24" />
          <div className="h-8 bg-surface-hover rounded-md w-28" />
        </div>
        <div className="flex gap-2">
          {WEEK_OPTIONS.map((o) => (
            <div key={o.value} className="h-7 bg-surface-hover rounded-full w-20" />
          ))}
        </div>
      </div>

      {/* Meta bar skeleton */}
      <div className="h-4 bg-surface-hover rounded w-64" />

      {/* Podium skeleton */}
      <div className="flex items-end justify-center gap-4">
        <div className="flex flex-col items-center gap-2 flex-1 max-w-[200px]">
          <div className="h-24 bg-surface-hover rounded-lg w-full" />
          <div className="h-24 bg-surface-hover rounded-t-md w-full" />
        </div>
        <div className="flex flex-col items-center gap-2 flex-1 max-w-[200px]">
          <div className="h-24 bg-surface-hover rounded-lg w-full" />
          <div className="h-32 bg-surface-hover rounded-t-md w-full" />
        </div>
        <div className="flex flex-col items-center gap-2 flex-1 max-w-[200px]">
          <div className="h-24 bg-surface-hover rounded-lg w-full" />
          <div className="h-20 bg-surface-hover rounded-t-md w-full" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-surface-hover rounded-md" />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

interface LeaderboardTabProps {
  guildId: string
}

export function LeaderboardTab({ guildId }: LeaderboardTabProps) {
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>('hit_rate')
  const [weeks, setWeeks] = useState<number>(12)

  const { data, isLoading, isError, refetch } = useBonusLeaderboard(guildId, weeks)

  // Sort client-side based on active metric
  const sortedEntries = data
    ? [...data.leaderboard].sort((a, b) =>
        rankingMetric === 'hit_rate'
          ? b.hit_rate_percent - a.hit_rate_percent
          : b.total_bonus_cents - a.total_bonus_cents
      )
    : []

  const top3 = sortedEntries.slice(0, 3) as (BonusLeaderboardEntry | undefined)[]
  const rest = sortedEntries.slice(3)

  // ── Loading ──────────────────────────────────────────────
  if (isLoading) {
    return <LeaderboardSkeleton />
  }

  // ── Error ────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className="text-sm text-gray-400">Failed to load leaderboard</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-surface border border-border text-gray-300 hover:bg-surface-hover transition-colors"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    )
  }

  // ── Empty state ──────────────────────────────────────────
  if (!data || data.leaderboard.length === 0) {
    return (
      <div>
        {/* Controls still visible in empty state */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <MetricSwitcher value={rankingMetric} onChange={setRankingMetric} />
          <WeekButtons value={weeks} onChange={setWeeks} />
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Trophy size={40} className="text-gray-600" />
          <h3 className="text-base font-semibold text-gray-300">
            No bonus data yet
          </h3>
          <p className="text-sm text-gray-500">
            Create and evaluate rounds to see rankings
          </p>
        </div>
      </div>
    )
  }

  // ── Data ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MetricSwitcher value={rankingMetric} onChange={setRankingMetric} />
        <WeekButtons value={weeks} onChange={setWeeks} />
      </div>

      {/* Meta info bar */}
      <div className="text-xs text-gray-500">
        {data.meta.total_groups} group
        {data.meta.total_groups !== 1 ? 's' : ''} across{' '}
        {data.meta.total_rounds_evaluated} evaluated round
        {data.meta.total_rounds_evaluated !== 1 ? 's' : ''}
        {data.meta.since
          ? ` · Since ${format(new Date(data.meta.since), 'MMM d, yyyy')}`
          : ''}
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-4 py-4">
        {/* Render 2nd, 1st, 3rd in visual order (2nd left, 1st center, 3rd right) */}
        {top3[1] && (
          <PodiumBlock entry={top3[1]} rank={2} />
        )}
        {top3[0] && (
          <PodiumBlock entry={top3[0]} rank={1} />
        )}
        {top3[2] && (
          <PodiumBlock entry={top3[2]} rank={3} />
        )}
      </div>

      {/* Ranked table for entries 4+ */}
      {rest.length > 0 && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[3rem_1fr_1fr_4rem_5rem_5rem_6rem_6rem_6rem] gap-2 px-4 py-2 border-b border-border">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Rank</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Group</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Brand</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider text-right">Rounds</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider text-right">Achieved</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider text-right">Hit Rate</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider text-right">Total Bonus</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider text-right">Paid</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider text-right">Unpaid</div>
          </div>

          {/* Table rows */}
          {rest.map((entry, i) => {
            const rank = i + 4 // 1-3 are in podium
            const unpaidCents = entry.total_bonus_cents - entry.total_paid_cents

            return (
              <div
                key={entry.account_group_id}
                className="grid grid-cols-[3rem_1fr_1fr_4rem_5rem_5rem_6rem_6rem_6rem] gap-2 px-4 py-3 border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors items-center"
              >
                <div className="text-sm text-gray-400 font-mono">#{rank}</div>
                <div className="text-sm text-white truncate">{entry.group_label}</div>
                <div className="text-sm text-gray-400 truncate">{entry.brand_label}</div>
                <div className="text-sm text-gray-300 text-right">
                  {entry.total_rounds}
                </div>
                <div className="text-sm text-gray-300 text-right">
                  {entry.rounds_achieved}
                </div>
                <div
                  className={cn(
                    'text-sm font-medium text-right',
                    getHitRateColor(entry.hit_rate_percent)
                  )}
                >
                  {entry.hit_rate_percent.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-300 text-right">
                  {centsToDisplay(entry.total_bonus_cents)}
                </div>
                <div className="text-sm text-green-400 text-right">
                  {centsToDisplay(entry.total_paid_cents)}
                </div>
                <div className="text-sm text-gray-500 text-right">
                  {centsToDisplay(unpaidCents)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function MetricSwitcher({
  value,
  onChange,
}: {
  value: RankingMetric
  onChange: (v: RankingMetric) => void
}) {
  return (
    <div className="inline-flex bg-surface border border-border rounded-lg p-1 gap-1">
      <button
        type="button"
        onClick={() => onChange('hit_rate')}
        className={cn(
          'px-3 py-1 text-sm font-medium rounded-md transition-all duration-200',
          value === 'hit_rate'
            ? 'bg-accent-purple text-white shadow-sm'
            : 'text-gray-400 hover:text-gray-200'
        )}
      >
        Hit Rate
      </button>
      <button
        type="button"
        onClick={() => onChange('total_bonus')}
        className={cn(
          'px-3 py-1 text-sm font-medium rounded-md transition-all duration-200',
          value === 'total_bonus'
            ? 'bg-accent-purple text-white shadow-sm'
            : 'text-gray-400 hover:text-gray-200'
        )}
      >
        Total Bonus
      </button>
    </div>
  )
}

function WeekButtons({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      {WEEK_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 border',
            value === opt.value
              ? 'bg-accent-purple border-accent-purple text-white'
              : 'bg-surface border-border text-gray-400 hover:text-gray-200 hover:border-gray-500'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
