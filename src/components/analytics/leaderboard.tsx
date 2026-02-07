import Image from 'next/image'
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

const AVATAR_COLORS = [
  'bg-purple-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-red-500',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
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

  // Compute platform totals from all entries (not just displayed)
  const totals = entries.reduce(
    (acc, e) => ({
      total: acc.total + e.total_views,
      ig: acc.ig + e.instagram_views,
      tt: acc.tt + e.tiktok_views,
      yt: acc.yt + e.youtube_views,
      fb: acc.fb + e.facebook_views,
      x: acc.x + e.x_views,
    }),
    { total: 0, ig: 0, tt: 0, yt: 0, fb: 0, x: 0 }
  )

  const pct = (v: number) => totals.total > 0 ? ((v / totals.total) * 100).toFixed(1) : '0'

  const platformCounters = [
    { label: 'IG', value: totals.ig, color: 'text-pink-400' },
    { label: 'TT', value: totals.tt, color: 'text-cyan-400' },
    { label: 'YT', value: totals.yt, color: 'text-red-400' },
    { label: 'FB', value: totals.fb, color: 'text-blue-400' },
    { label: 'X', value: totals.x, color: 'text-gray-300' },
  ].filter((p) => p.value > 0)

  return (
    <div className={cn('bg-surface border border-border rounded-sm p-6', className)}>
      <h3 className="text-lg font-semibold text-white mb-4">Top Account Groups</h3>

      {/* Platform view counters */}
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="bg-surface-hover border border-border rounded-sm px-3 py-2 min-w-[80px]">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Total</div>
            <div className="text-sm font-semibold text-white">{totals.total.toLocaleString()}</div>
          </div>
          {platformCounters.map((p) => (
            <div key={p.label} className="bg-surface-hover border border-border rounded-sm px-3 py-2 min-w-[80px]">
              <div className={cn('text-xs uppercase tracking-wider', p.color)}>{p.label}</div>
              <div className="text-sm font-semibold text-white">
                {p.value.toLocaleString()}
                <span className="text-xs text-gray-500 ml-1">{pct(p.value)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-sm text-gray-400">No submission data yet</p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_auto] gap-3 pb-2 border-b border-border">
            <div className="text-xs text-gray-500 uppercase tracking-wider w-8">Rank</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Group</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider text-right">Total Views</div>
          </div>

          {/* Leaderboard rows */}
          <div>
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

              const ownerInitial = entry.owner_username
                ? entry.owner_username.charAt(0).toUpperCase()
                : null

              const content = (
                <>
                  <div className={cn('text-lg font-bold w-8', rankColor)}>
                    #{rank}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white truncate">{entry.group_label}</span>
                      {entry.owner_username && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-gray-500">-</span>
                          {entry.owner_avatar_url ? (
                            <Image
                              src={entry.owner_avatar_url}
                              alt={entry.owner_username}
                              width={20}
                              height={20}
                              className="w-5 h-5 rounded-full shrink-0"
                            />
                          ) : (
                            <div className={cn(
                              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0',
                              getAvatarColor(entry.owner_username)
                            )}>
                              {ownerInitial}
                            </div>
                          )}
                          <span className="text-xs text-gray-400 truncate max-w-[80px]">
                            {entry.owner_username}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-0.5">
                      {entry.instagram_views > 0 && (
                        <span className="text-xs text-gray-500">IG: {entry.instagram_views.toLocaleString()}</span>
                      )}
                      {entry.tiktok_views > 0 && (
                        <span className="text-xs text-gray-500">TT: {entry.tiktok_views.toLocaleString()}</span>
                      )}
                      {entry.youtube_views > 0 && (
                        <span className="text-xs text-gray-500">YT: {entry.youtube_views.toLocaleString()}</span>
                      )}
                      {entry.facebook_views > 0 && (
                        <span className="text-xs text-gray-500">FB: {entry.facebook_views.toLocaleString()}</span>
                      )}
                      {entry.x_views > 0 && (
                        <span className="text-xs text-gray-500">X: {entry.x_views.toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-gray-300 font-medium">
                      {entry.total_views.toLocaleString()}
                    </div>
                    {entry.previous_total_views > 0 ? (
                      <div className={cn(
                        'text-xs flex items-center justify-end gap-0.5',
                        entry.total_views >= entry.previous_total_views ? 'text-green-400' : 'text-red-400'
                      )}>
                        <span>{entry.total_views >= entry.previous_total_views ? '\u2191' : '\u2193'}</span>
                        <span>
                          {Math.abs(
                            Math.round(((entry.total_views - entry.previous_total_views) / entry.previous_total_views) * 100)
                          )}%
                        </span>
                      </div>
                    ) : entry.total_views > 0 ? (
                      <div className="text-xs text-green-400 flex items-center justify-end gap-0.5">
                        <span>{'\u2191'}</span>
                        <span>new</span>
                      </div>
                    ) : null}
                  </div>
                </>
              )

              const rowClass = 'grid grid-cols-[auto_1fr_auto] gap-3 py-2.5 border-b border-border items-center'

              return href ? (
                <Link
                  key={entry.group_id}
                  href={href}
                  className={cn(rowClass, 'pl-2 border-l-2 border-l-transparent hover:bg-surface-hover hover:border-l-accent-purple transition-all duration-150 cursor-pointer rounded-sm')}
                >
                  {content}
                </Link>
              ) : (
                <div key={entry.group_id} className={rowClass}>
                  {content}
                </div>
              )
            })}
          </div>

          {showViewAll && viewAllHref && entries.length > 0 && (
            <div className="mt-3 text-center">
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
