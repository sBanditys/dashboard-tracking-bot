'use client'

import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAddBrand } from '@/hooks/use-tracking'

interface AddBrandModalProps {
  guildId: string
  open: boolean
  onClose: () => void
}

export function AddBrandModal({ guildId, open, onClose }: AddBrandModalProps) {
  const [label, setLabel] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string | null>(null)

  const addBrand = useAddBrand(guildId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!label.trim()) {
      setError('Label is required')
      return
    }

    addBrand.mutate(
      {
        label: label.trim(),
        slug: slug.trim() || undefined,
      },
      {
        onSuccess: () => {
          // Reset form and close modal
          setLabel('')
          setSlug('')
          setError(null)
          onClose()
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Failed to add brand')
        },
      }
    )
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />

      {/* Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-w-md w-full bg-surface border border-border rounded-lg p-6 space-y-4">
          <DialogTitle className="text-lg font-semibold text-white">
            Add Brand
          </DialogTitle>

          <Description className="text-sm text-gray-300">
            Create a new brand to organize tracked accounts.
          </Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Label Input */}
            <div>
              <label htmlFor="label" className="block text-sm font-medium text-gray-300 mb-1">
                Label <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={addBrand.isPending}
                placeholder="Brand name"
                className={cn(
                  'w-full px-3 py-2 rounded-md',
                  'bg-background border border-border',
                  'text-white placeholder-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              />
            </div>

            {/* Slug Input */}
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-300 mb-1">
                Slug <span className="text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={addBrand.isPending}
                placeholder="Auto-generated if not provided"
                className={cn(
                  'w-full px-3 py-2 rounded-md',
                  'bg-background border border-border',
                  'text-white placeholder-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              />
              <p className="mt-1 text-xs text-gray-500">
                Used for URLs and API references. Auto-generated from label if not provided.
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={addBrand.isPending}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  'text-gray-300 hover:text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addBrand.isPending}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  'bg-accent-purple hover:bg-accent-purple/90 text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {addBrand.isPending ? 'Adding...' : 'Add Brand'}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
