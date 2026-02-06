'use client'

import { AuditLogTable } from '@/components/audit/audit-log-table'

interface PageProps {
  params: { guildId: string }
}

export default function ActivityPage({ params }: PageProps) {
  const { guildId } = params

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Activity Log</h1>
        <p className="text-gray-400 text-sm mt-1">
          Track all changes made to guild settings and tracked items
        </p>
      </div>
      <AuditLogTable guildId={guildId} />
    </div>
  )
}
