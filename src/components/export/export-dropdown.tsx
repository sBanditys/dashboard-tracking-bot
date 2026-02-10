'use client'

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { useState } from 'react'
import type { ExportFormat, ExportMode } from '@/types/export'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { exportAllPostsMetricsCsv } from '@/lib/posts-csv-export'
import { exportAllPostsMetricsWorkbook } from '@/lib/posts-excel-export'
import { exportAllPostsMetricsJson } from '@/lib/posts-json-export'
import { toast } from 'sonner'

interface ExportDropdownProps {
  guildId: string
  dataType: 'accounts' | 'posts'
  activeFilters?: Record<string, string>
  onExportStarted?: (exportId: string) => void
}

export function ExportDropdown({
  guildId,
  dataType,
  activeFilters = {},
  onExportStarted,
}: ExportDropdownProps) {
  const [loadingFormat, setLoadingFormat] = useState<string | null>(null)

  const hasFilters = Object.keys(activeFilters).length > 0

  const createExport = async (format: ExportFormat, mode: ExportMode) => {
    const key = `${mode}-${format}`
    setLoadingFormat(key)

    try {
      // For posts "All data", keep schema aligned with /export metrics output.
      if (dataType === 'posts' && mode === 'all' && (format === 'csv' || format === 'xlsx' || format === 'json')) {
        if (format === 'csv') {
          const result = await exportAllPostsMetricsCsv(guildId, `export_metrics_${Date.now()}`)
          toast.success('Posts exported', {
            description: `${result.recordCount.toLocaleString()} records in ${result.fileCount} CSV file${result.fileCount === 1 ? '' : 's'} (ZIP)`,
          })
        } else if (format === 'xlsx') {
          const result = await exportAllPostsMetricsWorkbook(guildId, `export_metrics_${Date.now()}`)
          toast.success('Posts exported', {
            description: `${result.recordCount.toLocaleString()} records across ${result.sheetCount} sheet${result.sheetCount === 1 ? '' : 's'}`,
          })
        } else {
          const result = await exportAllPostsMetricsJson(guildId, `export_metrics_${Date.now()}`)
          toast.success('Posts exported', {
            description: `${result.recordCount.toLocaleString()} records across ${result.platformCount} platform group${result.platformCount === 1 ? '' : 's'}`,
          })
        }
        return
      }

      const response = await fetchWithRetry(`/api/guilds/${guildId}/exports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          mode,
          dataType,
          filters: mode === 'current_view' ? activeFilters : undefined,
        }),
      })

      if (!response.ok) throw new Error('Failed to create export')

      const data = await response.json()
      const exportId = data?.export?.id ?? data?.id
      if (exportId) {
        onExportStarted?.(exportId)
      }
    } catch (error) {
      console.error('Export creation failed:', error)
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoadingFormat(null)
    }
  }

  const formatItems = (mode: ExportMode) => {
    const formats: Array<{ format: ExportFormat; label: string; icon: string }> = [
      { format: 'csv', label: 'CSV', icon: '📊' },
      { format: 'json', label: 'JSON', icon: '📄' },
      { format: 'xlsx', label: 'Excel', icon: '📗' },
    ]

    return formats.map((item) => {
      const key = `${mode}-${item.format}`
      const isLoading = loadingFormat === key

      return (
        <MenuItem key={key}>
          {({ focus }) => (
            <button
              onClick={() => createExport(item.format, mode)}
              disabled={isLoading}
              className={`
                w-full text-left px-3 py-2 text-sm flex items-center gap-2
                ${focus ? 'bg-surface/80' : ''}
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-gray-300">{item.label}</span>
              {isLoading && (
                <svg
                  className="ml-auto animate-spin h-4 w-4 text-accent-purple"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
            </button>
          )}
        </MenuItem>
      )
    })
  }

  return (
    <Menu as="div" className="relative">
      <MenuButton className="bg-surface border border-border text-white hover:bg-surface/80 px-3 py-2 rounded-md text-sm flex items-center gap-2">
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Export
      </MenuButton>

      <MenuItems className="absolute right-0 mt-2 w-48 bg-background border border-border rounded-md shadow-lg z-10 py-1">
        {hasFilters && (
          <>
            <div className="px-3 py-1 text-xs text-gray-500 uppercase font-medium">
              Current view
            </div>
            {formatItems('current_view')}
            <div className="my-1 border-t border-border" />
          </>
        )}

        <div className="px-3 py-1 text-xs text-gray-500 uppercase font-medium">
          All data
        </div>
        {formatItems('all')}
      </MenuItems>
    </Menu>
  )
}
