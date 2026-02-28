'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useRefresh, type RefreshProgressEvent } from '@/hooks/use-refresh'

/* ────────── Helpers ────────── */

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function platformLabel(p: string): string {
  if (p === 'instagram') return 'Instagram'
  if (p === 'tiktok') return 'TikTok'
  if (p === 'youtube') return 'YouTube'
  return p
}

/* ────────── Sub-components ────────── */

function UploadArea({ onFileSelected }: { onFileSelected: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file && file.name.endsWith('.csv')) {
        onFileSelected(file)
      }
    },
    [onFileSelected]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFileSelected(file)
    },
    [onFileSelected]
  )

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-sm p-8 text-center transition-colors cursor-pointer',
        isDragging ? 'border-accent-purple bg-accent-purple/10' : 'border-border hover:border-gray-500'
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <p className="text-lg font-medium text-white mb-2">
        Drop a CSV file here, or click to browse
      </p>
      <p className="text-sm text-gray-400">
        Accepted format: .csv with URL column (and optional platform, views, likes, comments columns)
      </p>
      <p className="text-xs text-gray-500 mt-2">Max file size: 5MB</p>
    </div>
  )
}

function PlatformProgress({
  platform,
  events,
}: {
  platform: string
  events: RefreshProgressEvent[]
}) {
  const batchCompleted = events.filter(
    (e) => e.type === 'batch_complete' && e.platform === platform
  ).length
  const batchErrors = events.filter(
    (e) => e.type === 'batch_error' && e.platform === platform
  ).length
  const totalBatches =
    events.find(
      (e) => (e.type === 'batch_start' || e.type === 'batch_complete') && e.platform === platform
    )?.type === 'batch_start'
      ? (events.find((e) => e.type === 'batch_start' && e.platform === platform) as Extract<RefreshProgressEvent, { type: 'batch_start' }>)?.totalBatches ?? 0
      : (events.find((e) => e.type === 'batch_complete' && e.platform === platform) as Extract<RefreshProgressEvent, { type: 'batch_complete' }>)?.totalBatches ?? 0

  if (totalBatches === 0) return null

  const completed = batchCompleted + batchErrors
  const pct = Math.round((completed / totalBatches) * 100)

  const platformComplete = events.find(
    (e) => e.type === 'platform_complete' && e.platform === platform
  ) as Extract<RefreshProgressEvent, { type: 'platform_complete' }> | undefined

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-white">{platformLabel(platform)}</span>
        <span className="text-gray-400">
          {platformComplete
            ? `${platformComplete.updated} updated, ${platformComplete.skipped} skipped, ${platformComplete.noData} no data`
            : `${completed}/${totalBatches} batches`}
        </span>
      </div>
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            platformComplete ? 'bg-green-500' : 'bg-accent-purple'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function EventLog({ events }: { events: RefreshProgressEvent[] }) {
  const logRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new events
  const prevCount = useRef(events.length)
  if (events.length !== prevCount.current) {
    prevCount.current = events.length
    requestAnimationFrame(() => {
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight
      }
    })
  }

  return (
    <div
      ref={logRef}
      className="mt-4 max-h-48 overflow-y-auto bg-black/30 rounded-sm p-3 text-xs font-mono space-y-0.5"
    >
      {events.map((event, i) => {
        let text = ''
        let color = 'text-gray-400'

        switch (event.type) {
          case 'started':
            text = `Started: ${event.totalRows} rows (IG: ${event.platforms.instagram}, TT: ${event.platforms.tiktok}, YT: ${event.platforms.youtube})`
            color = 'text-blue-400'
            break
          case 'batch_start':
            text = `[${platformLabel(event.platform)}] Batch ${event.batchNum}/${event.totalBatches} (${event.batchSize} URLs)...`
            break
          case 'batch_complete':
            text = `[${platformLabel(event.platform)}] Batch ${event.batchNum}/${event.totalBatches}: ${event.itemsReturned} items (${formatDuration(event.durationMs)})`
            color = 'text-green-400'
            break
          case 'batch_error':
            text = `[${platformLabel(event.platform)}] Batch ${event.batchNum}/${event.totalBatches} error: ${event.error}`
            color = 'text-red-400'
            break
          case 'platform_complete':
            text = `[${platformLabel(event.platform)}] Done: ${event.updated} updated, ${event.skipped} skipped, ${event.noData} no data`
            color = 'text-blue-400'
            break
          case 'complete':
            text = `Complete: ${event.summary.updated} updated, ${event.summary.skipped} skipped, ${event.summary.noData} no data`
            color = 'text-green-400'
            break
          case 'error':
            text = `Error: ${event.message}`
            color = 'text-red-400'
            break
        }

        return (
          <div key={i} className={color}>
            {text}
          </div>
        )
      })}
    </div>
  )
}

/* ────────── Main Panel ────────── */

export function RefreshPanel() {
  const { state, events, errorMessage, startRefresh, downloadResult, cancel, reset } = useRefresh()

  const platforms = useMemo(() => {
    const started = events.find((e) => e.type === 'started') as
      | Extract<RefreshProgressEvent, { type: 'started' }>
      | undefined
    if (!started) return []
    const out: string[] = []
    if (started.platforms.instagram > 0) out.push('instagram')
    if (started.platforms.tiktok > 0) out.push('tiktok')
    if (started.platforms.youtube > 0) out.push('youtube')
    return out
  }, [events])

  const summary = useMemo(() => {
    const complete = events.find((e) => e.type === 'complete') as
      | Extract<RefreshProgressEvent, { type: 'complete' }>
      | undefined
    return complete?.summary
  }, [events])

  return (
    <div className="space-y-6">
      {/* Idle: File upload */}
      {state === 'idle' && <UploadArea onFileSelected={startRefresh} />}

      {/* Uploading */}
      {state === 'uploading' && (
        <div className="text-center py-8">
          <span className="inline-block w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-white font-medium">Uploading CSV...</p>
        </div>
      )}

      {/* Processing */}
      {state === 'processing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Processing...</h3>
            <Button variant="ghost" size="sm" onClick={cancel}>
              Cancel
            </Button>
          </div>

          {/* Per-platform progress */}
          <div className="space-y-3">
            {platforms.map((p) => (
              <PlatformProgress key={p} platform={p} events={events} />
            ))}
          </div>

          {/* Event log */}
          <EventLog events={events} />
        </div>
      )}

      {/* Complete */}
      {state === 'complete' && (
        <div className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/30 rounded-sm p-4">
            <h3 className="text-lg font-medium text-green-400 mb-2">Refresh Complete</h3>
            {summary && (
              <div className="flex gap-6 text-sm text-gray-300">
                <span>
                  <span className="font-medium text-green-400">{summary.updated}</span> updated
                </span>
                <span>
                  <span className="font-medium text-yellow-400">{summary.skipped}</span> skipped
                </span>
                <span>
                  <span className="font-medium text-red-400">{summary.noData}</span> no data
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button onClick={downloadResult}>Download XLSX</Button>
            <Button variant="secondary" onClick={reset}>
              Start New
            </Button>
          </div>

          {/* Event log (collapsed by default) */}
          <details className="group">
            <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
              Show event log
            </summary>
            <EventLog events={events} />
          </details>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-sm p-4">
            <h3 className="text-lg font-medium text-red-400 mb-1">Refresh Failed</h3>
            <p className="text-sm text-gray-300">{errorMessage}</p>
          </div>

          <Button variant="secondary" onClick={reset}>
            Try Again
          </Button>

          {events.length > 0 && (
            <details className="group">
              <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                Show event log
              </summary>
              <EventLog events={events} />
            </details>
          )}
        </div>
      )}
    </div>
  )
}
