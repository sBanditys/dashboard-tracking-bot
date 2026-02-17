/**
 * CSV import types for bulk account imports
 */

export interface ImportValidationError {
  row: number
  column: string
  message: string
  value: string
}

export interface ImportPreview {
  totalRows: number
  validRows: number
  invalidRows: number
  errors: ImportValidationError[]
  preview: ImportPreviewRow[]
  importId: string
}

export interface ImportPreviewRow {
  row: number
  username: string
  platform: string
  brand: string
  group: string
  valid: boolean
  errors: string[]
}

export type ImportProgressEventType = 'progress' | 'complete' | 'error'

export interface ImportProgressEvent {
  type: ImportProgressEventType
  processed: number
  total: number
  percentage: number
  message?: string
  result?: ImportResult
}

export interface ImportResult {
  imported: number
  skipped: number
  failed: number
  errors: string[]
}

export interface ImportHistoryEntry {
  id: string
  filename: string
  rowCount: number
  importedCount: number
  status: 'completed' | 'failed' | 'partial'
  createdAt: string
  createdBy: string
}
