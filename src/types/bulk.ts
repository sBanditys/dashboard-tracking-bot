/**
 * Bulk operation types
 */

import type { ExportFormat } from './export'

export interface BulkOperationResult {
  total: number
  succeeded: number
  failed: number
  results: Array<{
    id: string
    status: 'success' | 'error'
    error?: string
  }>
}

export interface BulkDeleteRequest {
  ids: string[]
  dataType: 'accounts' | 'posts'
}

export interface BulkReassignRequest {
  ids: string[]
  dataType: 'accounts'
  targetBrandId: string
  targetGroupId?: string
}

export interface BulkExportRequest {
  ids: string[]
  dataType: 'accounts' | 'posts'
  format: ExportFormat
}
