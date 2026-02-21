'use client'

import { useState } from 'react'
import { Trophy, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBonusRounds } from '@/hooks/use-bonus'
import { RoundCard } from '@/components/bonus/round-card'
import { RoundCardSkeleton } from '@/components/bonus/round-card-skeleton'
import type { RoundFilter } from '@/types/bonus'

interface RoundsTabProps {
  guildId: string
  isAdmin: boolean
  onOpenCreate?: () => void
}

const FILTER_TABS: { id: RoundFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'evaluated', label: 'Evaluated' },
  { id: 'pending', label: 'Pending' },
]

/**
 * Bonus rounds list with filter tabs, accordion expansion, and Load More pagination.
 */
export function RoundsTab({ guildId, isAdmin, onOpenCreate }: RoundsTabProps) {
  const [filter, setFilter] = useState<RoundFilter>('all')
  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(null)

  const { rounds, hasMore, loadMore, isLoading, isError, reset } = useBonusRounds(
    guildId,
    filter
  )

  function handleFilterChange(f: RoundFilter) {
    setFilter(f)
    setExpandedRoundId(null) // collapse any open card on filter change
  }

  function handleToggle(roundId: string) {
    setExpandedRoundId((prev) => (prev === roundId ? null : roundId))
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="inline-flex bg-surface border border-border rounded-lg p-1 gap-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleFilterChange(tab.id)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
              filter === tab.id
                ? 'bg-accent-purple text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            )}
            aria-selected={filter === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && rounds.length === 0 && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <RoundCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="text-center py-10 space-y-3">
          <p className="text-red-400 text-sm">Failed to load bonus rounds.</p>
          <button
            type="button"
            onClick={() => {
              reset()
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-surface-hover text-gray-300 hover:text-white transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && rounds.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <Trophy className="mx-auto h-10 w-10 text-gray-600" />
          <div>
            <p className="text-gray-300 font-medium">No bonus rounds yet</p>
            <p className="text-gray-500 text-sm mt-1">
              {filter !== 'all'
                ? `No ${filter} rounds found. Try a different filter.`
                : 'Get started by creating your first bonus round.'}
            </p>
          </div>
          {isAdmin && filter === 'all' && (
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-accent-purple hover:bg-accent-purple/80 text-white transition-colors"
              onClick={() => onOpenCreate?.()}
            >
              <Trophy className="h-4 w-4" />
              Create Round
            </button>
          )}
        </div>
      )}

      {/* Rounds list */}
      {rounds.length > 0 && (
        <div className="space-y-2">
          {rounds.map((round) => (
            <RoundCard
              key={round.id}
              round={round}
              expanded={expandedRoundId === round.id}
              onToggle={() => handleToggle(round.id)}
              guildId={guildId}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && !isError && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-md bg-surface-hover border border-border text-gray-300 hover:text-white transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
