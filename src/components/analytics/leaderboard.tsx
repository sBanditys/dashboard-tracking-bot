import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { LeaderboardEntry } from '@/types/analytics'

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  guildId?: string
  limit?: number
  showViewAll?: boolean
  viewAllHref?: string
  className?: string
}

export function Leaderboard({
  entries,
  guildId,
  limit,
  showViewAll = false,
  viewAllHref,
  className,
}: LeaderboardProps) {
  const displayedEntries = limit ? entries.slice(0, limit) : entries

  return (
    <div className={cn('bg-surface border border-border rounded-sm p-6', className)}>
      <h3 className="text-lg font-semibold text-white mb-4">Top Account Groups</h3>

      {entries.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-sm text-gray-400">No submission data yet</p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_auto] gap-4 pb-3 border-b border-border mb-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Rank</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Group</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider text-right">Total Views</div>
          </div>

          {/* Leaderboard rows */}
          <div className="space-y-0">
            {displayedEntries.map((entry, index) => {
              const rank = index + 1
              const rankColor =
                rank === 1
                  ? 'text-yellow-400'
                  : rank === 2
                    ? 'text-gray-300'
                    : rank === 3
                      ? 'text-orange-400'
                      : 'text-gray-400'

              const href = guildId
                ? `/guilds/${guildId}/accounts?group=${encodeURIComponent(entry.group_label)}`
                : undefined

              const content = (
                <>
                  <div className={cn('text-lg font-bold w-8', rankColor)}>
                    #{rank}
                  </div>

                  <div className="min-w-0">
                    <span className="text-white truncate block">{entry.group_label}</span>
                    <div className="flex gap-2 mt-1">
                      {entry.instagram_views > 0 && (
                        <span className="text-xs text-gray-500">IG: {entry.instagram_views.toLocaleString()}</span>
                      )}
                      {entry.tiktok_views > 0 && (
                        <span className="text-xs text-gray-500">TT: {entry.tiktok_views.toLocaleString()}</span>
                      )}
                      {entry.youtube_views > 0 && (
                        <span className="text-xs text-gray-500">YT: {entry.youtube_views.toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-gray-300 text-right font-medium">
                    {entry.total_views.toLocaleString()}
                  </div>
                </>
              )

              const gridClass = 'grid grid-cols-[auto_1fr_auto] gap-4 py-3 border-b border-border last:border-0 items-center'

              return href ? (
                <Link
                  key={entry.group_id}
                  href={href}
                  className={cn(gridClass, 'pl-2 border-l-2 border-l-transparent hover:bg-surface-hover hover:border-l-accent-purple transition-all duration-150 cursor-pointer rounded-sm')}
                >
                  {content}
                </Link>
              ) : (
                <div key={entry.group_id} className={gridClass}>
                  {content}
                </div>
              )
            })}
          </div>

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
