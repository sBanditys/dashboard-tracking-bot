'use client'

import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface TypeToConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: React.ReactNode
  confirmText: string
  confirmLabel?: string
  isLoading?: boolean
  variant?: 'danger' | 'warning' | 'default'
}

export function TypeToConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  confirmLabel = 'Confirm',
  isLoading = false,
  variant = 'danger',
}: TypeToConfirmModalProps) {
  const [inputValue, setInputValue] = useState('')

  // Reset input when modal opens
  useEffect(() => {
    if (open) {
      setInputValue('')
    }
  }, [open])

  const isConfirmEnabled = inputValue === confirmText && !isLoading

  const getButtonStyles = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700'
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700'
      case 'default':
        return 'bg-accent-purple hover:bg-accent-purple/90'
    }
  }

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
            {description}
          </Description>

          <div className="space-y-2">
            <p className="text-sm text-gray-400">
              Type <span className="text-white font-medium">{confirmText}</span> to confirm
            </p>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmText}
              disabled={isLoading}
              className={cn(
                'w-full px-3 py-2 rounded-md border',
                'bg-background border-border text-white',
                'placeholder:text-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-accent-purple/50',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            />
          </div>

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
              disabled={!isConfirmEnabled}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors text-white',
                getButtonStyles(),
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
