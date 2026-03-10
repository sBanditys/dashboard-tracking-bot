'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { Loader2 } from 'lucide-react'
import { useTriggerExport, useCampaignExportStatus } from '@/hooks/use-campaigns'
import { useExportHistory } from '@/hooks/use-exports'

interface ExportCampaignModalProps {
  open: boolean
  onClose: () => void
  guildId: string
  campaignId: string
  exportId: string | null
  onExportStarted: (id: string) => void
  onExportDone: () => void
}

type ModalView = 'options' | 'progress' | 'complete' | 'error'

function formatExpiresIn(expiresAt: string): string {
  const hoursLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60))
  if (hoursLeft <= 0) return 'Link expired'
  return `Link expires in ${hoursLeft}h`
}

export function ExportCampaignModal({
  open,
  onClose,
  guildId,
  campaignId,
  exportId,
  onExportStarted,
  onExportDone,
}: ExportCampaignModalProps) {
  const [modalView, setModalView] = useState<ModalView>(() =>
    exportId ? 'progress' : 'options'
  )
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv')
  const [scope, setScope] = useState<'payment' | 'full'>('payment')
  const [quotaError, setQuotaError] = useState(false)

  // Sync view when exportId changes (e.g. modal re-opened mid-export)
  useEffect(() => {
    if (open) {
      setModalView(exportId ? 'progress' : 'options')
    }
  }, [open, exportId])

  const triggerExport = useTriggerExport(guildId, campaignId)
  const exportStatus = useCampaignExportStatus(guildId, campaignId, exportId)
  const { data: exportHistory } = useExportHistory(guildId, 1, 1)

  const quotaRemaining = exportHistory?.quota?.standard?.remaining ?? null

  // Transition view based on export status
  useEffect(() => {
    if (!exportStatus.data) return
    const { status, downloadUrl } = exportStatus.data
    if (status === 'completed' && downloadUrl) {
      setModalView('complete')
    } else if (status === 'failed') {
      setModalView('error')
    }
  }, [exportStatus.data])

  async function handleExport() {
    setQuotaError(false)
    try {
      const result = await triggerExport.mutateAsync({ format, scope })
      onExportStarted(result.exportId)
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.toLowerCase().includes('quota') || message.toLowerCase().includes('limit')) {
        setQuotaError(true)
      } else {
        setModalView('error')
      }
    }
  }

  function handleTryAgain() {
    setModalView('options')
    onExportDone()
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />

      {/* Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-w-md w-full bg-surface border border-border rounded-lg p-6 space-y-4 transition-all duration-200 ease-in-out">
          <DialogTitle
            id="export-modal-title"
            className="text-lg font-semibold text-white"
          >
            Export Campaign Data
          </DialogTitle>

          {/* Options view */}
          {modalView === 'options' && (
            <div className="space-y-4" aria-labelledby="export-modal-title">
              {/* Format radios */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Format</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="export-format"
                      value="csv"
                      checked={format === 'csv'}
                      onChange={() => setFormat('csv')}
                      disabled={triggerExport.isPending}
                      className="accent-accent-purple"
                    />
                    <span className="text-sm text-gray-300">CSV</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="export-format"
                      value="xlsx"
                      checked={format === 'xlsx'}
                      onChange={() => setFormat('xlsx')}
                      disabled={triggerExport.isPending}
                      className="accent-accent-purple"
                    />
                    <span className="text-sm text-gray-300">XLSX</span>
                  </label>
                </div>
              </div>

              {/* Scope radios */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Scope</p>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="export-scope"
                      value="payment"
                      checked={scope === 'payment'}
                      onChange={() => setScope('payment')}
                      disabled={triggerExport.isPending}
                      className="accent-accent-purple mt-0.5"
                    />
                    <div>
                      <span className="text-sm text-gray-300">Payment summary</span>
                      <p className="text-xs text-gray-500">Participant earnings, payment status, amounts</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="export-scope"
                      value="full"
                      checked={scope === 'full'}
                      onChange={() => setScope('full')}
                      disabled={triggerExport.isPending}
                      className="accent-accent-purple mt-0.5"
                    />
                    <div>
                      <span className="text-sm text-gray-300">Full data</span>
                      <p className="text-xs text-gray-500">All campaign data including posts, platforms, timestamps</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Quota display */}
              {quotaRemaining !== null && (
                <p className="text-xs text-gray-500">
                  {quotaRemaining} of 10 daily exports remaining
                </p>
              )}

              {/* Quota exceeded warning */}
              {quotaError && (
                <p className="text-xs text-red-400" role="alert">
                  Daily export limit reached. Try again tomorrow.
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={triggerExport.isPending}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-surface border border-border text-gray-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={triggerExport.isPending || quotaRemaining === 0 || quotaError}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-accent-purple hover:bg-accent-purple/80 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {triggerExport.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    'Export'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Progress view */}
          {modalView === 'progress' && (
            <div
              className="flex flex-col items-center gap-4 py-4"
              aria-live="polite"
              aria-labelledby="export-modal-title"
            >
              <Loader2 size={32} className="animate-spin text-accent-purple" />
              <p className="text-sm text-gray-300">Export in progress...</p>
              <p className="text-xs text-gray-500">This may take a moment. You can close this dialog and come back.</p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-md bg-surface border border-border text-gray-300 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {/* Complete view */}
          {modalView === 'complete' && exportStatus.data?.downloadUrl && (
            <div className="space-y-4" aria-labelledby="export-modal-title">
              <p className="text-gray-300 text-sm">Your export is ready to download.</p>

              <a
                href={exportStatus.data.downloadUrl}
                download
                className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium rounded-md bg-accent-purple hover:bg-accent-purple/80 text-white transition-colors"
              >
                Download
              </a>

              {exportStatus.data.expiresAt && (
                <p className="text-xs text-gray-500 text-center">
                  {formatExpiresIn(exportStatus.data.expiresAt)}
                </p>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onExportDone}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-surface border border-border text-gray-300 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Error view */}
          {modalView === 'error' && (
            <div className="space-y-4" aria-labelledby="export-modal-title">
              <p className="text-red-400 text-sm" role="alert">
                {exportStatus.data?.error ?? 'Export failed. Please try again.'}
              </p>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={onExportDone}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-surface border border-border text-gray-300 hover:text-white transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleTryAgain}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-accent-purple hover:bg-accent-purple/80 text-white transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  )
}
