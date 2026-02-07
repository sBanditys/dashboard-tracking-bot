'use client'

import { cn } from '@/lib/utils'

interface SelectionBarProps {
  selectedCount: number
  dataType: 'accounts' | 'posts'
  onDelete: () => void
  onExport: () => void
  onReassign?: () => void
  onClear: () => void
}

export function SelectionBar({
  selectedCount,
  dataType,
  onDelete,
  onExport,
  onReassign,
  onClear,
}: SelectionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-0 left-0 md:left-64 right-0 z-40">
      <div className="bg-surface border-t border-border shadow-lg px-6 py-3 flex items-center justify-between">
        {/* Left: Selection count and clear */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-text-primary">
            {selectedCount} selected
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2">
          {/* Export Button */}
          <button
            type="button"
            onClick={onExport}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg',
              'border border-border bg-surface text-text-primary',
              'hover:bg-surface-hover transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:ring-offset-2 focus:ring-offset-background'
            )}
          >
            Export
          </button>

          {/* Reassign Button (only for accounts) */}
          {dataType === 'accounts' && onReassign && (
            <button
              type="button"
              onClick={onReassign}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg',
                'border border-border bg-surface text-text-primary',
                'hover:bg-surface-hover transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:ring-offset-2 focus:ring-offset-background'
              )}
            >
              Reassign
            </button>
          )}

          {/* Delete Button */}
          <button
            type="button"
            onClick={onDelete}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg',
              'bg-red-600 hover:bg-red-700 text-white transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-background'
            )}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
