import { PlatformIcon } from '@/components/platform-icon'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { TopAccountEntry } from '@/types/analytics'

function getProfileUrl(platform: string, username: string): string {
  const handle = username.replace(/^@/, '')
  switch (platform.toLowerCase()) {
    case 'instagram':
      return `https://instagram.com/${handle}`
    case 'tiktok':
      return `https://tiktok.com/@${handle}`
    case 'youtube':
      return `https://youtube.com/@${handle}`
    case 'x':
    case 'twitter':
      return `https://x.com/${handle}`
    case 'facebook':
      return `https://facebook.com/${handle}`
    default:
      return '#'
  }
}

interface TopAccountsProps {
  accounts: TopAccountEntry[]
  className?: string
}

export function TopAccounts({ accounts, className }: TopAccountsProps) {
  return (
    <div className={cn('bg-surface border border-border rounded-sm p-6', className)}>
      <h3 className="text-lg font-semibold text-white mb-4">Top Accounts</h3>

      {accounts.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-sm text-gray-400">No post metrics data yet</p>
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

          <div className="space-y-0">
            {accounts.map((entry, index) => {
              const rank = index + 1
              const rankColor =
                rank === 1
                  ? 'text-yellow-400'
                  : rank === 2
                    ? 'text-gray-300'
                    : rank === 3
                      ? 'text-orange-400'
                      : 'text-gray-400'
              const profileUrl = getProfileUrl(entry.platform, entry.username)

              return (
                <a
                  key={entry.account_id}
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 py-3 border-b border-border last:border-0 items-center hover:bg-surface-hover hover:pl-2 hover:border-l-2 hover:border-l-accent-purple transition-all duration-150 cursor-pointer rounded-sm"
                >
                  <div className={cn('text-lg font-bold w-8', rankColor)}>
                    #{rank}
                  </div>

                  <div className="flex items-center gap-2 min-w-0">
                    <PlatformIcon platform={entry.platform} size="w-5 h-5" />
                    <span className="text-white truncate hover:text-accent-purple transition-colors">
                      {entry.username}
                    </span>
                  </div>

                  <div className="text-gray-300 text-right">
                    {entry.total_views.toLocaleString()}
                  </div>

                  <div className="text-gray-300 text-right">
                    {entry.total_likes.toLocaleString()}
                  </div>

                  <div className="text-gray-400 text-right">
                    {entry.post_count}
                  </div>
                </a>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export function TopAccountsSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-sm p-6">
      <Skeleton className="h-6 w-36 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}
