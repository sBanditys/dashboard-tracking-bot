'use client'

import type { ExportStatus } from '@/types/export'
import { cn } from '@/lib/utils'

interface ExportProgressProps {
  progress: number
  status: ExportStatus
  recordCount: number
  message?: string
  downloadUrl?: string | null
  onDismiss?: () => void
}

export function ExportProgress({
  progress,
  status,
  recordCount,
  message,
  downloadUrl,
  onDismiss,
}: ExportProgressProps) {
  const getBarColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      default:
        return 'bg-accent-purple'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'pending':
      case 'processing':
        return `Exporting ${recordCount.toLocaleString()} items...`
      case 'completed':
        return 'Export complete'
      case 'failed':
        return message || 'Export failed'
    }
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-300">{getStatusText()}</span>
        {status === 'failed' && onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-white text-xs"
          >
            Dismiss
          </button>
        )}
      </div>

      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            getBarColor(),
            status === 'processing' && 'animate-pulse'
          )}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {status === 'completed' && downloadUrl && (
        <div className="mt-3">
          <a
            href={downloadUrl}
            download
            className="text-sm text-accent-purple hover:text-accent-purple/80 font-medium"
          >
            Download file →
          </a>
        </div>
      )}

      {status === 'failed' && message && (
        <div className="mt-2 text-sm text-red-400">
          {message}
        </div>
      )}
    </div>
  )
}
