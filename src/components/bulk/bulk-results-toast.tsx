'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { BulkOperationResult } from '@/types/bulk'

interface BulkResultsToastProps {
  results: BulkOperationResult
  operationType: 'deleted' | 'reassigned' | 'exported'
  onDismiss?: () => void
}

export function BulkResultsToast({
  results,
  operationType,
  onDismiss,
}: BulkResultsToastProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const allSuccess = results.failed === 0
  const allFailed = results.succeeded === 0
  const partialSuccess = results.succeeded > 0 && results.failed > 0

  // Get action past tense verb
  const actionVerb = operationType

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        allSuccess && 'bg-green-500/10 border-green-500/20',
        partialSuccess && 'bg-yellow-500/10 border-yellow-500/20',
        allFailed && 'bg-red-500/10 border-red-500/20'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {/* All success */}
          {allSuccess && (
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-green-400 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-medium text-green-400">
                {results.succeeded} item{results.succeeded !== 1 ? 's' : ''} {actionVerb}{' '}
                successfully
              </p>
            </div>
          )}

          {/* Partial success */}
          {partialSuccess && (
            <div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-yellow-400 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-sm font-medium text-yellow-400">
                  Partially completed: {results.succeeded} succeeded, {results.failed} failed
                </p>
              </div>

              {/* Expandable errors */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-xs text-yellow-300 hover:text-yellow-200 underline"
              >
                {isExpanded ? 'Hide errors' : 'Show errors'}
              </button>

              {isExpanded && (
                <div className="mt-2 space-y-1 text-xs text-yellow-300 max-h-40 overflow-y-auto">
                  {results.results
                    .filter((r) => r.status === 'error')
                    .map((r, i) => (
                      <div key={i} className="font-mono">
                        {r.id}: {r.error || 'Unknown error'}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* All failed */}
          {allFailed && (
            <div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-red-400 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <p className="text-sm font-medium text-red-400">
                  All {results.total} item{results.total !== 1 ? 's' : ''} failed
                </p>
              </div>

              {/* Error list */}
              <div className="mt-2 space-y-1 text-xs text-red-300 max-h-40 overflow-y-auto">
                {results.results
                  .filter((r) => r.status === 'error')
                  .slice(0, 5)
                  .map((r, i) => (
                    <div key={i} className="font-mono">
                      {r.id}: {r.error || 'Unknown error'}
                    </div>
                  ))}
                {results.results.filter((r) => r.status === 'error').length > 5 && (
                  <div className="text-red-400">
                    ...and {results.results.filter((r) => r.status === 'error').length - 5} more
                    errors
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              'flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors',
              allSuccess && 'text-green-400 hover:text-green-300',
              partialSuccess && 'text-yellow-400 hover:text-yellow-300',
              allFailed && 'text-red-400 hover:text-red-300'
            )}
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
