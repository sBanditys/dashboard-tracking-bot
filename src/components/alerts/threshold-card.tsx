'use client'

import { useState } from 'react'
import { Eye, Heart, MessageCircle, Share2, Users, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useToggleThreshold } from '@/hooks/use-alerts'
import { cn } from '@/lib/utils'
import type { AlertThreshold, MetricType, Platform } from '@/types/alert'

interface ThresholdCardProps {
  threshold: AlertThreshold
  guildId: string
  onDelete: (threshold: AlertThreshold) => void
  isNew?: boolean
  isRemoving?: boolean
  isSelected?: boolean
  onSelect?: (id: string) => void
}

function getMetricIcon(metricType: MetricType) {
  switch (metricType) {
    case 'views':
      return <Eye className="w-5 h-5" />
    case 'likes':
      return <Heart className="w-5 h-5" />
    case 'comments':
      return <MessageCircle className="w-5 h-5" />
    case 'shares':
      return <Share2 className="w-5 h-5" />
    case 'followers':
      return <Users className="w-5 h-5" />
  }
}

function getMetricLabel(metricType: MetricType): string {
  switch (metricType) {
    case 'views':
      return 'Views'
    case 'likes':
      return 'Likes'
    case 'comments':
      return 'Comments'
    case 'shares':
      return 'Shares'
    case 'followers':
      return 'Followers'
  }
}

function getPlatformBadge(platform: Platform | null) {
  if (!platform) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">
        All platforms
      </span>
    )
  }
  switch (platform) {
    case 'instagram':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-500/20 text-pink-300">
          Instagram
        </span>
      )
    case 'tiktok':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700/60 text-gray-200">
          TikTok
        </span>
      )
    case 'youtube':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300">
          YouTube
        </span>
      )
    case 'x':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300">
          X
        </span>
      )
    case 'facebook':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
          Facebook
        </span>
      )
  }
}

function formatThresholdValue(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`
  }
  return value.toLocaleString()
}

export function ThresholdCard({
  threshold,
  guildId,
  onDelete,
  isNew = false,
  isRemoving = false,
  isSelected = false,
  onSelect,
}: ThresholdCardProps) {
  const [isToggling, setIsToggling] = useState(false)
  const toggleMutation = useToggleThreshold(guildId)

  const handleToggle = async () => {
    setIsToggling(true)
    try {
      await toggleMutation.mutateAsync({
        groupId: threshold.accountGroupId,
        thresholdId: threshold.id,
        enabled: !threshold.enabled,
      })
    } finally {
      setIsToggling(false)
    }
  }

  const lastTriggeredText = threshold.lastTriggered
    ? formatDistanceToNow(new Date(threshold.lastTriggered), { addSuffix: true })
    : 'Never triggered'

  const lastTriggeredAbsolute = threshold.lastTriggered
    ? new Date(threshold.lastTriggered).toLocaleString()
    : undefined

  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-lg p-4 transition-all duration-300',
        isNew && 'animate-fadeSlideIn',
        isRemoving && 'opacity-0 max-h-0 mb-0 overflow-hidden',
        isSelected && 'border-accent-purple bg-accent-purple/5',
        !isSelected && 'hover:border-border/80'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox (bulk selection) */}
        {onSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(threshold.id)}
            className="mt-1 h-4 w-4 rounded border-border text-accent-purple focus:ring-accent-purple"
            aria-label={`Select threshold ${threshold.id}`}
          />
        )}

        {/* Metric icon */}
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-background flex items-center justify-center text-gray-400">
          {getMetricIcon(threshold.metricType)}
        </div>

        {/* Center content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white">
              {getMetricLabel(threshold.metricType)} &gt; {formatThresholdValue(threshold.thresholdValue)}
            </span>
            {getPlatformBadge(threshold.platform)}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {threshold.accountGroup.label}
          </p>
        </div>

        {/* Right side: toggle + delete */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Toggle switch */}
          <button
            type="button"
            role="switch"
            aria-checked={threshold.enabled}
            aria-label="Toggle threshold"
            onClick={handleToggle}
            disabled={isToggling}
            className={cn(
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple/50',
              threshold.enabled ? 'bg-accent-purple' : 'bg-gray-600',
              isToggling && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isToggling ? (
              <span className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-3 h-3 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              </span>
            ) : (
              <span
                className={cn(
                  'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                  threshold.enabled ? 'translate-x-5' : 'translate-x-1'
                )}
              />
            )}
          </button>

          {/* Delete button */}
          <button
            type="button"
            onClick={() => onDelete(threshold)}
            aria-label="Delete threshold"
            className="p-1 text-gray-500 hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom: last triggered */}
      <div className="mt-3 flex items-center justify-between">
        <span
          className="text-xs text-gray-500"
          title={lastTriggeredAbsolute}
        >
          {threshold.lastTriggered ? `Last triggered ${lastTriggeredText}` : lastTriggeredText}
        </span>
        <span className={cn(
          'text-xs font-medium',
          threshold.enabled ? 'text-green-400' : 'text-gray-500'
        )}>
          {threshold.enabled ? 'Active' : 'Disabled'}
        </span>
      </div>
    </div>
  )
}
