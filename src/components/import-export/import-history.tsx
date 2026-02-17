'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ImportHistoryEntry } from '@/types/import'

interface ImportHistoryProps {
  guildId: string
  entries?: ImportHistoryEntry[]
  isLoading?: boolean
}

const STATUS_CONFIG = {
  completed: {
    label: 'Completed',
    className: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  partial: {
    label: 'Partial',
    className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
} as const

const ITEMS_PER_PAGE = 20

/**
 * Shows recent import history entries below the upload area.
 *
 * Each entry shows: date, filename, row count, status badge, created by.
 * Paginated at 20 items per page.
 *
 * When no entries exist, shows a stub message (import history endpoint may not exist yet).
 */
export function ImportHistory({ entries = [], isLoading = false }: ImportHistoryProps) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(entries.length / ITEMS_PER_PAGE))
  const pageEntries = entries.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const formatDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateString))
    } catch {
      return dateString
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2 mt-6">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
          Import History
        </h3>
        <div className="bg-surface border border-border rounded-lg divide-y divide-border">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-4 w-32 bg-gray-700 animate-pulse rounded" />
              <div className="h-4 w-48 bg-gray-700 animate-pulse rounded" />
              <div className="h-4 w-16 bg-gray-700 animate-pulse rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2 mt-6">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
        Import History
      </h3>

      {entries.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg px-4 py-8 text-center">
          <p className="text-gray-500 text-sm">Import history will appear here</p>
        </div>
      ) : (
        <>
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="hidden sm:grid sm:grid-cols-5 px-4 py-2 border-b border-border bg-surface-alt">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Date</div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide col-span-2">File</div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Rows</div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Status</div>
            </div>

            <div className="divide-y divide-border">
              {pageEntries.map((entry) => {
                const statusCfg = STATUS_CONFIG[entry.status]
                return (
                  <div key={entry.id} className="px-4 py-3 sm:grid sm:grid-cols-5 sm:gap-4 sm:items-center flex flex-col gap-1">
                    <div className="text-xs text-gray-400">
                      {formatDate(entry.createdAt)}
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="text-sm text-gray-200 truncate">{entry.filename}</p>
                      <p className="text-xs text-gray-500">by {entry.createdBy}</p>
                    </div>
                    <div className="text-sm text-gray-300">
                      {entry.importedCount}/{entry.rowCount}
                    </div>
                    <div>
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border',
                          statusCfg.className
                        )}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={cn(
                    'px-3 py-1 text-sm rounded-md transition-colors',
                    'border border-border text-gray-300 hover:text-white hover:border-gray-500',
                    'disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={cn(
                    'px-3 py-1 text-sm rounded-md transition-colors',
                    'border border-border text-gray-300 hover:text-white hover:border-gray-500',
                    'disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
