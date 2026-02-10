/**
 * Export-related types
 */

export type ExportFormat = 'csv' | 'json' | 'xlsx'

export type ExportMode = 'current_view' | 'all'

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired'

export interface ExportRequest {
  format: ExportFormat
  mode: ExportMode
  dataType: 'accounts' | 'posts'
  filters?: Record<string, string>
  filename?: string
}

export interface ExportRecord {
  id: string
  format: ExportFormat
  dataType: 'accounts' | 'posts'
  status: ExportStatus
  filename: string | null
  recordCount: number | null
  progress: number
  downloadUrl: string | null
  expiresAt: string | null
  errorMessage: string | null
  createdAt: string
  completedAt: string | null
}

export interface ExportHistoryResponse {
  exports: ExportRecord[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}

export interface ExportProgressEvent {
  progress: number
  status: ExportStatus
  recordCount: number
  message?: string
}
