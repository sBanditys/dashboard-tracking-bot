'use client'

import { useState } from 'react'
import { Download, ChevronLeft, ChevronRight, History, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { useExportHistory } from '@/hooks/use-exports'
import type { ExportRecord, ExportDataType, ExportFormat, ExportStatus } from '@/types/export'

// ── Badge helpers ────────────────────────────────────────────────────────────

const DATA_TYPE_COLORS: Record<ExportDataType, string> = {
  accounts: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  posts: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  metrics: 'bg-green-500/15 text-green-400 border-green-500/30',
  analytics: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  audit: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  gdpr: 'bg-red-500/15 text-red-400 border-red-500/30',
}

const FORMAT_COLORS: Record<ExportFormat, string> = {
  csv: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
  xlsx: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  json: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
}

const STATUS_COLORS: Record<ExportStatus, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  processing: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  completed: 'bg-green-500/15 text-green-400 border-green-500/30',
  failed: 'bg-red-500/15 text-red-400 border-red-500/30',
  expired: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', className)}>
      {children}
    </span>
  )
}

// ── Expiry helper ────────────────────────────────────────────────────────────

function ExpiryDisplay({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return null

  const expiry = new Date(expiresAt)
  const isExpired = expiry < new Date()

  if (isExpired) {
    return (
      <Badge className={STATUS_COLORS.expired}>Expired</Badge>
    )
  }

  return (
    <span className="text-xs text-gray-500">
      Expires {formatDistanceToNow(expiry, { addSuffix: true })}
    </span>
  )
}

// ── Row component ────────────────────────────────────────────────────────────

function ExportRow({ record }: { record: ExportRecord }) {
  const isDownloadable =
    record.status === 'completed' &&
    record.downloadUrl &&
    (!record.expiresAt || new Date(record.expiresAt) > new Date())

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-border last:border-0">
      {/* Type + format + status badges */}
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
        <Badge className={DATA_TYPE_COLORS[record.dataType]}>
          {record.dataType.charAt(0).toUpperCase() + record.dataType.slice(1)}
        </Badge>
        <Badge className={FORMAT_COLORS[record.format]}>
          {record.format.toUpperCase()}
        </Badge>
        <Badge className={STATUS_COLORS[record.status]}>
          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
        </Badge>
      </div>

      {/* Record count + date */}
      <div className="flex items-center gap-4 text-sm shrink-0">
        {record.recordCount != null && (
          <span className="text-gray-400">{record.recordCount.toLocaleString()} rows</span>
        )}
        <span className="text-gray-500 text-xs">
          {new Date(record.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>

      {/* Expiry + download */}
      <div className="flex items-center gap-3 shrink-0">
        <ExpiryDisplay expiresAt={record.expiresAt} />
        {isDownloadable ? (
          <a
            href={record.downloadUrl!}
            download
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors',
              'bg-accent-purple hover:bg-accent-purple/90 text-white'
            )}
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </a>
        ) : (
          <span className="w-[88px]" />
        )}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

interface ExportHistoryListProps {
  guildId: string
}

/**
 * Paginated list of all exports for a guild.
 *
 * Shows type badge, format, status, row count, expiry, and a re-download link
 * for completed non-expired exports.
 */
export function ExportHistoryList({ guildId }: ExportHistoryListProps) {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useExportHistory(guildId, page, 20)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-800/50 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-sm text-red-400">Failed to load export history</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-surface border border-border text-gray-300 hover:bg-surface-hover transition-colors"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    )
  }

  const exports = data?.exports ?? []
  const total = data?.pagination.total ?? 0
  const totalPages = data ? Math.ceil(data.pagination.total / data.pagination.limit) : 1

  if (exports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-gray-500">
        <History className="w-8 h-8 opacity-40" />
        <p className="text-sm">No exports yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-300">Export History</p>
        <p className="text-xs text-gray-500">{total} total</p>
      </div>

      <div className="bg-surface border border-border rounded-lg px-4">
        {exports.map((record) => (
          <ExportRow key={record.id} record={record} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className={cn(
              'inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors',
              page <= 1
                ? 'border-border text-gray-600 cursor-not-allowed'
                : 'border-border text-gray-300 hover:text-white hover:border-gray-500'
            )}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className={cn(
              'inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors',
              page >= totalPages
                ? 'border-border text-gray-600 cursor-not-allowed'
                : 'border-border text-gray-300 hover:text-white hover:border-gray-500'
            )}
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
