'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { GroupFollowerStats, AccountFollowerData } from '@/types/followers'

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E4405F',
  tiktok: '#00f2ea',
  youtube: '#FF0000',
}

function formatFollowerCount(count: number): string {
  return count.toLocaleString('en-US')
}

interface GrowthBadgeProps {
  growth: { delta: number; percent: number; accountsWithData: number } | null
  size?: 'sm' | 'md'
}

function GrowthBadge({ growth, size = 'md' }: GrowthBadgeProps) {
  if (!growth) return null

  const { delta, percent } = growth
  const isPositive = delta > 0
  const isNegative = delta < 0
  const color = isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#6b7280'
  const arrow = isPositive ? '▲' : isNegative ? '▼' : '—'
  const sign = isPositive ? '+' : ''

  return (
    <span
      className={cn('font-medium', size === 'sm' ? 'text-xs' : 'text-sm')}
      style={{ color }}
    >
      {arrow} {sign}{formatFollowerCount(Math.abs(delta))} ({sign}{percent.toFixed(1)}%)
    </span>
  )
}

interface StackedAvatarsProps {
  accounts: AccountFollowerData[]
  maxVisible?: number
}

function StackedAvatar({ account, platformColor }: { account: AccountFollowerData; platformColor: string }) {
  const [imgError, setImgError] = useState(false)

  if (account.profilePhotoUrl && !imgError) {
    return (
      <Image
        src={account.profilePhotoUrl}
        alt={account.username}
        width={32}
        height={32}
        className="object-cover w-full h-full"
        unoptimized
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center text-white text-xs font-semibold"
      style={{ backgroundColor: platformColor }}
    >
      {account.username.charAt(0).toUpperCase()}
    </div>
  )
}

function StackedAvatars({ accounts, maxVisible = 5 }: StackedAvatarsProps) {
  const visibleAccounts = accounts.slice(0, maxVisible)
  const overflow = accounts.length - maxVisible

  return (
    <div className="flex items-center">
      {visibleAccounts.map((account, index) => {
        const platformColor = PLATFORM_COLORS[account.platform] ?? '#6b7280'
        return (
          <div
            key={account.id}
            className="w-8 h-8 rounded-full border-2 border-[#2d2d2d] overflow-hidden flex-shrink-0"
            style={{ marginLeft: index === 0 ? 0 : '-8px', zIndex: visibleAccounts.length - index }}
            title={account.username}
          >
            <StackedAvatar account={account} platformColor={platformColor} />
          </div>
        )
      })}
      {overflow > 0 && (
        <div
          className="w-8 h-8 rounded-full border-2 border-[#2d2d2d] bg-[#404040] flex items-center justify-center flex-shrink-0 text-xs text-gray-300 font-medium"
          style={{ marginLeft: '-8px', zIndex: 0 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}

interface GroupCardProps {
  group: { id: string; label: string; brandLabel: string }
  stats: GroupFollowerStats | null
  accounts: AccountFollowerData[]
  onClick: () => void
}

export function GroupCard({ group, stats, accounts, onClick }: GroupCardProps) {
  return (
    <div
      className="bg-[#2d2d2d] border border-[#404040] rounded-lg p-4 cursor-pointer hover:bg-[#363636] transition-colors"
      onClick={onClick}
    >
      {/* Group name + brand */}
      <div className="mb-3">
        <p className="text-sm font-semibold text-white">{group.label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{group.brandLabel}</p>
      </div>

      {/* Stacked avatars */}
      {accounts.length > 0 && (
        <div className="mb-3">
          <StackedAvatars accounts={accounts} />
        </div>
      )}

      {stats ? (
        <>
          {/* Total followers */}
          <div className="mb-2">
            <p className="text-2xl font-bold text-white">
              {formatFollowerCount(stats.totalFollowers)}
            </p>
            <p className="text-xs text-gray-400">total followers</p>
          </div>

          {/* 7d growth */}
          <div className="mb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">7d growth</span>
              <GrowthBadge growth={stats.growth7d} size="sm" />
            </div>
          </div>

          {/* 30d growth (on hover via title tooltip) */}
          {stats.growth30d && (
            <div
              className="group relative"
              title={`30d: ${stats.growth30d.delta > 0 ? '+' : ''}${formatFollowerCount(stats.growth30d.delta)} (${stats.growth30d.delta > 0 ? '+' : ''}${stats.growth30d.percent.toFixed(1)}%)`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">30d growth</span>
                <GrowthBadge growth={stats.growth30d} size="sm" />
              </div>
            </div>
          )}

          {/* Accounts with data counter */}
          {stats.accountsWithData < stats.accountCount && (
            <p className="text-xs text-gray-500 mt-2">
              {stats.accountsWithData} of {stats.accountCount} accounts with data
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-gray-500">Stats unavailable</p>
      )}
    </div>
  )
}
