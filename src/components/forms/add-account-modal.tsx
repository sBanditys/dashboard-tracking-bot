'use client'

import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAddAccount, useBrands } from '@/hooks/use-tracking'

interface AddAccountModalProps {
  guildId: string
  open: boolean
  onClose: () => void
}

export function AddAccountModal({ guildId, open, onClose }: AddAccountModalProps) {
  const [platform, setPlatform] = useState<'instagram' | 'tiktok' | 'youtube' | 'x'>('instagram')
  const [username, setUsername] = useState('')
  const [brandId, setBrandId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const addAccount = useAddAccount(guildId)
  const { data: brandsData } = useBrands(guildId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!username.trim()) {
      setError('Username is required')
      return
    }
    if (!brandId) {
      setError('Brand is required')
      return
    }

    // Strip @ prefix if present
    const cleanUsername = username.trim().replace(/^@/, '')

    addAccount.mutate(
      {
        platform,
        username: cleanUsername,
        brand_id: brandId,
      },
      {
        onSuccess: () => {
          // Reset form and close modal
          setPlatform('instagram')
          setUsername('')
          setBrandId('')
          setError(null)
          onClose()
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Failed to add account')
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
            Add Tracked Account
          </DialogTitle>

          <Description className="text-sm text-gray-300">
            Add a new social media account to track for this guild.
          </Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Platform Select */}
            <div>
              <label htmlFor="platform" className="block text-sm font-medium text-gray-300 mb-1">
                Platform
              </label>
              <select
                id="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as 'instagram' | 'tiktok' | 'youtube' | 'x')}
                disabled={addAccount.isPending}
                className={cn(
                  'w-full px-3 py-2 rounded-md',
                  'bg-background border border-border',
                  'text-white placeholder-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="x">X (Twitter)</option>
              </select>
            </div>

            {/* Username Input */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={addAccount.isPending}
                placeholder="username (@ will be stripped)"
                className={cn(
                  'w-full px-3 py-2 rounded-md',
                  'bg-background border border-border',
                  'text-white placeholder-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              />
            </div>

            {/* Brand Select */}
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-300 mb-1">
                Brand
              </label>
              <select
                id="brand"
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                disabled={addAccount.isPending}
                className={cn(
                  'w-full px-3 py-2 rounded-md',
                  'bg-background border border-border',
                  'text-white placeholder-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <option value="">Select a brand</option>
                {brandsData?.brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.label}
                  </option>
                ))}
              </select>
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
                disabled={addAccount.isPending}
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
                disabled={addAccount.isPending}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  'bg-accent-purple hover:bg-accent-purple/90 text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {addAccount.isPending ? 'Adding...' : 'Add Account'}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
