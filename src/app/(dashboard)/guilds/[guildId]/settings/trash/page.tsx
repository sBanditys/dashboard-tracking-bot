'use client'

import { use } from 'react'
import { GuildTabs } from '@/components/guild-tabs'
import { TrashList } from '@/components/trash/trash-list'

interface PageProps {
  params: Promise<{ guildId: string }>
}

export default function TrashPage({ params }: PageProps) {
  const { guildId } = use(params)

  return (
    <div className="space-y-6">
      <GuildTabs guildId={guildId} />

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Deleted Items</h1>
        <p className="mt-1 text-gray-400">
          Items deleted from this guild. Automatically purged after 30 days.
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-amber-100/80 dark:bg-yellow-500/10 border border-amber-400/50 dark:border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
        <svg
          className="w-5 h-5 text-amber-600 dark:text-yellow-400 shrink-0 mt-0.5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-sm font-medium text-amber-900 dark:text-yellow-200">
          Deleted items are kept for 30 days before permanent removal. You can restore items at any time during this period.
        </p>
      </div>

      {/* Trash list */}
      <TrashList guildId={guildId} />
    </div>
  )
}
