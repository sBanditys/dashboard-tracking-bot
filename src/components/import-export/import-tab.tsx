'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Download, RefreshCw, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UploadZone } from './upload-zone'
import { ImportValidationDisplay } from './import-validation-display'
import { ImportHistory } from './import-history'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { useImportTemplate, useImportPreview, useConfirmImport } from '@/hooks/use-import'
import type { ImportPreview, ImportProgressEvent } from '@/types/import'

type ImportFlowState =
  | { step: 'upload'; error?: string | null }
  | { step: 'validating' }
  | { step: 'preview'; data: ImportPreview }
  | { step: 'confirm'; data: ImportPreview }
  | { step: 'importing'; data: ImportPreview; processed: number; total: number; percentage: number }
  | { step: 'complete'; imported: number; failed: number }
  | { step: 'error'; message: string }
  | { step: 'locked'; message: string }

interface ImportTabProps {
  guildId: string
}

/**
 * Orchestrates the full import flow:
 *
 * 1. Upload state   — UploadZone + template download
 * 2. Validating     — spinner while preview API is in flight
 * 3. Preview state  — ImportValidationDisplay (all-or-nothing)
 * 4. Confirm dialog — extra confirmation before starting import
 * 5. Importing      — real-time SSE progress bar with ARIA live announcements
 * 6. Complete       — success summary with link to accounts
 * 7. Error          — red progress + retry button
 * 8. Locked (409)   — concurrent import blocking message
 */
export function ImportTab({ guildId }: ImportTabProps) {
  const [flowState, setFlowState] = useState<ImportFlowState>({ step: 'upload' })
  const [ariaAnnouncement, setAriaAnnouncement] = useState('')
  const [announcedMilestones, setAnnouncedMilestones] = useState<Set<number>>(new Set())

  const { downloadTemplate } = useImportTemplate(guildId)
  const importPreview = useImportPreview(guildId)
  const { confirm: confirmImport, isConfirming } = useConfirmImport(guildId)

  const handleFileSelected = useCallback(
    async (file: File) => {
      setFlowState({ step: 'validating' })
      try {
        const preview = await importPreview.mutateAsync(file)
        setFlowState({ step: 'preview', data: preview })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to preview import'
        // 409: concurrent import in progress
        if (msg.includes('409') || msg.toLowerCase().includes('in progress') || msg.toLowerCase().includes('conflict')) {
          setFlowState({
            step: 'locked',
            message: 'An import is currently in progress. Please wait for it to complete.',
          })
          return
        }
        setFlowState({ step: 'upload', error: msg })
      }
    },
    [importPreview]
  )

  const handleConfirmOpen = useCallback(() => {
    if (flowState.step === 'preview') {
      setFlowState({ step: 'confirm', data: flowState.data })
    }
  }, [flowState])

  const handleConfirmClose = useCallback(() => {
    if (flowState.step === 'confirm') {
      setFlowState({ step: 'preview', data: flowState.data })
    }
  }, [flowState])

  const handleStartImport = useCallback(async () => {
    if (flowState.step !== 'confirm') return
    const { data } = flowState

    // Transition to importing state
    setFlowState({ step: 'importing', data, processed: 0, total: data.validRows, percentage: 0 })
    setAnnouncedMilestones(new Set())

    const handleProgress = (event: ImportProgressEvent) => {
      if (event.type === 'complete') {
        const imported = event.result?.imported ?? event.processed
        const failed = event.result?.failed ?? 0
        setFlowState({ step: 'complete', imported, failed })
        setAriaAnnouncement(`Import complete. ${imported} accounts imported successfully.`)
        return
      }

      if (event.type === 'error') {
        setFlowState({ step: 'error', message: event.message ?? 'Import failed' })
        setAriaAnnouncement('Import failed. Please try again.')
        return
      }

      // progress event
      setFlowState({
        step: 'importing',
        data,
        processed: event.processed,
        total: event.total,
        percentage: event.percentage,
      })

      // ARIA milestone announcements at 25%, 50%, 75%, 100%
      const milestones = [25, 50, 75, 100]
      setAnnouncedMilestones((prev) => {
        const newSet = new Set(prev)
        for (const milestone of milestones) {
          if (event.percentage >= milestone && !newSet.has(milestone)) {
            newSet.add(milestone)
            setAriaAnnouncement(`Import ${milestone}% complete. ${event.processed} of ${event.total} accounts processed.`)
          }
        }
        return newSet
      })
    }

    try {
      await confirmImport(data.importId, handleProgress)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed'
      setFlowState({ step: 'error', message: msg })
    }
  }, [flowState, confirmImport])

  const handleReset = useCallback(() => {
    setFlowState({ step: 'upload' })
    setAriaAnnouncement('')
    setAnnouncedMilestones(new Set())
  }, [])

  const handleCheckStatus = useCallback(() => {
    setFlowState({ step: 'upload' })
  }, [])

  return (
    <div className="space-y-4">
      {/* ARIA live region for progress announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {ariaAnnouncement}
      </div>

      {/* Upload state */}
      {flowState.step === 'upload' && (
        <div className="space-y-4">
          <UploadZone
            onFileSelected={handleFileSelected}
            error={flowState.error}
          />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={downloadTemplate}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                'text-gray-300 hover:text-white border border-border hover:border-gray-500'
              )}
            >
              <Download className="w-4 h-4" />
              Download CSV template
            </button>
          </div>
        </div>
      )}

      {/* Validating state */}
      {flowState.step === 'validating' && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Validating CSV...</p>
        </div>
      )}

      {/* Preview state */}
      {flowState.step === 'preview' && (
        <ImportValidationDisplay
          preview={flowState.data}
          onConfirm={handleConfirmOpen}
          onCancel={handleReset}
          isConfirming={isConfirming}
        />
      )}

      {/* Extra confirmation dialog (locked decision) */}
      {flowState.step === 'confirm' && (
        <>
          <ImportValidationDisplay
            preview={flowState.data}
            onConfirm={handleConfirmOpen}
            onCancel={handleReset}
            isConfirming={isConfirming}
          />
          <ConfirmationModal
            open={true}
            onClose={handleConfirmClose}
            onConfirm={handleStartImport}
            title="Confirm Import"
            itemName={`${flowState.data.validRows} accounts`}
            isLoading={isConfirming}
            confirmLabel={`Import ${flowState.data.validRows} accounts`}
          />
        </>
      )}

      {/* Importing state — real-time SSE progress bar */}
      {flowState.step === 'importing' && (
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Importing accounts...</span>
              <span className="text-gray-400">
                {flowState.processed}/{flowState.total}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={flowState.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Import progress"
              className="w-full bg-gray-700 rounded-full h-2 overflow-hidden"
            >
              <div
                className="h-2 rounded-full bg-accent-purple transition-all duration-300 ease-out"
                style={{ width: `${flowState.percentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 text-center">
              {flowState.percentage}% complete
            </p>
          </div>
        </div>
      )}

      {/* Complete state */}
      {flowState.step === 'complete' && (
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4 text-center">
          <div className="flex items-center justify-center gap-2 text-green-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-lg font-semibold">Import Complete</span>
          </div>
          <p className="text-gray-300">
            <span className="text-white font-medium">{flowState.imported}</span> accounts imported successfully
            {flowState.failed > 0 && (
              <span className="text-yellow-400 ml-2">
                ({flowState.failed} failed)
              </span>
            )}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href={`/guilds/${guildId}/accounts`}
              className={cn(
                'inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors',
                'bg-accent-purple hover:bg-accent-purple/90 text-white'
              )}
            >
              View accounts
            </Link>
            <button
              type="button"
              onClick={handleReset}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                'text-gray-300 hover:text-white border border-border hover:border-gray-500'
              )}
            >
              Import another file
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {flowState.step === 'error' && (
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Import failed
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Import failed"
              className="w-full bg-gray-700 rounded-full h-2 overflow-hidden"
            >
              <div className="h-2 rounded-full bg-red-500 w-full" />
            </div>
          </div>
          <p className="text-red-400 text-sm">{flowState.message}</p>
          <button
            type="button"
            onClick={handleReset}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
              'bg-gray-700 hover:bg-gray-600 text-white'
            )}
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      )}

      {/* 409 Locked state — concurrent import in progress */}
      {flowState.step === 'locked' && (
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-yellow-400 font-medium text-sm">Import In Progress</p>
              <p className="text-gray-300 text-sm">{flowState.message}</p>
            </div>
          </div>
          <UploadZone
            onFileSelected={handleFileSelected}
            disabled={true}
          />
          <button
            type="button"
            onClick={handleCheckStatus}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
              'border border-border text-gray-300 hover:text-white hover:border-gray-500'
            )}
          >
            <RefreshCw className="w-4 h-4" />
            Check status
          </button>
        </div>
      )}

      {/* Import history (always visible below the main flow) */}
      <ImportHistory guildId={guildId} />
    </div>
  )
}
