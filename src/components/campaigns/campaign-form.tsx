'use client'

import { useState, useCallback, useMemo } from 'react'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlatformIcon } from '@/components/platform-icon'
import { createCampaignSchema } from '@/types/campaign'
import type { CreateCampaignInput, UpdateCampaignInput } from '@/types/campaign'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CampaignFormValues {
  name: string
  brandId: string
  budgetCents: number
  perUserCapCents: number
  instagramRateCents: number | null
  tiktokRateCents: number | null
  youtubeRateCents: number | null
  closeThreshold: number
  rules: string | null
  dailySubmissionLimit: number | null
  paymentMethods: string[]
  reviewChannelId: string | null
  alertsChannelId: string | null
  announcementChannelId: string | null
  version?: number
}

interface CampaignFormProps {
  mode: 'create' | 'edit'
  initialValues?: Partial<CampaignFormValues>
  onSubmit: (values: CreateCampaignInput | UpdateCampaignInput) => void
  isPending: boolean
  onCancel: () => void
  brands: Array<{ id: string; label: string }>
  brandsLoading: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function centsToDollars(cents: number | null | undefined): string {
  if (cents == null || cents === 0) return ''
  return (cents / 100).toFixed(2)
}

function dollarsToCents(dollars: string): number {
  const parsed = parseFloat(dollars)
  if (isNaN(parsed)) return 0
  return Math.round(parsed * 100)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CampaignForm({
  mode,
  initialValues,
  onSubmit,
  isPending,
  onCancel,
  brands,
  brandsLoading,
}: CampaignFormProps) {
  // --- Form state (all strings for controlled inputs) ---
  const [name, setName] = useState(initialValues?.name ?? '')
  const [brandId, setBrandId] = useState(initialValues?.brandId ?? '')
  const [budget, setBudget] = useState(centsToDollars(initialValues?.budgetCents))
  const [perUserCap, setPerUserCap] = useState(centsToDollars(initialValues?.perUserCapCents))
  const [instagramRate, setInstagramRate] = useState(centsToDollars(initialValues?.instagramRateCents))
  const [tiktokRate, setTiktokRate] = useState(centsToDollars(initialValues?.tiktokRateCents))
  const [youtubeRate, setYoutubeRate] = useState(centsToDollars(initialValues?.youtubeRateCents))
  const [closeThreshold, setCloseThreshold] = useState(
    initialValues?.closeThreshold != null ? String(initialValues.closeThreshold) : '90'
  )
  const [rules, setRules] = useState(initialValues?.rules ?? '')
  const [dailySubmissionLimit, setDailySubmissionLimit] = useState(
    initialValues?.dailySubmissionLimit != null ? String(initialValues.dailySubmissionLimit) : ''
  )
  const [paymentMethods, setPaymentMethods] = useState(
    initialValues?.paymentMethods?.join(', ') ?? ''
  )
  const [reviewChannelId, setReviewChannelId] = useState(initialValues?.reviewChannelId ?? '')
  const [alertsChannelId, setAlertsChannelId] = useState(initialValues?.alertsChannelId ?? '')
  const [announcementChannelId, setAnnouncementChannelId] = useState(
    initialValues?.announcementChannelId ?? ''
  )

  const [error, setError] = useState<string | null>(null)

  // Determine if advanced section has values (for default-open in edit mode)
  const hasAdvancedValues = useMemo(() => {
    if (!initialValues) return false
    return (
      (initialValues.closeThreshold != null && initialValues.closeThreshold !== 90) ||
      !!initialValues.rules ||
      initialValues.dailySubmissionLimit != null ||
      (initialValues.paymentMethods && initialValues.paymentMethods.length > 0) ||
      !!initialValues.reviewChannelId ||
      !!initialValues.alertsChannelId ||
      !!initialValues.announcementChannelId
    )
  }, [initialValues])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      // Client-side validation
      if (!name.trim()) {
        setError('Campaign name is required')
        return
      }
      if (!brandId) {
        setError('Please select a brand')
        return
      }

      const igCents = dollarsToCents(instagramRate)
      const tkCents = dollarsToCents(tiktokRate)
      const ytCents = dollarsToCents(youtubeRate)

      if (igCents === 0 && tkCents === 0 && ytCents === 0) {
        setError('At least one platform rate must be non-zero')
        return
      }

      // Build payment methods array
      const parsedPaymentMethods = paymentMethods
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean)

      if (mode === 'create') {
        const input = {
          name: name.trim(),
          brandId,
          budgetCents: dollarsToCents(budget),
          perUserCapCents: dollarsToCents(perUserCap),
          closeThreshold: closeThreshold ? parseInt(closeThreshold, 10) : 90,
          ...(igCents > 0 ? { instagramRateCents: igCents } : {}),
          ...(tkCents > 0 ? { tiktokRateCents: tkCents } : {}),
          ...(ytCents > 0 ? { youtubeRateCents: ytCents } : {}),
          ...(rules.trim() ? { rules: rules.trim() } : {}),
          ...(dailySubmissionLimit
            ? { dailySubmissionLimit: parseInt(dailySubmissionLimit, 10) }
            : {}),
          ...(parsedPaymentMethods.length > 0 ? { paymentMethods: parsedPaymentMethods } : {}),
          ...(reviewChannelId.trim() ? { reviewChannelId: reviewChannelId.trim() } : {}),
          ...(alertsChannelId.trim() ? { alertsChannelId: alertsChannelId.trim() } : {}),
          ...(announcementChannelId.trim()
            ? { announcementChannelId: announcementChannelId.trim() }
            : {}),
        }

        const result = createCampaignSchema.safeParse(input)
        if (!result.success) {
          setError(result.error.issues[0]?.message ?? 'Validation failed')
          return
        }

        onSubmit(result.data)
      } else {
        // Edit mode: diff current vs initial, only include changed fields
        const changes: Record<string, unknown> = {}

        if (name.trim() !== (initialValues?.name ?? '')) changes.name = name.trim()
        if (brandId !== (initialValues?.brandId ?? '')) changes.brandId = brandId
        if (dollarsToCents(budget) !== (initialValues?.budgetCents ?? 0))
          changes.budgetCents = dollarsToCents(budget)
        if (dollarsToCents(perUserCap) !== (initialValues?.perUserCapCents ?? 0))
          changes.perUserCapCents = dollarsToCents(perUserCap)
        if (igCents !== (initialValues?.instagramRateCents ?? 0))
          changes.instagramRateCents = igCents
        if (tkCents !== (initialValues?.tiktokRateCents ?? 0)) changes.tiktokRateCents = tkCents
        if (ytCents !== (initialValues?.youtubeRateCents ?? 0)) changes.youtubeRateCents = ytCents

        const ct = parseInt(closeThreshold, 10)
        if (ct !== (initialValues?.closeThreshold ?? 90)) changes.closeThreshold = ct
        if (rules.trim() !== (initialValues?.rules ?? '')) changes.rules = rules.trim()

        const dsl = dailySubmissionLimit ? parseInt(dailySubmissionLimit, 10) : undefined
        if (dsl !== (initialValues?.dailySubmissionLimit ?? undefined))
          changes.dailySubmissionLimit = dsl

        const currentPm = parsedPaymentMethods
        const initialPm = initialValues?.paymentMethods ?? []
        if (JSON.stringify(currentPm) !== JSON.stringify(initialPm))
          changes.paymentMethods = currentPm

        if (reviewChannelId.trim() !== (initialValues?.reviewChannelId ?? ''))
          changes.reviewChannelId = reviewChannelId.trim()
        if (alertsChannelId.trim() !== (initialValues?.alertsChannelId ?? ''))
          changes.alertsChannelId = alertsChannelId.trim()
        if (announcementChannelId.trim() !== (initialValues?.announcementChannelId ?? ''))
          changes.announcementChannelId = announcementChannelId.trim()

        // Always include version for optimistic lock
        changes.version = initialValues?.version ?? 0

        onSubmit(changes as UpdateCampaignInput)
      }
    },
    [
      mode,
      name,
      brandId,
      budget,
      perUserCap,
      instagramRate,
      tiktokRate,
      youtubeRate,
      closeThreshold,
      rules,
      dailySubmissionLimit,
      paymentMethods,
      reviewChannelId,
      alertsChannelId,
      announcementChannelId,
      initialValues,
      onSubmit,
    ]
  )

  const inputClass = cn(
    'w-full px-3 py-2 rounded-md',
    'bg-background border border-border',
    'text-white placeholder-gray-500',
    'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label htmlFor="campaign-name" className="block text-sm font-medium text-gray-300 mb-1">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          id="campaign-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          placeholder="Campaign name"
          className={inputClass}
        />
      </div>

      {/* Brand */}
      <div>
        <label htmlFor="campaign-brand" className="block text-sm font-medium text-gray-300 mb-1">
          Brand <span className="text-red-400">*</span>
        </label>
        <select
          id="campaign-brand"
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          disabled={isPending || brandsLoading}
          className={inputClass}
        >
          <option value="">
            {brandsLoading ? 'Loading brands...' : 'Select a brand'}
          </option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      {/* Budget */}
      <div>
        <label htmlFor="campaign-budget" className="block text-sm font-medium text-gray-300 mb-1">
          Budget
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            type="number"
            id="campaign-budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            disabled={isPending}
            placeholder="0.00"
            min="0"
            step="0.01"
            className={cn(inputClass, 'pl-7')}
          />
        </div>
      </div>

      {/* Per-user Cap */}
      <div>
        <label htmlFor="campaign-cap" className="block text-sm font-medium text-gray-300 mb-1">
          Per-user Cap
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            type="number"
            id="campaign-cap"
            value={perUserCap}
            onChange={(e) => setPerUserCap(e.target.value)}
            disabled={isPending}
            placeholder="0.00"
            min="0"
            step="0.01"
            className={cn(inputClass, 'pl-7')}
          />
        </div>
      </div>

      {/* Platform Rates */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-300">
          Platform Rates <span className="text-red-400">*</span>
        </legend>
        <p className="text-xs text-gray-500">At least one platform rate is required.</p>

        {[
          { platform: 'instagram' as const, label: 'Instagram', value: instagramRate, setter: setInstagramRate },
          { platform: 'tiktok' as const, label: 'TikTok', value: tiktokRate, setter: setTiktokRate },
          { platform: 'youtube' as const, label: 'YouTube', value: youtubeRate, setter: setYoutubeRate },
        ].map(({ platform, label, value, setter }) => (
          <div key={platform} className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-28 shrink-0">
              <PlatformIcon platform={platform} size="w-4 h-4" />
              <span className="text-sm text-gray-300">{label}</span>
            </div>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                $
              </span>
              <input
                type="number"
                value={value}
                onChange={(e) => setter(e.target.value)}
                disabled={isPending}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={cn(inputClass, 'pl-7')}
              />
            </div>
          </div>
        ))}
      </fieldset>

      {/* Advanced Settings */}
      <Disclosure defaultOpen={mode === 'edit' && hasAdvancedValues}>
        {({ open }) => (
          <div className="border border-border rounded-md">
            <DisclosureButton className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Advanced Settings
              <ChevronDown
                size={16}
                className={cn('transition-transform duration-200', open && 'rotate-180')}
              />
            </DisclosureButton>

            <DisclosurePanel className="px-4 pb-4 space-y-4">
              {/* Close Threshold */}
              <div>
                <label
                  htmlFor="campaign-threshold"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Close Threshold (%)
                </label>
                <input
                  type="number"
                  id="campaign-threshold"
                  value={closeThreshold}
                  onChange={(e) => setCloseThreshold(e.target.value)}
                  disabled={isPending}
                  placeholder="90"
                  min="0"
                  max="100"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Percentage of budget spent before submissions close automatically.
                </p>
              </div>

              {/* Rules */}
              <div>
                <label
                  htmlFor="campaign-rules"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Rules
                </label>
                <textarea
                  id="campaign-rules"
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  disabled={isPending}
                  placeholder="Campaign rules and guidelines..."
                  rows={3}
                  className={inputClass}
                />
              </div>

              {/* Daily Submission Limit */}
              <div>
                <label
                  htmlFor="campaign-daily-limit"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Daily Submission Limit
                </label>
                <input
                  type="number"
                  id="campaign-daily-limit"
                  value={dailySubmissionLimit}
                  onChange={(e) => setDailySubmissionLimit(e.target.value)}
                  disabled={isPending}
                  placeholder="No limit"
                  min="1"
                  className={inputClass}
                />
              </div>

              {/* Payment Methods */}
              <div>
                <label
                  htmlFor="campaign-payment"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Payment Methods
                </label>
                <input
                  type="text"
                  id="campaign-payment"
                  value={paymentMethods}
                  onChange={(e) => setPaymentMethods(e.target.value)}
                  disabled={isPending}
                  placeholder="PayPal, Venmo, Zelle"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-500">Comma-separated list of payment methods.</p>
              </div>

              {/* Channel IDs */}
              <div>
                <label
                  htmlFor="campaign-review-channel"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Review Channel ID
                </label>
                <input
                  type="text"
                  id="campaign-review-channel"
                  value={reviewChannelId}
                  onChange={(e) => setReviewChannelId(e.target.value)}
                  disabled={isPending}
                  placeholder="Discord channel ID"
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="campaign-alerts-channel"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Alerts Channel ID
                </label>
                <input
                  type="text"
                  id="campaign-alerts-channel"
                  value={alertsChannelId}
                  onChange={(e) => setAlertsChannelId(e.target.value)}
                  disabled={isPending}
                  placeholder="Discord channel ID"
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="campaign-announcement-channel"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Announcement Channel ID
                </label>
                <input
                  type="text"
                  id="campaign-announcement-channel"
                  value={announcementChannelId}
                  onChange={(e) => setAnnouncementChannelId(e.target.value)}
                  disabled={isPending}
                  placeholder="Discord channel ID"
                  className={inputClass}
                />
              </div>
            </DisclosurePanel>
          </div>
        )}
      </Disclosure>

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
          onClick={onCancel}
          disabled={isPending}
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
          disabled={isPending}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
            'bg-accent-purple hover:bg-accent-purple/90 text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isPending
            ? mode === 'create'
              ? 'Creating...'
              : 'Saving...'
            : mode === 'create'
              ? 'Create Campaign'
              : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
