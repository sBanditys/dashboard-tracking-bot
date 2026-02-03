
import { useQuery } from '@tanstack/react-query';

// Source: Pattern based on codebase use-tracking.ts
interface AuditLogFilters {
  user?: string
  action?: string
  page?: number
  limit?: number
}

interface AuditLogEntry {
  id: string
  created_at: string
  actor: {
    id: string
    type: 'user' | 'system' | 'bot'
    name?: string
  }
  action: string
  target_type: string
  target_id: string | null
  changes: Record<string, { old: unknown; new: unknown }> | null
}

interface AuditLogResponse {
  entries: AuditLogEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

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
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!guildId,
  })
}
