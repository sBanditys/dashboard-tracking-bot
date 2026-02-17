'use client'

import { cn } from '@/lib/utils'

interface ThresholdBulkBarProps {
  selectedCount: number
  onEnableAll: () => void
  onDisableAll: () => void
  onDelete: () => void
  onSelectAll: () => void
  onDeselectAll: () => void
  isAllSelected: boolean
  isLoading: boolean
  activeAction?: 'enable' | 'disable' | 'delete' | null
}

function Spinner() {
  return (
    <svg
      className="w-3.5 h-3.5 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
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
  )
}

export function ThresholdBulkBar({
  selectedCount,
  onEnableAll,
  onDisableAll,
  onDelete,
  onSelectAll,
  onDeselectAll,
  isAllSelected,
  isLoading,
  activeAction,
}: ThresholdBulkBarProps) {
  if (selectedCount === 0) return null

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 md:left-64 z-40',
        'transition-all duration-200',
        selectedCount > 0 ? 'translate-y-0' : 'translate-y-full'
      )}
      role="toolbar"
      aria-label="Bulk actions"
    >
      <div className="bg-surface border-t border-border shadow-lg px-6 py-3 flex items-center justify-between">
        {/* Left: count + select/deselect */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-text-primary">
            {selectedCount} selected
          </span>
          <button
            type="button"
            onClick={isAllSelected ? onDeselectAll : onSelectAll}
            disabled={isLoading}
            className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isAllSelected ? 'Deselect all thresholds' : 'Select all visible thresholds'}
          >
            {isAllSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2">
          {/* Enable All */}
          <button
            type="button"
            onClick={onEnableAll}
            disabled={isLoading}
            aria-label="Enable all selected thresholds"
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              'bg-green-600 hover:bg-green-700 text-white',
              'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-background',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoading && activeAction === 'enable' && <Spinner />}
            Enable All
          </button>

          {/* Disable All */}
          <button
            type="button"
            onClick={onDisableAll}
            disabled={isLoading}
            aria-label="Disable all selected thresholds"
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              'bg-yellow-600 hover:bg-yellow-700 text-white',
              'focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-background',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoading && activeAction === 'disable' && <Spinner />}
            Disable All
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={onDelete}
            disabled={isLoading}
            aria-label="Delete all selected thresholds"
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              'bg-red-600 hover:bg-red-700 text-white',
              'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-background',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoading && activeAction === 'delete' && <Spinner />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
