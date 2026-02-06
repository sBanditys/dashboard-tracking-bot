export interface AuditLogActor {
  id: string
  type: 'user' | 'system' | 'bot'
  name?: string
}

export interface AuditLogEntry {
  id: string
  created_at: string
  actor: AuditLogActor
  action: string
  target_type: string
  target_id: string | null
  target_name: string | null
  changes: Record<string, { old: unknown; new: unknown }> | null
}

export interface AuditLogFilters {
  user?: string
  action?: string
  page?: number
  limit?: number
}

export interface AuditLogResponse {
  entries: AuditLogEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  filters: {
    users: Array<{ id: string; name: string }>
    actions: string[]
  }
}
