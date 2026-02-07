import { PlatformIcon } from '@/components/platform-icon'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { TopAccountEntry } from '@/types/analytics'

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

              return (
                <div
                  key={entry.account_id}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 py-3 border-b border-border last:border-0 items-center"
                >
                  <div className={cn('text-lg font-bold w-8', rankColor)}>
                    #{rank}
                  </div>

                  <div className="flex items-center gap-2 min-w-0">
                    <PlatformIcon platform={entry.platform} size="w-5 h-5" />
                    <span className="text-white truncate">{entry.username}</span>
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
                </div>
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
