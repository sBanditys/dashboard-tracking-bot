'use client'

import { cn } from '@/lib/utils'
import { PlatformIcon } from '@/components/platform-icon'
import { safeFormatDistanceToNow } from '@/lib/date-utils'
import type { TrashItem } from '@/hooks/use-trash'

interface TrashItemCardProps {
  item: TrashItem
  onRestore: (itemId: string, dataType: 'accounts' | 'posts') => void
  onPermanentDelete: (itemId: string, dataType: 'accounts' | 'posts') => void
  isRestoring?: boolean
  isDeleting?: boolean
}

function getDataType(type: TrashItem['type']): 'accounts' | 'posts' {
  return type === 'account' ? 'accounts' : 'posts'
}

function getPurgeStyles(daysUntilPurge: number | undefined | null) {
  if (daysUntilPurge == null || isNaN(daysUntilPurge)) {
    return {
      textColor: 'text-gray-400',
      borderColor: '',
      label: 'Pending removal',
    }
  }
  if (daysUntilPurge <= 1) {
    return {
      textColor: 'text-red-400',
      borderColor: 'border-l-2 border-l-red-400',
      label: 'Expires today',
    }
  }
  if (daysUntilPurge <= 7) {
    return {
      textColor: 'text-yellow-400',
      borderColor: 'border-l-2 border-l-yellow-400',
      label: `Expires in ${daysUntilPurge} days`,
    }
  }
  return {
    textColor: 'text-gray-400',
    borderColor: '',
    label: `Expires in ${daysUntilPurge} days`,
  }
}

export function TrashItemCard({
  item,
  onRestore,
  onPermanentDelete,
  isRestoring = false,
  isDeleting = false,
}: TrashItemCardProps) {
  const purge = getPurgeStyles(item.daysUntilPurge)
  const dataType = getDataType(item.type)
  const deletedAgo = safeFormatDistanceToNow(item.deletedAt, { addSuffix: false, fallback: 'recently' })

  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-lg p-4',
        purge.borderColor
      )}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left side: info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {item.platform ? (
            <PlatformIcon platform={item.platform} size="w-5 h-5" />
          ) : (
            <div className="w-5 h-5 rounded bg-gray-700 flex items-center justify-center">
              <span className="text-gray-400 text-xs">?</span>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium truncate">{item.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-md border border-amber-500/30 bg-amber-100/80 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200 shrink-0">
                {item.type === 'account' ? 'Account' : 'Post'}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-400">
                Deleted {deletedAgo} ago
              </span>
              <span className={cn('text-sm', purge.textColor)}>
                {purge.label}
              </span>
            </div>
          </div>
        </div>

        {/* Right side: actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onRestore(item.id, dataType)}
            disabled={isRestoring || isDeleting}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              'text-accent-purple hover:text-accent-purple/80',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isRestoring ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Restoring...
              </span>
            ) : (
              'Restore'
            )}
          </button>

          <button
            type="button"
            onClick={() => onPermanentDelete(item.id, dataType)}
            disabled={isRestoring || isDeleting}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              'text-red-500 hover:text-red-400',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            Delete permanently
          </button>
        </div>
      </div>
    </div>
  )
}
