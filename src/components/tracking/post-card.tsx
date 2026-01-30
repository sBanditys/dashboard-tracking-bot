'use client'

import { useState } from 'react'
import { PlatformIcon } from '@/components/platform-icon'
import { cn } from '@/lib/utils'
import type { Post } from '@/types/tracking'

interface PostCardProps {
  post: Post
}

function formatNumber(num: number | null): string {
  if (num === null) return '-'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function formatTimestamp(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

type StatusColor = {
  bg: string
  text: string
}

function getStatusStyles(status: string): StatusColor {
  const normalizedStatus = status.toLowerCase()

  if (normalizedStatus === 'done' || normalizedStatus === 'verified') {
    return { bg: 'bg-green-500/10', text: 'text-green-400' }
  }
  if (normalizedStatus === 'pending') {
    return { bg: 'bg-yellow-500/10', text: 'text-yellow-400' }
  }
  if (normalizedStatus === 'processing') {
    return { bg: 'bg-blue-500/10', text: 'text-blue-400' }
  }
  if (normalizedStatus === 'failed') {
    return { bg: 'bg-red-500/10', text: 'text-red-400' }
  }
  // Default for unknown statuses
  return { bg: 'bg-gray-500/10', text: 'text-gray-400' }
}

export function PostCard({ post }: PostCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const statusStyles = getStatusStyles(post.status)

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
            <PlatformIcon platform={post.platform} size="w-6 h-6" />
          </div>

          {/* Author Handle */}
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-text-primary truncate inline-block">
              {post.author_handle ? `@${post.author_handle}` : 'Unknown'}
            </span>
          </div>

          {/* Brand/Group */}
          <div className="hidden sm:block text-sm text-text-secondary truncate max-w-[100px]">
            {post.brand || post.group || '-'}
          </div>

          {/* Status Badge */}
          <div className="flex-shrink-0">
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                statusStyles.bg,
                statusStyles.text
              )}
            >
              {post.status}
            </span>
          </div>

          {/* Timestamp */}
          <div className="hidden sm:block text-xs text-text-tertiary whitespace-nowrap">
            {formatTimestamp(post.posted_at || post.submitted_at)}
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
            <div className="pt-4 space-y-4">
              {/* Metrics Row */}
              {post.metrics && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-text-tertiary block">Views</span>
                    <span className="text-text-primary font-medium">
                      {formatNumber(post.metrics.views)}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-tertiary block">Likes</span>
                    <span className="text-text-primary font-medium">
                      {formatNumber(post.metrics.likes)}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-tertiary block">Comments</span>
                    <span className="text-text-primary font-medium">
                      {formatNumber(post.metrics.comments)}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-tertiary block">Shares</span>
                    <span className="text-text-primary font-medium">
                      {formatNumber(post.metrics.shares)}
                    </span>
                  </div>
                </div>
              )}

              {/* Status Reason (if failed) */}
              {post.status_reason && (
                <div className="text-sm">
                  <span className="text-text-tertiary">Reason:</span>{' '}
                  <span className="text-red-400">{post.status_reason}</span>
                </div>
              )}

              {/* Mobile-only Brand/Timestamp */}
              <div className="sm:hidden text-sm space-y-1">
                {(post.brand || post.group) && (
                  <div>
                    <span className="text-text-tertiary">Brand:</span>{' '}
                    <span className="text-text-primary">{post.brand || post.group}</span>
                  </div>
                )}
                <div>
                  <span className="text-text-tertiary">Posted:</span>{' '}
                  <span className="text-text-primary">
                    {formatTimestamp(post.posted_at || post.submitted_at)}
                  </span>
                </div>
              </div>

              {/* Last Checked */}
              <div className="text-sm text-text-tertiary">
                Last checked: {formatRelativeTime(post.last_checked_at)}
              </div>

              {/* View Original Link */}
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'inline-flex items-center gap-1.5 text-sm font-medium',
                  'text-accent-purple hover:text-accent-purple/80 transition-colors'
                )}
              >
                View Original Post
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
