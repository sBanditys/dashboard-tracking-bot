'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useCreateExport } from '@/hooks/use-exports'
import { ExportProgress } from '@/components/export/export-progress'
import { useExportProgress } from '@/hooks/use-exports'
import { exportAllPostsMetricsCsv } from '@/lib/posts-csv-export'
import { exportAllPostsMetricsWorkbook } from '@/lib/posts-excel-export'
import { toast } from 'sonner'
import type { ExportFormat, ExportMode, ExportRecord } from '@/types/export'

interface ExportConfigFormProps {
  guildId: string
  guildName: string
  onExportStarted?: (exportRecord: ExportRecord) => void
}

const formatOptions: Array<{ format: ExportFormat; label: string; icon: string }> = [
  { format: 'csv', label: 'CSV', icon: '📊' },
  { format: 'json', label: 'JSON', icon: '📄' },
  { format: 'xlsx', label: 'Excel', icon: '📗' },
]

const extensionMap: Record<ExportFormat, string> = {
  csv: '.csv',
  json: '.json',
  xlsx: '.xlsx',
}

function getDefaultFilename(guildName: string, dataType: 'accounts' | 'posts'): string {
  const date = new Date().toISOString().split('T')[0]
  const safeName = guildName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return `${safeName}-${dataType}-${date}`
}

export function ExportConfigForm({
  guildId,
  guildName,
  onExportStarted,
}: ExportConfigFormProps) {
  const [dataType, setDataType] = useState<'accounts' | 'posts'>('accounts')
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [mode, setMode] = useState<ExportMode>('all')
  const [filename, setFilename] = useState(getDefaultFilename(guildName, 'accounts'))
  const [activeExportId, setActiveExportId] = useState<string | null>(null)
  const [isDirectExporting, setIsDirectExporting] = useState(false)

  const createExport = useCreateExport(guildId)
  const exportProgress = useExportProgress(guildId, activeExportId)

  const handleDataTypeChange = (newType: 'accounts' | 'posts') => {
    setDataType(newType)
    setFilename(getDefaultFilename(guildName, newType))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // For posts "Export all data", generate client-side files aligned with /export metrics schema.
      if (dataType === 'posts' && mode === 'all' && (format === 'csv' || format === 'xlsx')) {
        setIsDirectExporting(true)
        if (format === 'csv') {
          const result = await exportAllPostsMetricsCsv(guildId, filename || getDefaultFilename(guildName, 'posts'))
          toast.success('Posts exported', {
            description: `${result.recordCount.toLocaleString()} records in ${result.fileCount} CSV file${result.fileCount === 1 ? '' : 's'} (ZIP)`,
          })
        } else {
          const result = await exportAllPostsMetricsWorkbook(guildId, filename || getDefaultFilename(guildName, 'posts'))
          toast.success('Posts exported', {
            description: `${result.recordCount.toLocaleString()} records across ${result.sheetCount} sheet${result.sheetCount === 1 ? '' : 's'}`,
          })
        }
        return
      }

      const result = await createExport.mutateAsync({
        format,
        mode,
        dataType,
        filename: filename || undefined,
      })
      setActiveExportId(result.id)
      onExportStarted?.(result)
    } catch (error) {
      if (dataType === 'posts' && mode === 'all' && (format === 'csv' || format === 'xlsx')) {
        toast.error('Failed to export posts', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    } finally {
      setIsDirectExporting(false)
    }
  }

  const isExportActive = activeExportId !== null &&
    exportProgress.status !== 'completed' &&
    exportProgress.status !== 'failed'

  const handleDismiss = () => {
    setActiveExportId(null)
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Configure Export</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Data Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Data Type
          </label>
          <div className="flex gap-3">
            {(['accounts', 'posts'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleDataTypeChange(type)}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors border',
                  dataType === type
                    ? 'border-accent-purple bg-accent-purple/10 text-white'
                    : 'border-border bg-background text-gray-400 hover:text-gray-300'
                )}
              >
                {type === 'accounts' ? 'Accounts' : 'Posts'}
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Format
          </label>
          <div className="flex gap-3">
            {formatOptions.map((option) => (
              <button
                key={option.format}
                type="button"
                onClick={() => setFormat(option.format)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors border',
                  format === option.format
                    ? 'border-accent-purple bg-accent-purple/10 text-white'
                    : 'border-border bg-background text-gray-400 hover:text-gray-300'
                )}
              >
                <span className="text-base">{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Export Mode
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode('all')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors border',
                mode === 'all'
                  ? 'border-accent-purple bg-accent-purple/10 text-white'
                  : 'border-border bg-background text-gray-400 hover:text-gray-300'
              )}
            >
              Export all data
            </button>
            <button
              type="button"
              onClick={() => setMode('current_view')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors border',
                mode === 'current_view'
                  ? 'border-accent-purple bg-accent-purple/10 text-white'
                  : 'border-border bg-background text-gray-400 hover:text-gray-300'
              )}
            >
              Export current view (with filters)
            </button>
          </div>
        </div>

        {/* Filename */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Filename
          </label>
          <div className="flex items-center gap-0">
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="flex-1 bg-background border border-border rounded-l-md px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-purple"
              placeholder="export-filename"
            />
            <span className="bg-background border border-l-0 border-border rounded-r-md px-3 py-2 text-sm text-gray-500">
              {extensionMap[format]}
            </span>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={createExport.isPending || isExportActive || isDirectExporting}
          className={cn(
            'bg-accent-purple hover:bg-accent-purple/90 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors',
            (createExport.isPending || isExportActive || isDirectExporting) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isDirectExporting ? 'Exporting...' : createExport.isPending ? 'Starting...' : 'Start Export'}
        </button>
      </form>

      {/* Inline Export Progress */}
      {activeExportId && (
        <div className="mt-6">
          <ExportProgress
            progress={exportProgress.progress}
            status={exportProgress.status}
            recordCount={exportProgress.recordCount}
            message={exportProgress.message}
            onDismiss={handleDismiss}
          />
        </div>
      )}
    </div>
  )
}
