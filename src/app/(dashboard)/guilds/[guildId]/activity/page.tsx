'use client'

import { AuditLogTable } from '@/components/audit/audit-log-table'

interface PageProps {
  params: {
    guildId: string
  }
}

export default function ActivityPage({ params }: PageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Activity</h1>
        <p className="text-gray-400">
          View recent configuration changes for this server.
        </p>
      </div>

      <AuditLogTable guildId={params.guildId} />
    </div>
  )
}
