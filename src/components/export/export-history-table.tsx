'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { safeFormatDistanceToNow } from '@/lib/date-utils'
import { useExportHistory } from '@/hooks/use-exports'
import type { ExportFormat, ExportStatus } from '@/types/export'

interface ExportHistoryTableProps {
  guildId: string
}

const statusConfig: Record<ExportStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-gray-500/20 text-gray-400' },
  processing: { label: 'Processing', className: 'bg-yellow-500/20 text-yellow-400 animate-pulse' },
  completed: { label: 'Completed', className: 'bg-green-500/20 text-green-400' },
  failed: { label: 'Failed', className: 'bg-red-500/20 text-red-400' },
  expired: { label: 'Expired', className: 'bg-orange-500/20 text-orange-400' },
}

const formatConfig: Record<ExportFormat, { label: string; className: string }> = {
  csv: { label: 'CSV', className: 'bg-blue-500/20 text-blue-400' },
  json: { label: 'JSON', className: 'bg-purple-500/20 text-purple-400' },
  xlsx: { label: 'XLSX', className: 'bg-green-500/20 text-green-400' },
}

export function ExportHistoryTable({ guildId }: ExportHistoryTableProps) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useExportHistory(guildId, page, 20)

  const exports = data?.exports ?? []
  const pagination = data?.pagination

  const formatRecordCount = (value: unknown): string => {
    return typeof value === 'number' && Number.isFinite(value)
      ? value.toLocaleString()
      : '-'
  }

  // Helper: Check if export has expired
  const isExpired = (exportRecord: typeof exports[0]) => {
    if (!exportRecord.expiresAt) return false
    return new Date() > new Date(exportRecord.expiresAt)
  }

  // Auto-refresh is handled by cache invalidation from export status polling
  // and the hook's 30s staleTime

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Export History</h2>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-background rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (exports.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Export History</h2>
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">
            No exports yet. Create your first export above.
          </p>
        </div>
      </div>
    )
  }

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1

  return (
    <div className="bg-surface border border-border rounded-lg">
      <div className="p-6 pb-4">
        <h2 className="text-lg font-semibold text-white">Export History</h2>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-6 py-3 text-gray-400 font-medium">Filename</th>
              <th className="px-6 py-3 text-gray-400 font-medium">Type</th>
              <th className="px-6 py-3 text-gray-400 font-medium">Format</th>
              <th className="px-6 py-3 text-gray-400 font-medium">Status</th>
              <th className="px-6 py-3 text-gray-400 font-medium">Records</th>
              <th className="px-6 py-3 text-gray-400 font-medium">Date</th>
              <th className="px-6 py-3 text-gray-400 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {exports.map((exportRecord) => {
              const status = statusConfig[exportRecord.status] ?? {
                label: exportRecord.status.charAt(0).toUpperCase() + exportRecord.status.slice(1),
                className: 'bg-gray-500/20 text-gray-400',
              }
              const fmt = formatConfig[exportRecord.format] ?? { label: exportRecord.format.toUpperCase(), className: 'bg-gray-500/20 text-gray-400' }
              const expired = isExpired(exportRecord)

              return (
                <tr
                  key={exportRecord.id}
                  className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors"
                >
                  <td className="px-6 py-3 text-white font-medium max-w-[200px] truncate">
                    {exportRecord.filename}
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-300">
                      {exportRecord.dataType === 'accounts' ? 'Accounts' : 'Posts'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', fmt.className)}>
                      {fmt.label}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', status.className)}>
                        {status.label}
                      </span>
                      {expired && exportRecord.status !== 'expired' && (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-400">
                          Expired
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-400">
                    {formatRecordCount(exportRecord.recordCount)}
                  </td>
                  <td className="px-6 py-3 text-gray-400">
                    {safeFormatDistanceToNow(exportRecord.createdAt)}
                  </td>
                  <td className="px-6 py-3">
                    {exportRecord.status === 'completed' && exportRecord.downloadUrl ? (
                      expired ? (
                        <span
                          className="text-gray-600 text-sm font-medium cursor-not-allowed pointer-events-none opacity-50"
                          title="Export expired. Create a new export."
                        >
                          Download
                        </span>
                      ) : (
                        <a
                          href={exportRecord.downloadUrl}
                          download
                          className="text-accent-purple hover:text-accent-purple/80 text-sm font-medium"
                        >
                          Download
                        </a>
                      )
                    ) : (
                      <span className="text-gray-600">&mdash;</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden px-6 pb-4 space-y-3">
        {exports.map((exportRecord) => {
          const status = statusConfig[exportRecord.status] ?? {
            label: exportRecord.status.charAt(0).toUpperCase() + exportRecord.status.slice(1),
            className: 'bg-gray-500/20 text-gray-400',
          }
          const fmt = formatConfig[exportRecord.format] ?? { label: exportRecord.format.toUpperCase(), className: 'bg-gray-500/20 text-gray-400' }
          const expired = isExpired(exportRecord)

          return (
            <div
              key={exportRecord.id}
              className="bg-background border border-border rounded-lg p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-white font-medium text-sm truncate max-w-[180px]">
                  {exportRecord.filename}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', status.className)}>
                    {status.label}
                  </span>
                  {expired && exportRecord.status !== 'expired' && (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-400">
                      Expired
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="inline-block px-2 py-0.5 rounded bg-gray-500/20 text-gray-300">
                  {exportRecord.dataType === 'accounts' ? 'Accounts' : 'Posts'}
                </span>
                <span className={cn('inline-block px-2 py-0.5 rounded', fmt.className)}>
                  {fmt.label}
                </span>
                {formatRecordCount(exportRecord.recordCount) !== '-' && (
                  <span>{formatRecordCount(exportRecord.recordCount)} records</span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  {safeFormatDistanceToNow(exportRecord.createdAt)}
                </span>
                {exportRecord.status === 'completed' && exportRecord.downloadUrl && (
                  expired ? (
                    <span
                      className="text-gray-600 font-medium opacity-50"
                      title="Export expired. Create a new export."
                    >
                      Download
                    </span>
                  ) : (
                    <a
                      href={exportRecord.downloadUrl}
                      download
                      className="text-accent-purple hover:text-accent-purple/80 font-medium"
                    >
                      Download
                    </a>
                  )
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <span className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={cn(
                'px-3 py-1 rounded text-sm border border-border transition-colors',
                page === 1
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-300 hover:bg-surface/50'
              )}
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={cn(
                'px-3 py-1 rounded text-sm border border-border transition-colors',
                page === totalPages
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-300 hover:bg-surface/50'
              )}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
