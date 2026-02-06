'use client'

import { useQuery } from '@tanstack/react-query'
import type { AuditLogResponse, AuditLogFilters, AuditLogEntry } from '@/types/audit'

// Re-export for convenience
export type { AuditLogEntry }

export function useAuditLog(guildId: string, filters: AuditLogFilters = {}) {
  return useQuery<AuditLogResponse>({
    queryKey: ['guild', guildId, 'audit-log', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.user) params.set('user', filters.user)
      if (filters.action) params.set('action', filters.action)
      params.set('page', String(filters.page ?? 1))
      params.set('limit', String(filters.limit ?? 25))

      const response = await fetch(`/api/guilds/${guildId}/audit-log?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch audit log')
      }
      return response.json()
    },
    staleTime: 30 * 1000,
    enabled: !!guildId,
  })
}
