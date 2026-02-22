'use client'

import { Info, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { centsToDisplay, useBonusResults } from '@/hooks/use-bonus'

interface ResultsTabProps {
  roundId: string
  guildId: string
  evaluated: boolean
}

/**
 * Skeleton for a single result row.
 */
function ResultRowSkeleton() {
  return (
    <div className="py-3 space-y-2 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-4 bg-surface-hover rounded w-32" />
        <div className="h-4 bg-surface-hover rounded w-20" />
      </div>
      <div className="h-2 bg-surface-hover rounded w-full" />
    </div>
  )
}

/**
 * Results tab for an evaluated bonus round.
 * Shows summary stats and per-target progress bars with near-miss highlighting.
 */
export function ResultsTab({ roundId, guildId, evaluated }: ResultsTabProps) {
  const { data, isLoading, isError, refetch } = useBonusResults(guildId, roundId, evaluated)

  if (!evaluated) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-hover/30 border border-border text-gray-400">
        <Info className="h-5 w-5 mt-0.5 flex-shrink-0 text-gray-500" />
        <p className="text-sm">
          Results will be available after this round is evaluated.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Summary stat card skeletons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-hover rounded-lg p-3 animate-pulse space-y-1">
              <div className="h-6 bg-surface rounded w-10" />
              <div className="h-3 bg-surface rounded w-16" />
            </div>
          ))}
        </div>
        {/* Row skeletons */}
        <div className="divide-y divide-border/50">
          {Array.from({ length: 4 }).map((_, i) => (
            <ResultRowSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-sm text-red-400">Failed to load results</p>
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

  const { summary, results } = data

  const statCards = [
    {
      label: 'Achieved',
      value: summary.achieved_count,
      color: 'text-green-400',
      bg: 'bg-green-900/20 border-green-900/40',
    },
    {
      label: 'Missed',
      value: summary.missed_count,
      color: 'text-red-400',
      bg: 'bg-red-900/20 border-red-900/40',
    },
    {
      label: 'Near Miss',
      value: summary.near_miss_count,
      color: 'text-yellow-400',
      bg: 'bg-yellow-900/20 border-yellow-900/40',
    },
    {
      label: 'Total Bonus',
      value: centsToDisplay(summary.total_bonus_cents),
      color: 'text-purple-400',
      bg: 'bg-purple-900/20 border-purple-900/40',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={cn(
              'rounded-lg p-3 border',
              card.bg
            )}
          >
            <div className={cn('text-2xl font-bold', card.color)}>
              {card.value}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Results list */}
      <div className="divide-y divide-border/50">
        {results.map((result) => {
          const pct = Math.min(100, (result.actual_views / result.target_views) * 100)
          const barColor = result.achieved
            ? 'bg-green-500'
            : result.near_miss
            ? 'bg-yellow-500'
            : 'bg-red-500'

          return (
            <div key={result.account_group_id} className="py-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-white truncate">
                    {result.account_group_label}
                  </span>
                  {result.near_miss && !result.achieved && (
                    <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-900/50 text-yellow-400 border border-yellow-800/40">
                      Near Miss
                    </span>
                  )}
                  {result.brand_label && (
                    <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-surface-hover text-gray-400">
                      {result.brand_label}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0 tabular-nums">
                  <span className={cn(
                    'font-medium',
                    result.achieved ? 'text-green-400' : result.near_miss ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {result.actual_views.toLocaleString()}
                  </span>
                  {' / '}
                  {result.target_views.toLocaleString()}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full rounded-full bg-surface-hover overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', barColor)}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Delta info */}
              <div className="text-xs text-gray-500">
                {result.delta > 0 ? '+' : ''}{result.delta.toLocaleString()} views
                ({result.delta_percent > 0 ? '+' : ''}{result.delta_percent.toFixed(1)}%)
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
