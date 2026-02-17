'use client'

import { useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { Eye, Heart, MessageCircle, Share2, Users } from 'lucide-react'
import { useCreateThreshold } from '@/hooks/use-alerts'
import { cn } from '@/lib/utils'
import type { AlertThreshold, MetricType, Platform } from '@/types/alert'

interface ThresholdCreateModalProps {
  open: boolean
  onClose: () => void
  guildId: string
  groups: { id: string; label: string }[]
  existingThresholds: AlertThreshold[]
}

const METRIC_OPTIONS: { value: MetricType; label: string; icon: React.ReactNode }[] = [
  { value: 'views', label: 'Views', icon: <Eye className="w-5 h-5" /> },
  { value: 'likes', label: 'Likes', icon: <Heart className="w-5 h-5" /> },
  { value: 'comments', label: 'Comments', icon: <MessageCircle className="w-5 h-5" /> },
  { value: 'shares', label: 'Shares', icon: <Share2 className="w-5 h-5" /> },
  { value: 'followers', label: 'Followers', icon: <Users className="w-5 h-5" /> },
]

const PLATFORM_OPTIONS: { value: Platform | ''; label: string }[] = [
  { value: '', label: 'All platforms' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'x', label: 'X' },
  { value: 'facebook', label: 'Facebook' },
]

interface FormErrors {
  groupId?: string
  metricType?: string
  thresholdValue?: string
}

export function ThresholdCreateModal({
  open,
  onClose,
  guildId,
  groups,
  existingThresholds,
}: ThresholdCreateModalProps) {
  const [groupId, setGroupId] = useState('')
  const [metricType, setMetricType] = useState<MetricType | ''>('')
  const [platform, setPlatform] = useState<Platform | ''>('')
  const [thresholdValue, setThresholdValue] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  const createMutation = useCreateThreshold(guildId)

  // Duplicate detection
  const isDuplicate =
    groupId &&
    metricType &&
    existingThresholds.some(
      (t) =>
        t.accountGroupId === groupId &&
        t.metricType === metricType &&
        (platform === '' ? t.platform === null : t.platform === platform)
    )

  const duplicateGroup = isDuplicate
    ? groups.find((g) => g.id === groupId)?.label
    : null

  const selectedPlatformLabel = PLATFORM_OPTIONS.find((p) => p.value === platform)?.label ?? 'All platforms'
  const selectedMetricLabel = METRIC_OPTIONS.find((m) => m.value === metricType)?.label ?? ''

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!groupId) newErrors.groupId = 'Please select an account group'
    if (!metricType) newErrors.metricType = 'Please select a metric type'
    if (!thresholdValue || isNaN(Number(thresholdValue))) {
      newErrors.thresholdValue = 'Please enter a valid threshold value'
    } else if (Number(thresholdValue) < 1 || !Number.isInteger(Number(thresholdValue))) {
      newErrors.thresholdValue = 'Threshold value must be a positive whole number'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const resetForm = () => {
    setGroupId('')
    setMetricType('')
    setPlatform('')
    setThresholdValue('')
    setErrors({})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      await createMutation.mutateAsync({
        groupId,
        data: {
          metricType: metricType as MetricType,
          platform: platform === '' ? null : (platform as Platform),
          thresholdValue: Number(thresholdValue),
          accountGroupId: groupId,
        },
      })
      resetForm()
      onClose()
    } catch {
      // Error handled by mutation (toast)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />

      {/* Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <DialogPanel className="max-w-md w-full bg-surface border border-border rounded-lg p-6 space-y-5">
          <DialogTitle className="text-lg font-semibold text-white">
            Create Alert Threshold
          </DialogTitle>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Account Group */}
            <div>
              <label htmlFor="threshold-group" className="block text-sm font-medium text-gray-300 mb-1">
                Account Group <span className="text-red-400">*</span>
              </label>
              <select
                id="threshold-group"
                value={groupId}
                onChange={(e) => {
                  setGroupId(e.target.value)
                  if (errors.groupId) setErrors((prev) => ({ ...prev, groupId: undefined }))
                }}
                disabled={createMutation.isPending}
                className={cn(
                  'w-full px-3 py-2 rounded-md',
                  'bg-background border text-white',
                  'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  errors.groupId ? 'border-red-500' : 'border-border'
                )}
              >
                <option value="">Select a group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </select>
              {errors.groupId && (
                <p className="mt-1 text-xs text-red-400">{errors.groupId}</p>
              )}
            </div>

            {/* Metric Type — radio cards */}
            <div>
              <p className="block text-sm font-medium text-gray-300 mb-2" role="radiogroup" aria-labelledby="metric-type-label">
                <span id="metric-type-label">Metric Type</span> <span className="text-red-400">*</span>
              </p>
              <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-labelledby="metric-type-label">
                {METRIC_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={metricType === option.value}
                    onClick={() => {
                      setMetricType(option.value)
                      if (errors.metricType) setErrors((prev) => ({ ...prev, metricType: undefined }))
                    }}
                    disabled={createMutation.isPending}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-accent-purple/50',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      metricType === option.value
                        ? 'border-accent-purple bg-accent-purple/10 text-white'
                        : 'border-border text-gray-400 hover:border-gray-500 hover:text-gray-300'
                    )}
                  >
                    {option.icon}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
              {errors.metricType && (
                <p className="mt-1 text-xs text-red-400">{errors.metricType}</p>
              )}
            </div>

            {/* Platform */}
            <div>
              <label htmlFor="threshold-platform" className="block text-sm font-medium text-gray-300 mb-1">
                Platform
              </label>
              <select
                id="threshold-platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform | '')}
                disabled={createMutation.isPending}
                className={cn(
                  'w-full px-3 py-2 rounded-md',
                  'bg-background border border-border text-white',
                  'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {PLATFORM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Threshold Value */}
            <div>
              <label htmlFor="threshold-value" className="block text-sm font-medium text-gray-300 mb-1">
                Threshold Value <span className="text-red-400">*</span>
              </label>
              <input
                id="threshold-value"
                type="number"
                min="1"
                step="1"
                value={thresholdValue}
                onChange={(e) => {
                  setThresholdValue(e.target.value)
                  if (errors.thresholdValue) setErrors((prev) => ({ ...prev, thresholdValue: undefined }))
                }}
                disabled={createMutation.isPending}
                placeholder="e.g. 10000"
                className={cn(
                  'w-full px-3 py-2 rounded-md',
                  'bg-background border text-white placeholder-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  errors.thresholdValue ? 'border-red-500' : 'border-border'
                )}
              />
              <p className="mt-1 text-xs text-gray-500">
                Alert fires when metric exceeds this value in a single post/period.
              </p>
              {errors.thresholdValue && (
                <p className="mt-1 text-xs text-red-400">{errors.thresholdValue}</p>
              )}
            </div>

            {/* Duplicate warning */}
            {isDuplicate && (
              <div className="p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm text-yellow-400">
                  A threshold for <strong>{selectedMetricLabel}</strong> on <strong>{selectedPlatformLabel}</strong> already exists for <strong>{duplicateGroup}</strong>. You can still create it, but alerts may fire multiple times.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={createMutation.isPending}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  'text-gray-400 hover:text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  'bg-accent-purple text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Threshold'}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
