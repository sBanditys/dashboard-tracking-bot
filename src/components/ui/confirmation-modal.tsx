'use client'

import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react'
import { cn } from '@/lib/utils'

interface ConfirmationModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  itemName: string
  isLoading?: boolean
  confirmLabel?: string
}

export function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  itemName,
  isLoading = false,
  confirmLabel = 'Delete',
}: ConfirmationModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />

      {/* Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-w-md w-full bg-surface border border-border rounded-lg p-6 space-y-4">
          <DialogTitle className="text-lg font-semibold text-white">
            {title}
          </DialogTitle>

          <Description className="text-gray-300">
            Are you sure you want to delete{' '}
            <span className="text-white font-medium">{itemName}</span>?
          </Description>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                'text-gray-300 hover:text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                'bg-red-600 hover:bg-red-700 text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoading ? 'Deleting...' : confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
