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

function getProfileUrl(platform: string, username: string): string {
  const clean = username.replace(/^@/, '')
  switch (platform.toLowerCase()) {
    case 'instagram':
      return `https://www.instagram.com/${clean}/`
    case 'tiktok':
      return `https://www.tiktok.com/@${clean}`
    case 'youtube':
      return `https://www.youtube.com/@${clean}`
    default:
      return '#'
  }
}

function formatFollowerCount(count: number): string {
  return count.toLocaleString('en-US')
}

function formatCompact(count: number): string {
  if (count >= 1_000_000) return `${(Math.floor(count / 100_000) / 10).toFixed(1)}M`
  if (count >= 1_000) return `${(Math.floor(count / 100) / 10).toFixed(1)}K`
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

function ProfilePhoto({
  account,
  platformColor,
  size = 'sm',
}: {
  account: AccountFollowerData
  platformColor: string
  size?: 'sm' | 'lg'
}) {
  const [imgError, setImgError] = useState(false)
  const px = size === 'lg' ? 80 : 40
  const cls = size === 'lg' ? 'w-20 h-20' : 'w-10 h-10'
  const textCls = size === 'lg' ? 'text-2xl' : 'text-sm'

  if (account.profilePhotoUrl && !imgError) {
    return (
      <div className={cn(cls, 'rounded-full overflow-hidden border border-border')}>
        <Image
          src={account.profilePhotoUrl}
          alt={account.username}
          width={px}
          height={px}
          className="object-cover w-full h-full"
          unoptimized
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(cls, 'rounded-full flex items-center justify-center text-white font-semibold border border-border', textCls)}
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
  const [expanded, setExpanded] = useState(true)

  const isPending = account.followerCount === null
  const isDeactivated = !!account.deactivatedAt

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
        'bg-surface border border-border rounded-lg transition-colors',
        !isPending && 'cursor-pointer hover:bg-surface',
        isPending && 'opacity-60'
      )}
      onClick={handleCardClick}
    >
      {/* Pending state */}
      {isPending && (
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-shrink-0">
            <ProfilePhoto account={account} platformColor={platformColor} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-white truncate">{account.username}</span>
              <PlatformIcon platform={account.platform} size="w-4 h-4" />
            </div>
            {account.trackingSince && (
              <p className="text-xs text-gray-400 mt-0.5">
                Tracking since {formatDate(account.trackingSince)}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-medium bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
              Pending
            </span>
            {isDeactivated && (
              <span className="text-xs font-medium bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                Deactivated
              </span>
            )}
          </div>
        </div>
      )}

      {/* Profile card */}
      {!isPending && (
        <div className="px-4 py-4">
          <div className="flex gap-5">
            {/* Large profile photo */}
            <div className="flex-shrink-0">
              <ProfilePhoto account={account} platformColor={platformColor} size="lg" />
            </div>

            {/* Profile info */}
            <div className="flex-1 min-w-0">
              {/* Username + platform */}
              <div className="flex items-center gap-2">
                <a
                  href={getProfileUrl(account.platform, account.username)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold text-white hover:underline"
                >
                  {account.username}
                </a>
                <PlatformIcon platform={account.platform} size="w-5 h-5" />
                {isDeactivated && (
                  <span className="text-xs font-medium bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                    Deactivated
                  </span>
                )}
              </div>

              {/* Display name */}
              {account.displayName && (
                <p className="text-sm text-gray-400 mt-0.5">{account.displayName}</p>
              )}

              {/* Stats row — Instagram-style horizontal */}
              <div className="flex items-center gap-5 mt-3">
                {account.platformPostCount != null && (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">{formatCompact(account.platformPostCount)}</p>
                    <p className="text-xs text-gray-400">posts</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">{formatCompact(account.followerCount!)}</p>
                  <p className="text-xs text-gray-400">followers</p>
                </div>
                {account.growth7d && account.growth7d.dataQuality !== 'pending' && (
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: account.growth7d.delta >= 0 ? '#22c55e' : '#ef4444' }}>
                      {account.growth7d.delta >= 0 ? '+' : ''}{formatCompact(account.growth7d.delta)}
                    </p>
                    <p className="text-xs text-gray-400">7d growth</p>
                  </div>
                )}
                {account.growth30d && account.growth30d.dataQuality !== 'pending' && (
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: account.growth30d.delta >= 0 ? '#22c55e' : '#ef4444' }}>
                      {account.growth30d.delta >= 0 ? '+' : ''}{formatCompact(account.growth30d.delta)}
                    </p>
                    <p className="text-xs text-gray-400">30d growth</p>
                  </div>
                )}
              </div>

              {/* Biography */}
              {account.biography && (
                <p className="text-xs text-gray-300 mt-3 whitespace-pre-line line-clamp-4">{account.biography}</p>
              )}

              {/* Link in bio */}
              {account.externalUrl && (
                <a
                  href={account.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline mt-1 block truncate"
                >
                  {account.externalUrl.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>

          {/* Bottom details row */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border text-xs text-gray-400 flex-wrap">
            {account.postStats && (
              <>
                <span><span className="text-gray-300 font-medium">{account.postStats.total}</span> tracked</span>
                <span><span className="text-gray-300 font-medium">{account.postStats.last7d}</span> posts 7d</span>
                <span><span className="text-gray-300 font-medium">{account.postStats.last30d}</span> posts 30d</span>
              </>
            )}
            {account.followersLastScrapedAt && (
              <span>Scraped {formatDate(account.followersLastScrapedAt)}</span>
            )}
            {account.trackingSince && (
              <span>Since {formatDate(account.trackingSince)}</span>
            )}
            {onRefresh && (
              <button
                onClick={handleRefreshClick}
                disabled={isRefreshing}
                className={cn(
                  'ml-auto flex items-center gap-1.5 text-xs px-3 py-1 rounded border border-border',
                  'text-gray-300 hover:text-white hover:border-border transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <RefreshCw className={cn('w-3 h-3', isRefreshing && 'animate-spin')} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
