'use client'

import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import type { Brand } from '@/types/tracking'

interface ReassignModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (targetBrandId: string, targetGroupId?: string) => void
  selectedCount: number
  guildId: string
  isLoading?: boolean
}

export function ReassignModal({
  open,
  onClose,
  onConfirm,
  selectedCount,
  guildId,
  isLoading = false,
}: ReassignModalProps) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [selectedBrandId, setSelectedBrandId] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [confirmText, setConfirmText] = useState('')

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedBrandId('')
      setSelectedGroupId('')
      setConfirmText('')
    }
  }, [open])

  // Fetch brands on mount
  useEffect(() => {
    if (open && brands.length === 0) {
      setLoadingBrands(true)
      fetch(`/api/guilds/${guildId}/brands`)
        .then((res) => res.json())
        .then((data) => {
          setBrands(data.brands || [])
        })
        .catch((error) => {
          console.error('Failed to fetch brands:', error)
        })
        .finally(() => {
          setLoadingBrands(false)
        })
    }
  }, [open, guildId, brands.length])

  const selectedBrand = brands.find((b) => b.id === selectedBrandId)
  const confirmValue = String(selectedCount)
  const isConfirmEnabled =
    selectedBrandId && confirmText === confirmValue && !isLoading

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm(selectedBrandId, selectedGroupId || undefined)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />

      {/* Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-w-md w-full bg-surface border border-border rounded-xl p-6 space-y-4">
          <DialogTitle className="text-lg font-semibold text-white">
            Reassign {selectedCount} accounts
          </DialogTitle>

          <Description className="text-gray-300">
            Select the brand and optional group to reassign these accounts to.
          </Description>

          <div className="space-y-4">
            {/* Brand select */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Target Brand <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedBrandId}
                onChange={(e) => {
                  setSelectedBrandId(e.target.value)
                  setSelectedGroupId('') // Reset group when brand changes
                }}
                disabled={loadingBrands || isLoading}
                className={cn(
                  'bg-background border border-border rounded-md px-3 py-2 text-white w-full',
                  'focus:outline-none focus:ring-2 focus:ring-accent-purple/50',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <option value="">
                  {loadingBrands ? 'Loading brands...' : 'Select a brand'}
                </option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Group select */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Target Group (optional)
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                disabled={!selectedBrandId || isLoading}
                className={cn(
                  'bg-background border border-border rounded-md px-3 py-2 text-white w-full',
                  'focus:outline-none focus:ring-2 focus:ring-accent-purple/50',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <option value="">No group</option>
                {selectedBrand?.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Warning */}
            {selectedBrand && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3">
                <p className="text-sm text-yellow-200">
                  This will reassign {selectedCount} accounts to{' '}
                  <span className="font-medium">{selectedBrand.label}</span>
                  {selectedGroupId &&
                    selectedBrand.groups.find((g) => g.id === selectedGroupId) && (
                      <>
                        {' '}
                        in group{' '}
                        <span className="font-medium">
                          {
                            selectedBrand.groups.find((g) => g.id === selectedGroupId)
                              ?.label
                          }
                        </span>
                      </>
                    )}
                  .
                </p>
              </div>
            )}

            {/* Type to confirm */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">
                Type <span className="text-white font-medium">{confirmValue}</span>{' '}
                to confirm
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={confirmValue}
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
              onClick={handleConfirm}
              disabled={!isConfirmEnabled}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors text-white',
                'bg-accent-purple hover:bg-accent-purple/90',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoading ? 'Reassigning...' : 'Reassign'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
