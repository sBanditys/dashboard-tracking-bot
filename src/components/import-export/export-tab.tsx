'use client'

import { useState, useRef, useCallback } from 'react'
import { ShieldCheck, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ExportTypeSelector } from './export-type-selector'
import { ExportHistoryList } from './export-history-list'
import { useCreateExport, useExportHistory, useExportProgress } from '@/hooks/use-exports'
import { useBrands } from '@/hooks/use-tracking'
import type { ExportDataType, ExportFormat } from '@/types/export'

// ── Constants ────────────────────────────────────────────────────────────────

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'XLSX' },
  { value: 'json', label: 'JSON' },
]

const PLATFORMS = ['all', 'instagram', 'tiktok', 'youtube', 'x'] as const
type Platform = (typeof PLATFORMS)[number]

const DAILY_EXPORT_QUOTA = 10
const DAILY_GDPR_QUOTA = 3

// ── Filter visibility per export type ────────────────────────────────────────

function getVisibleFilters(type: ExportDataType | null): {
  brand: boolean
  group: boolean
  platform: boolean
} {
  if (!type) return { brand: false, group: false, platform: false }
  switch (type) {
    case 'accounts':
      return { brand: true, group: true, platform: true }
    case 'posts':
      return { brand: true, group: false, platform: true }
    case 'metrics':
    case 'analytics':
      return { brand: false, group: false, platform: true }
    case 'audit':
    case 'gdpr':
      return { brand: false, group: false, platform: false }
    default:
      return { brand: false, group: false, platform: false }
  }
}

// ── Select component ─────────────────────────────────────────────────────────

function Select({
  value,
  onChange,
  options,
  label,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  label: string
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'bg-surface border border-border rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent-purple transition-colors',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ── Progress bar section ─────────────────────────────────────────────────────

type ExportProgressState =
  | { phase: 'idle' }
  | { phase: 'in_progress'; exportId: string }
  | { phase: 'cancelled' }
  | { phase: 'complete'; downloadUrl: string | null }
  | { phase: 'error'; message: string }

function ProgressSection({
  guildId,
  progressState,
  onCancel,
  onReset,
}: {
  guildId: string
  progressState: ExportProgressState
  onCancel: () => void
  onReset: () => void
}) {
  const exportId = progressState.phase === 'in_progress' ? progressState.exportId : null
  const { progress, status, recordCount, message } = useExportProgress(guildId, exportId)

  if (progressState.phase === 'idle') return null

  if (progressState.phase === 'cancelled') {
    return (
      <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
        <p className="text-gray-400 text-sm">Export cancelled. The export may still complete in the background and will appear in history.</p>
        <button
          type="button"
          onClick={onReset}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
            'border border-border text-gray-300 hover:text-white hover:border-gray-500'
          )}
        >
          Start new export
        </button>
      </div>
    )
  }

  if (progressState.phase === 'complete') {
    return (
      <div className="bg-surface border border-border rounded-lg p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
        <p className="text-green-400 text-sm font-medium">Export complete</p>
        {progressState.downloadUrl && (
          <a
            href={progressState.downloadUrl}
            download
            className={cn(
              'ml-auto inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors',
              'bg-accent-purple hover:bg-accent-purple/90 text-white'
            )}
          >
            Download
          </a>
        )}
      </div>
    )
  }

  if (progressState.phase === 'error') {
    return (
      <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-sm font-medium">Export failed</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Export failed"
          className="w-full bg-gray-700 rounded-full h-2 overflow-hidden"
        >
          <div className="h-2 rounded-full bg-red-500 w-full" />
        </div>
        {progressState.message && (
          <p className="text-red-400 text-xs">{progressState.message}</p>
        )}
        <button
          type="button"
          onClick={onReset}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
            'bg-gray-700 hover:bg-gray-600 text-white'
          )}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </button>
      </div>
    )
  }

  // in_progress
  const pct = typeof progress === 'number' ? progress : 0
  const isError = status === 'failed'
  const isComplete = status === 'completed'

  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-300">Generating export...</span>
        <span className="text-gray-400 text-xs">{recordCount > 0 ? `${recordCount.toLocaleString()} records` : message ?? ''}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Export progress"
        className="w-full bg-gray-700 rounded-full h-2 overflow-hidden"
      >
        <div
          className={cn(
            'h-2 rounded-full transition-all duration-300 ease-out',
            isError ? 'bg-red-500 w-full' : isComplete ? 'bg-green-500 w-full' : 'bg-accent-purple'
          )}
          style={isError || isComplete ? {} : { width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{pct}% complete</span>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Quota helper ─────────────────────────────────────────────────────────────

function useQuota(guildId: string) {
  const { data } = useExportHistory(guildId, 1, 1)
  return {
    standardRemaining: data?.quota?.standard.remaining ?? DAILY_EXPORT_QUOTA,
    gdprRemaining: data?.quota?.gdpr.remaining ?? DAILY_GDPR_QUOTA,
  }
}

// ── Main component ────────────────────────────────────────────────────────────

interface ExportTabProps {
  guildId: string
}

/**
 * Complete export flow:
 * - Type selection (5 radio cards)
 * - Format dropdown (CSV / XLSX / JSON)
 * - Context-aware filters (brand, group, platform)
 * - Preview count
 * - Export button with quota check
 * - Real-time SSE progress bar with cancel
 * - GDPR separate section
 * - Export history
 */
export function ExportTab({ guildId }: ExportTabProps) {
  // Standard export state
  const [selectedType, setSelectedType] = useState<ExportDataType | null>(null)
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [brandId, setBrandId] = useState<string>('all')
  const [groupId, setGroupId] = useState<string>('all')
  const [platform, setPlatform] = useState<Platform>('all')
  const [progressState, setProgressState] = useState<ExportProgressState>({ phase: 'idle' })

  // GDPR export state
  const [gdprFormat, setGdprFormat] = useState<ExportFormat>('csv')
  const [gdprProgressState, setGdprProgressState] = useState<ExportProgressState>({ phase: 'idle' })

  // SSE cancel refs
  const eventSourceRef = useRef<EventSource | null>(null)
  const gdprEventSourceRef = useRef<EventSource | null>(null)

  const createExport = useCreateExport(guildId)
  const gdprCreateExport = useCreateExport(guildId)
  const { data: brandsData, isLoading: brandsLoading } = useBrands(guildId)
  const { standardRemaining: remainingStdQuota, gdprRemaining: remainingGdprQuota } = useQuota(guildId)

  const visibleFilters = getVisibleFilters(selectedType)

  // Build brand options
  const brands = brandsData?.brands ?? []
  const brandOptions = [
    { value: 'all', label: 'All brands' },
    ...brands.map((b) => ({ value: b.id, label: b.label })),
  ]

  // Build group options (depends on selected brand)
  const selectedBrand = brands.find((b) => b.id === brandId)
  const groupOptions = [
    { value: 'all', label: 'All groups' },
    ...(selectedBrand?.groups ?? []).map((g) => ({ value: g.id, label: g.label })),
  ]

  const platformOptions = PLATFORMS.map((p) => ({
    value: p,
    label: p === 'all' ? 'All platforms' : p.charAt(0).toUpperCase() + p.slice(1),
  }))

  // Build filters for export request
  const buildFilters = useCallback((): Record<string, string> => {
    const filters: Record<string, string> = {}
    if (visibleFilters.brand && brandId !== 'all') filters.brandId = brandId
    if (visibleFilters.group && groupId !== 'all') filters.groupId = groupId
    if (visibleFilters.platform && platform !== 'all') filters.platform = platform
    return filters
  }, [visibleFilters, brandId, groupId, platform])

  // Disable conditions
  const isExporting = progressState.phase === 'in_progress'
  const exportDisabled =
    !selectedType ||
    remainingStdQuota === 0 ||
    isExporting

  const isGdprExporting = gdprProgressState.phase === 'in_progress'
  const gdprExportDisabled = remainingGdprQuota === 0 || isGdprExporting

  // Handle standard export
  const handleStartExport = async () => {
    if (!selectedType || exportDisabled) return

    try {
      const { record } = await createExport.mutateAsync({
        dataType: selectedType,
        format,
        mode: 'all',
        filters: buildFilters(),
      })

      setProgressState({ phase: 'in_progress', exportId: record.id })

      // Watch progress via SSE manually to detect completion/error and update state
      const es = new EventSource(`/api/guilds/${guildId}/exports/${record.id}/progress`)
      eventSourceRef.current = es

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.status === 'completed') {
            es.close()
            setProgressState({ phase: 'complete', downloadUrl: data.downloadUrl ?? null })
          } else if (data.status === 'failed') {
            es.close()
            setProgressState({ phase: 'error', message: data.message ?? 'Export failed' })
          }
        } catch {
          // ignore parse errors
        }
      }

      es.onerror = () => {
        es.close()
      }
    } catch {
      // Error already handled by mutation onError (toast)
    }
  }

  const handleCancelExport = () => {
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    setProgressState({ phase: 'cancelled' })
  }

  const handleResetExport = () => {
    setProgressState({ phase: 'idle' })
  }

  // Handle GDPR export
  const handleGdprExport = async () => {
    if (gdprExportDisabled) return

    try {
      const { record } = await gdprCreateExport.mutateAsync({
        dataType: 'gdpr',
        format: gdprFormat,
        mode: 'all',
      })

      setGdprProgressState({ phase: 'in_progress', exportId: record.id })

      const es = new EventSource(`/api/guilds/${guildId}/exports/${record.id}/progress`)
      gdprEventSourceRef.current = es

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.status === 'completed') {
            es.close()
            setGdprProgressState({ phase: 'complete', downloadUrl: data.downloadUrl ?? null })
          } else if (data.status === 'failed') {
            es.close()
            setGdprProgressState({ phase: 'error', message: data.message ?? 'Export failed' })
          }
        } catch {
          // ignore
        }
      }

      es.onerror = () => {
        es.close()
      }
    } catch {
      // Error already handled by mutation onError (toast)
    }
  }

  const handleCancelGdprExport = () => {
    gdprEventSourceRef.current?.close()
    gdprEventSourceRef.current = null
    setGdprProgressState({ phase: 'cancelled' })
  }

  const handleResetGdprExport = () => {
    setGdprProgressState({ phase: 'idle' })
  }

  return (
    <div className="space-y-8">

      {/* ── Standard export section ─────────────────────────────────────── */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200">Select Data Type</h3>
          {/* Quota display */}
          <span className="text-xs text-gray-500">
            {remainingStdQuota} of {DAILY_EXPORT_QUOTA} exports remaining today
          </span>
        </div>

        {/* Type selector */}
        <ExportTypeSelector selected={selectedType} onSelect={setSelectedType} />

        {/* Format + filters row */}
        {selectedType && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {/* Format */}
            <Select
              label="Format"
              value={format}
              onChange={(v) => setFormat(v as ExportFormat)}
              options={FORMATS.map((f) => ({ value: f.value, label: f.label }))}
            />

            {/* Brand filter */}
            {visibleFilters.brand && (
              <Select
                label="Brand"
                value={brandId}
                onChange={(v) => { setBrandId(v); setGroupId('all') }}
                options={brandOptions}
                disabled={brandsLoading}
              />
            )}

            {/* Group filter */}
            {visibleFilters.group && (
              <Select
                label="Group"
                value={groupId}
                onChange={(v) => setGroupId(v)}
                options={groupOptions}
                disabled={brandId === 'all' || brandsLoading}
              />
            )}

            {/* Platform filter */}
            {visibleFilters.platform && (
              <Select
                label="Platform"
                value={platform}
                onChange={(v) => setPlatform(v as Platform)}
                options={platformOptions}
              />
            )}
          </div>
        )}

        {/* Export button + progress */}
        {selectedType && progressState.phase === 'idle' && (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleStartExport}
              disabled={exportDisabled}
              className={cn(
                'px-5 py-2 text-sm font-medium rounded-md transition-colors',
                exportDisabled
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-accent-purple hover:bg-accent-purple/90 text-white'
              )}
            >
              {createExport.isPending
                ? 'Creating export...'
                : `Export ${selectedType} as ${format.toUpperCase()}`}
            </button>
            {remainingStdQuota === 0 && (
              <span className="text-xs text-red-400">Daily quota exhausted</span>
            )}
          </div>
        )}

        {/* Progress section (uses SSE from useExportProgress internally) */}
        {selectedType && progressState.phase !== 'idle' && (
          <ProgressSection
            guildId={guildId}
            progressState={progressState}
            onCancel={handleCancelExport}
            onReset={handleResetExport}
          />
        )}
      </div>

      {/* ── GDPR section ────────────────────────────────────────────────── */}
      <div className="border border-border rounded-lg p-5 space-y-4 bg-surface/50">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-gray-200">GDPR Data Export</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Export personal data in compliance with GDPR regulations. This includes all tracked data for the guild.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {remainingGdprQuota} of {DAILY_GDPR_QUOTA} GDPR exports remaining today
          </span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <Select
            label="Format"
            value={gdprFormat}
            onChange={(v) => setGdprFormat(v as ExportFormat)}
            options={FORMATS.map((f) => ({ value: f.value, label: f.label }))}
          />

          {gdprProgressState.phase === 'idle' && (
            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={handleGdprExport}
                disabled={gdprExportDisabled}
                className={cn(
                  'px-5 py-2 text-sm font-medium rounded-md transition-colors',
                  gdprExportDisabled
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                )}
              >
                {gdprCreateExport.isPending ? 'Creating...' : 'Export GDPR Data'}
              </button>
              {remainingGdprQuota === 0 && (
                <span className="text-xs text-red-400 pb-2">Daily quota exhausted</span>
              )}
            </div>
          )}
        </div>

        {gdprProgressState.phase !== 'idle' && (
          <ProgressSection
            guildId={guildId}
            progressState={gdprProgressState}
            onCancel={handleCancelGdprExport}
            onReset={handleResetGdprExport}
          />
        )}
      </div>

      {/* ── Export history ───────────────────────────────────────────────── */}
      <ExportHistoryList guildId={guildId} />
    </div>
  )
}
