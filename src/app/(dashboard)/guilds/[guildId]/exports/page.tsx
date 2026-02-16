'use client'

import { use, useState } from 'react'
import { GuildTabs } from '@/components/guild-tabs'
import { ExportConfigForm } from '@/components/export/export-config-form'
import { ExportHistoryTable } from '@/components/export/export-history-table'
import { ExportProgress } from '@/components/export/export-progress'
import { useGuild } from '@/hooks/use-guilds'
import { useExportStatus } from '@/hooks/use-exports'
import type { ExportRecord } from '@/types/export'

interface PageProps {
  params: Promise<{ guildId: string }>
}

export default function ExportsPage({ params }: PageProps) {
  const { guildId } = use(params)
  const { data: guild } = useGuild(guildId)
  const [activeExportId, setActiveExportId] = useState<string | null>(null)
  const { data: activeExport } = useExportStatus(guildId, activeExportId)

  const guildName = guild?.name ?? guildId

  const handleExportStarted = (exportRecord: ExportRecord) => {
    setActiveExportId(exportRecord.id)
  }

  const isExportActive = activeExport &&
    (activeExport.status === 'pending' || activeExport.status === 'processing')

  const handleDismiss = () => {
    setActiveExportId(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Exports</h1>
        <p className="text-gray-400 text-sm mt-1">
          Export and download your tracking data
        </p>
      </div>

      <GuildTabs guildId={guildId} />

      <ExportConfigForm
        guildId={guildId}
        guildName={guildName}
        onExportStarted={handleExportStarted}
      />

      {activeExportId && activeExport && !isExportActive && (
        <ExportProgress
          progress={activeExport.progress}
          status={activeExport.status}
          recordCount={activeExport.recordCount ?? 0}
          downloadUrl={activeExport.downloadUrl}
          onDismiss={handleDismiss}
        />
      )}

      <ExportHistoryTable guildId={guildId} />
    </div>
  )
}
