'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ImportTab } from '@/components/import-export/import-tab'
import { ExportTab } from '@/components/import-export/export-tab'

type TabId = 'import' | 'export'

const TABS: { id: TabId; label: string }[] = [
  { id: 'import', label: 'Import' },
  { id: 'export', label: 'Export' },
]

/**
 * Data management page at /guilds/[guildId]/manage/data
 *
 * Layout:
 * - Page header: "Data Management" title
 * - Tab navigation: Import / Export with slide transition indicator
 * - Import tab: full ImportTab component
 * - Export tab: placeholder (implemented in Plan 06)
 *
 * Admin gating is handled by the parent ManageLayout.
 */
export default function DataPage() {
  const params = useParams()
  const guildId = params.guildId as string
  const [activeTab, setActiveTab] = useState<TabId>('import')

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Data Management</h2>
        <p className="text-sm text-gray-400 mt-1">
          Import and export account data for this server.
        </p>
      </div>

      {/* Tab navigation with slide indicator */}
      <div className="relative">
        <div className="inline-flex bg-surface border border-border rounded-lg p-1 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
                activeTab === tab.id
                  ? 'bg-accent-purple text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              )}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content with slide transition */}
      <div className="overflow-hidden">
        <div
          className="transition-transform duration-200"
          style={{
            transform: activeTab === 'import' ? 'translateX(0)' : 'translateX(-100%)',
          }}
        >
          {/* Import tab */}
          <div
            role="tabpanel"
            aria-label="Import tab"
            className={cn(activeTab !== 'import' && 'hidden')}
          >
            <ImportTab guildId={guildId} />
          </div>
        </div>

        {/* Export tab */}
        {activeTab === 'export' && (
          <div role="tabpanel" aria-label="Export tab">
            <ExportTab guildId={guildId} />
          </div>
        )}
      </div>
    </div>
  )
}
