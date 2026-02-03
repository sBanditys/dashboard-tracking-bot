// Source: https://headlessui.com/react/dialog
import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react'

interface ConfirmationModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  itemName: string  // Per decision: show just the item name
  isLoading?: boolean
}

export function ConfirmationModal({
  open, onClose, onConfirm, title, itemName, isLoading
}: ConfirmationModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />

      {/* Full-screen container for centering */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-w-md w-full bg-surface border border-border rounded-lg p-6">
          <DialogTitle className="text-lg font-semibold text-white">
            {title}
          </DialogTitle>
          <Description className="mt-2 text-gray-400">
            Are you sure you want to delete <span className="text-white font-medium">{itemName}</span>?
          </Description>

          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
