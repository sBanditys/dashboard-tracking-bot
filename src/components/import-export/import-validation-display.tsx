'use client'

import { cn } from '@/lib/utils'
import type { ImportPreview } from '@/types/import'

interface ImportValidationDisplayProps {
  preview: ImportPreview
  onConfirm: () => void
  onCancel: () => void
  isConfirming: boolean
}

/**
 * Displays the validation preview after CSV upload.
 *
 * All-or-nothing validation: if any rows are invalid, import is blocked.
 * Shows valid/invalid summary, error details, and confirm/cancel actions.
 */
export function ImportValidationDisplay({
  preview,
  onConfirm,
  onCancel,
  isConfirming,
}: ImportValidationDisplayProps) {
  const hasErrors = preview.invalidRows > 0

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      {/* Summary bar */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-surface">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
          <span className="text-sm text-gray-300">
            <span className="font-semibold text-green-400">{preview.validRows}</span> valid
          </span>
        </div>
        {hasErrors && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            <span className="text-sm text-gray-300">
              <span className="font-semibold text-red-400">{preview.invalidRows}</span> invalid
            </span>
          </div>
        )}
        <span className="text-sm text-gray-500 ml-auto">
          of {preview.totalRows} total rows
        </span>
      </div>

      {/* All valid path */}
      {!hasErrors && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-green-400">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">All rows validated successfully</span>
          </div>

          {/* Sample preview table */}
          {preview.preview.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">
                Preview (first {Math.min(5, preview.preview.length)} rows)
              </p>
              <div className="overflow-x-auto rounded border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-alt border-b border-border">
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Username</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Platform</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Brand</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Group</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.slice(0, 5).map((row) => (
                      <tr key={row.row} className="border-b border-border/50 last:border-0">
                        <td className="px-3 py-2 text-gray-200">{row.username}</td>
                        <td className="px-3 py-2 text-gray-300">{row.platform}</td>
                        <td className="px-3 py-2 text-gray-300">{row.brand || '—'}</td>
                        <td className="px-3 py-2 text-gray-300">{row.group || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isConfirming}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                'bg-accent-purple hover:bg-accent-purple/90 text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isConfirming ? 'Preparing...' : `Import ${preview.validRows} accounts`}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isConfirming}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                'text-gray-300 hover:text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Invalid rows path (all-or-nothing: block import) */}
      {hasErrors && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-red-400">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">
              {preview.invalidRows} {preview.invalidRows === 1 ? 'row has' : 'rows have'} validation errors.
              All rows must be valid to proceed.
            </span>
          </div>

          {/* Error list */}
          {preview.errors.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">
                Validation Errors
              </p>
              <div className="overflow-x-auto rounded border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-alt border-b border-border">
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Row</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Column</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Error</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.errors.map((err, idx) => (
                      <tr key={idx} className="border-b border-border/50 last:border-0 bg-red-500/5">
                        <td className="px-3 py-2 text-red-400 font-medium">{err.row}</td>
                        <td className="px-3 py-2 text-red-300">{err.column}</td>
                        <td className="px-3 py-2 text-red-300">{err.message}</td>
                        <td className="px-3 py-2 text-gray-400 font-mono text-xs">
                          {err.value || <span className="text-gray-600 italic">empty</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upload corrected file button */}
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              'bg-gray-700 hover:bg-gray-600 text-white'
            )}
          >
            Upload corrected file
          </button>
        </div>
      )}
    </div>
  )
}
