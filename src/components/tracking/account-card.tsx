'use client'

import { useState } from 'react'
import { PlatformIcon } from '@/components/platform-icon'
import { cn } from '@/lib/utils'
import type { Account } from '@/types/tracking'

interface AccountCardProps {
  account: Account
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatRefreshTime(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getProfileUrl(platform: string, username: string): string {
  const cleanUsername = username.replace(/^@/, '')
  switch (platform.toLowerCase()) {
    case 'instagram':
      return `https://instagram.com/${cleanUsername}`
    case 'tiktok':
      return `https://tiktok.com/@${cleanUsername}`
    case 'youtube':
      return `https://youtube.com/@${cleanUsername}`
    case 'x':
      return `https://x.com/${cleanUsername}`
    default:
      return '#'
  }
}

export function AccountCard({ account }: AccountCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-lg transition-colors',
        'hover:border-accent-purple/50 focus-within:border-accent-purple/50'
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className={cn(
          'w-full p-4 text-left',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'rounded-lg'
        )}
      >
        <div className="flex items-center gap-4">
          {/* Platform Icon */}
          <div className="flex-shrink-0">
            <PlatformIcon platform={account.platform} size="w-6 h-6" />
          </div>

          {/* Username */}
          <div className="flex-1 min-w-0">
            <a
              href={getProfileUrl(account.platform, account.username)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium text-text-primary hover:text-accent-purple truncate inline-block"
            >
              @{account.username}
            </a>
          </div>

          {/* Brand */}
          <div className="hidden sm:block text-sm text-text-secondary truncate max-w-[120px]">
            {account.brand}
          </div>

          {/* Status Badge */}
          <div className="flex-shrink-0">
            {account.is_verified ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400">
                Pending
              </span>
            )}
          </div>

          {/* Expand Icon */}
          <svg
            className={cn(
              'w-4 h-4 text-text-tertiary transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expandable Content */}
      <div
        className={cn(
          'grid transition-all duration-200',
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-0 border-t border-border mt-0">
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {/* Group */}
              {account.group && (
                <div>
                  <span className="text-text-tertiary">Group:</span>{' '}
                  <span className="text-text-primary">{account.group}</span>
                </div>
              )}

              {/* Brand (shown on mobile in expanded) */}
              <div className="sm:hidden">
                <span className="text-text-tertiary">Brand:</span>{' '}
                <span className="text-text-primary">{account.brand}</span>
              </div>

              {/* Created Date */}
              <div>
                <span className="text-text-tertiary">Added:</span>{' '}
                <span className="text-text-primary">{formatDate(account.created_at)}</span>
              </div>

              {/* Refresh Schedule */}
              {account.refresh?.enabled && (
                <div>
                  <span className="text-text-tertiary">Next refresh:</span>{' '}
                  <span className="text-text-primary">
                    {account.refresh.next_refresh
                      ? formatRefreshTime(account.refresh.next_refresh)
                      : 'Scheduled'}
                  </span>
                </div>
              )}

              {/* Verified Date */}
              {account.is_verified && account.verified_at && (
                <div>
                  <span className="text-text-tertiary">Verified:</span>{' '}
                  <span className="text-text-primary">{formatDate(account.verified_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
