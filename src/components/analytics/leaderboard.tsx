import Link from 'next/link'
import { PlatformIcon } from '@/components/platform-icon'
import { cn } from '@/lib/utils'
import type { LeaderboardEntry } from '@/types/analytics'

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  limit?: number
  showViewAll?: boolean
  viewAllHref?: string
  className?: string
}

/**
 * Leaderboard component displays top accounts ranked by engagement metrics.
 * Supports preview mode (top 5) with "View all" link, or full list display.
 */
export function Leaderboard({
  entries,
  limit,
  showViewAll = false,
  viewAllHref,
  className,
}: LeaderboardProps) {
  // Apply limit if specified
  const displayedEntries = limit ? entries.slice(0, limit) : entries

  return (
    <div className={cn('bg-surface border border-border rounded-sm p-6', className)}>
      <h3 className="text-lg font-semibold text-white mb-4">Top Accounts</h3>

      {entries.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-sm text-gray-400">No engagement data yet</p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 pb-3 border-b border-border mb-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Rank</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Account</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider text-right">Views</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider text-right">Likes</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider text-right">Posts</div>
          </div>

          {/* Leaderboard rows */}
          <div className="space-y-0">
            {displayedEntries.map((entry, index) => {
              const rank = index + 1
              // Medal colors for top 3
              const rankColor =
                rank === 1
                  ? 'text-yellow-400' // Gold
                  : rank === 2
                    ? 'text-gray-300' // Silver
                    : rank === 3
                      ? 'text-orange-400' // Bronze
                      : 'text-gray-400'

              return (
                <div
                  key={entry.account_id}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 py-3 border-b border-border last:border-0 items-center"
                >
                  {/* Rank */}
                  <div className={cn('text-lg font-bold w-8', rankColor)}>
                    #{rank}
                  </div>

                  {/* Account (icon + username) */}
                  <div className="flex items-center gap-2 min-w-0">
                    <PlatformIcon platform={entry.platform} size="w-5 h-5" />
                    <span className="text-white truncate">{entry.username}</span>
                  </div>

                  {/* Views */}
                  <div className="text-gray-300 text-right">
                    {entry.total_views.toLocaleString()}
                  </div>

                  {/* Likes */}
                  <div className="text-gray-300 text-right">
                    {entry.total_likes.toLocaleString()}
                  </div>

                  {/* Posts */}
                  <div className="text-gray-400 text-right">
                    {entry.post_count}
                  </div>
                </div>
              )
            })}
          </div>

          {/* "View all" link */}
          {showViewAll && viewAllHref && entries.length > 0 && (
            <div className="mt-4 text-center">
              <Link
                href={viewAllHref}
                className="text-sm text-accent-purple hover:underline"
              >
                View all
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
