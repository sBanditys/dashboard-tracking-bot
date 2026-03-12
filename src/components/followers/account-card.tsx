'use client'

import { useState } from 'react'
import Image from 'next/image'
import { format, parseISO } from 'date-fns'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlatformIcon } from '@/components/platform-icon'
import type { AccountFollowerData, FollowerSnapshot, GrowthDelta } from '@/types/followers'
import { FollowerSparkline } from './follower-sparkline'

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E4405F',
  tiktok: '#00f2ea',
  youtube: '#FF0000',
}

function formatFollowerCount(count: number): string {
  return count.toLocaleString('en-US')
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return '—'
  }
}

interface GrowthBadgeProps {
  growth: GrowthDelta | null
  className?: string
}

function GrowthBadge({ growth, className }: GrowthBadgeProps) {
  if (!growth || growth.dataQuality === 'pending') return null

  const { delta, percent } = growth
  const isPositive = delta > 0
  const isNegative = delta < 0
  const color = isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#6b7280'
  const arrow = isPositive ? '▲' : isNegative ? '▼' : '—'
  const sign = isPositive ? '+' : ''

  return (
    <span
      className={cn('text-xs font-medium', className)}
      style={{ color }}
    >
      {arrow} {sign}{formatFollowerCount(Math.abs(delta))} ({sign}{percent.toFixed(1)}%)
    </span>
  )
}

function ProfilePhoto({ account, platformColor }: { account: AccountFollowerData; platformColor: string }) {
  const [imgError, setImgError] = useState(false)

  if (account.profilePhotoUrl && !imgError) {
    return (
      <div className="w-10 h-10 rounded-full overflow-hidden border border-[#404040]">
        <Image
          src={account.profilePhotoUrl}
          alt={account.username}
          width={40}
          height={40}
          className="object-cover w-full h-full"
          unoptimized
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold border border-[#404040]"
      style={{ backgroundColor: platformColor }}
    >
      {account.username.charAt(0).toUpperCase()}
    </div>
  )
}

interface AccountCardProps {
  account: AccountFollowerData
  snapshots?: FollowerSnapshot[]
  onRefresh?: (accountId: string) => void
  isRefreshing?: boolean
}

export function AccountCard({
  account,
  snapshots,
  onRefresh,
  isRefreshing,
}: AccountCardProps) {
  const [expanded, setExpanded] = useState(false)

  const isPending = account.followerCount === null

  // Prepare sparkline data — API returns newest first, reverse to oldest-first
  const sparklineData = snapshots
    ? [...snapshots].reverse().map((s) => ({
        label: s.snapshotDate,
        value: s.followerCount,
      }))
    : []

  const platformColor = PLATFORM_COLORS[account.platform] ?? '#6b7280'

  const handleCardClick = () => {
    if (!isPending) setExpanded((prev) => !prev)
  }

  const handleRefreshClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRefresh?.(account.id)
  }

  return (
    <div
      className={cn(
        'bg-[#2d2d2d] border border-[#404040] rounded-lg px-4 py-3 transition-colors',
        !isPending && 'cursor-pointer hover:bg-[#363636]',
        isPending && 'opacity-60'
      )}
      onClick={handleCardClick}
    >
      {/* Main row */}
      <div className="flex items-center gap-3">
        {/* Profile photo */}
        <div className="flex-shrink-0">
          <ProfilePhoto account={account} platformColor={platformColor} />
        </div>

        {/* Username + platform */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-white truncate">{account.username}</span>
            <PlatformIcon platform={account.platform} size="w-4 h-4" />
          </div>
          {isPending && account.trackingSince && (
            <p className="text-xs text-gray-400 mt-0.5">
              Tracking since {formatDate(account.trackingSince)}
            </p>
          )}
        </div>

        {/* Follower count + growth badge */}
        <div className="flex-shrink-0 text-right">
          {isPending ? (
            <span className="text-xs font-medium bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
              Pending
            </span>
          ) : (
            <>
              <p className="text-sm font-semibold text-white">
                {formatFollowerCount(account.followerCount!)}
              </p>
              <GrowthBadge growth={account.growth7d} />
            </>
          )}
        </div>

        {/* Sparkline */}
        {!isPending && (
          <div className="flex-shrink-0 w-20">
            <FollowerSparkline data={sparklineData} />
          </div>
        )}
      </div>

      {/* Expanded content */}
      {expanded && !isPending && (
        <div
          className="mt-3 pt-3 border-t border-[#404040] space-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
            <span className="font-medium text-gray-300">30d growth:</span>
            <GrowthBadge growth={account.growth30d} />
            <span className="font-medium text-gray-300">Last scraped:</span>
            <span>{formatDate(account.followersLastScrapedAt)}</span>
            <span className="font-medium text-gray-300">Tracking since:</span>
            <span>{formatDate(account.trackingSince)}</span>
          </div>
          {onRefresh && (
            <button
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              className={cn(
                'mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-[#404040]',
                'text-gray-300 hover:text-white hover:border-[#6b7280] transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <RefreshCw className={cn('w-3 h-3', isRefreshing && 'animate-spin')} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
