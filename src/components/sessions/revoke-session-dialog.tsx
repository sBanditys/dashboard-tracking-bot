'use client'

import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react'
import { cn } from '@/lib/utils'

interface RevokeSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mode: 'single' | 'all';
  deviceName?: string;
  browserInfo?: string;
  isCurrent?: boolean;
  sessionCount?: number;
  isLoading?: boolean;
}

export function RevokeSessionDialog({
  open,
  onClose,
  onConfirm,
  mode,
  deviceName,
  browserInfo,
  isCurrent,
  sessionCount,
  isLoading = false,
}: RevokeSessionDialogProps) {
  // Determine dialog content based on mode
  const title = mode === 'single' ? 'Revoke Session' : 'Logout All Devices';

  const description = mode === 'single'
    ? isCurrent
      ? `You are about to revoke your **current session** on **${deviceName}**. You will be logged out and redirected to the login page.`
      : `Are you sure you want to revoke the session on **${deviceName}** (${browserInfo})? This device will no longer have access.`
    : `This will revoke all **${sessionCount}** active sessions, including your current one. You will be logged out and need to sign in again.`;

  const confirmLabel = mode === 'single'
    ? isLoading ? 'Revoking...' : 'Revoke Session'
    : isLoading ? 'Logging out...' : 'Logout All';

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
            {/* Convert markdown-style bold to actual bold */}
            {description.split('**').map((part, i) =>
              i % 2 === 0 ? part : <strong key={i} className="text-white font-medium">{part}</strong>
            )}
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
              {confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
