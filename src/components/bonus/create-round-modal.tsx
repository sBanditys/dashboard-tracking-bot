'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { CheckIcon, ChevronRightIcon, ChevronLeftIcon, AlertTriangleIcon, Loader2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WeekPicker } from '@/components/bonus/week-picker'
import { useBrands } from '@/hooks/use-tracking'
import { useCreateBonusRound, centsToDisplay } from '@/hooks/use-bonus'
import type { AccountGroup } from '@/types/tracking'

interface CreateRoundModalProps {
  open: boolean
  onClose: () => void
  guildId: string
  existingWeekStarts: string[]
}

type Step = 1 | 2 | 3 | 4

const STEPS = [
  { id: 1, label: 'Week' },
  { id: 2, label: 'Groups' },
  { id: 3, label: 'Targets' },
  { id: 4, label: 'Review' },
] as const

/**
 * Multi-step bonus round creation modal.
 *
 * Step 1: Week selection (with retroactive detection)
 * Step 2: Account group selection (full checklist with Select All)
 * Step 3: Bonus amount + target views (bulk default + per-group override)
 * Step 4: Review summary + confirm (retroactive gets extra confirmation)
 */
export function CreateRoundModal({
  open,
  onClose,
  guildId,
  existingWeekStarts,
}: CreateRoundModalProps) {
  // ─── Step management ───────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(1)

  // ─── Step 1: Week selection ─────────────────────────────────────────────────
  const [selectedWeek, setSelectedWeek] = useState<DateRange | undefined>()
  const [isRetroactive, setIsRetroactive] = useState(false)

  // ─── Step 2: Group selection ────────────────────────────────────────────────
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set())

  // ─── Step 3: Targets & amount ──────────────────────────────────────────────
  const [bonusAmount, setBonusAmount] = useState('')
  const [defaultTargetViews, setDefaultTargetViews] = useState('')
  const [groupTargets, setGroupTargets] = useState<Record<string, string>>({})
  const [overriddenGroups, setOverriddenGroups] = useState<Set<string>>(new Set())

  // ─── Data fetching ──────────────────────────────────────────────────────────
  const { data: brandsData, isLoading: isLoadingBrands } = useBrands(guildId)

  // Flatten all groups across all brands, keyed by brand label for display
  const allGroups: (AccountGroup & { brand_label: string })[] = (
    brandsData?.brands ?? []
  ).flatMap((brand) =>
    brand.groups.map((group) => ({ ...group, brand_label: brand.label }))
  )

  const selectedGroups = allGroups.filter((g) => selectedGroupIds.has(g.id))

  // ─── Mutation ───────────────────────────────────────────────────────────────
  const createMutation = useCreateBonusRound(guildId)

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const formatWeekRange = (week: DateRange): string => {
    if (!week.from || !week.to) return ''
    return `${format(week.from, 'MMM d')} - ${format(week.to, 'MMM d, yyyy')}`
  }

  const resetForm = useCallback(() => {
    setStep(1)
    setSelectedWeek(undefined)
    setIsRetroactive(false)
    setSelectedGroupIds(new Set())
    setBonusAmount('')
    setDefaultTargetViews('')
    setGroupTargets({})
    setOverriddenGroups(new Set())
  }, [])

  const handleClose = () => {
    resetForm()
    onClose()
  }

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open, resetForm])

  // ─── Step 1 handlers ────────────────────────────────────────────────────────
  const handleWeekSelect = (week: DateRange) => {
    setSelectedWeek(week)
  }

  const handleRetroactiveDetected = (retroactive: boolean) => {
    setIsRetroactive(retroactive)
  }

  // ─── Step 2 handlers ────────────────────────────────────────────────────────
  const isAllSelected = allGroups.length > 0 && allGroups.every((g) => selectedGroupIds.has(g.id))

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedGroupIds(new Set())
    } else {
      setSelectedGroupIds(new Set(allGroups.map((g) => g.id)))
    }
  }

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  // ─── Step 3 handlers ────────────────────────────────────────────────────────
  const handleDefaultTargetChange = (value: string) => {
    setDefaultTargetViews(value)
    // Update all non-overridden group targets
    setGroupTargets((prev) => {
      const next = { ...prev }
      selectedGroupIds.forEach((id) => {
        if (!overriddenGroups.has(id)) {
          next[id] = value
        }
      })
      return next
    })
  }

  const handleGroupTargetChange = (groupId: string, value: string) => {
    setGroupTargets((prev) => ({ ...prev, [groupId]: value }))
    setOverriddenGroups((prev) => {
      const next = new Set(prev)
      next.add(groupId)
      return next
    })
  }

  const handleResetGroupTarget = (groupId: string) => {
    setGroupTargets((prev) => ({ ...prev, [groupId]: defaultTargetViews }))
    setOverriddenGroups((prev) => {
      const next = new Set(prev)
      next.delete(groupId)
      return next
    })
  }

  // Initialize group targets when entering step 3
  const handleToStep3 = () => {
    setGroupTargets((prev) => {
      const next = { ...prev }
      selectedGroupIds.forEach((id) => {
        if (!(id in next)) {
          next[id] = defaultTargetViews
        }
      })
      return next
    })
    setStep(3)
  }

  // ─── Validation ─────────────────────────────────────────────────────────────
  const amountValue = parseFloat(bonusAmount)
  const isAmountValid = !isNaN(amountValue) && amountValue > 0

  const areAllTargetsValid = selectedGroups.every((g) => {
    const val = parseInt(groupTargets[g.id] ?? '0', 10)
    return !isNaN(val) && val > 0
  })

  const isStep3Valid = isAmountValid && areAllTargetsValid

  // ─── Step 4: Submit ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (isRetroactive) {
      const confirmed = window.confirm(
        'This week has ended. The round will be evaluated immediately. Continue?'
      )
      if (!confirmed) return
    }

    if (!selectedWeek?.from) return

    const amountCents = Math.round(amountValue * 100)
    const targets = selectedGroups.map((g) => ({
      account_group_id: g.id,
      target_views: parseInt(groupTargets[g.id] ?? '0', 10),
    }))

    try {
      await createMutation.mutateAsync({
        week_start: selectedWeek.from.toISOString(),
        bonus_amount_cents: amountCents,
        targets,
      })
      resetForm()
      onClose()
    } catch {
      // Error handled by mutation (toast)
    }
  }

  // ─── Step progress indicator ────────────────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1">
          <div
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors',
              step === s.id
                ? 'bg-accent-purple text-white'
                : step > s.id
                ? 'bg-accent-purple/30 text-accent-purple'
                : 'bg-background border border-border text-gray-500'
            )}
          >
            {step > s.id ? (
              <CheckIcon className="w-3.5 h-3.5" />
            ) : (
              s.id
            )}
          </div>
          <span
            className={cn(
              'text-xs font-medium hidden sm:inline',
              step === s.id ? 'text-white' : step > s.id ? 'text-gray-400' : 'text-gray-600'
            )}
          >
            {s.label}
          </span>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                'flex-1 h-px mx-1 w-8',
                step > s.id ? 'bg-accent-purple/40' : 'bg-border'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />

      {/* Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <DialogPanel className="max-w-2xl w-full bg-surface border border-border rounded-lg p-6 space-y-5 my-auto">
          <DialogTitle className="text-lg font-semibold text-white">
            Create Bonus Round
          </DialogTitle>

          <StepIndicator />

          {/* ── Step 1: Week Selection ──────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select a Week
                </label>
                <WeekPicker
                  selectedWeek={selectedWeek}
                  onSelect={handleWeekSelect}
                  existingWeekStarts={existingWeekStarts}
                  onRetroactiveDetected={handleRetroactiveDetected}
                />
              </div>

              {selectedWeek && (
                <div
                  className={cn(
                    'p-3 rounded-lg border text-sm',
                    isRetroactive
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-accent-purple/10 border-accent-purple/30 text-gray-300'
                  )}
                >
                  {isRetroactive ? (
                    <div className="flex items-start gap-2">
                      <AlertTriangleIcon className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                      <div>
                        <p className="font-medium text-amber-300">Past Week Selected</p>
                        <p className="text-amber-400/80 mt-0.5">
                          {formatWeekRange(selectedWeek)} — This week has already ended. The round will be evaluated immediately upon creation.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p>
                      Selected week:{' '}
                      <span className="font-medium text-white">{formatWeekRange(selectedWeek)}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!selectedWeek}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                    'bg-accent-purple text-white hover:bg-accent-purple/80',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  Next
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Account Group Selection ────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Select Account Groups
                  </label>
                  {allGroups.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-xs text-accent-purple hover:text-accent-purple/80 transition-colors"
                    >
                      {isAllSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {isLoadingBrands ? (
                  <div className="flex items-center justify-center py-8 text-gray-400">
                    <Loader2Icon className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-sm">Loading groups...</span>
                  </div>
                ) : allGroups.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-500">
                    No account groups found for this guild.
                  </div>
                ) : (
                  <div className="border border-border rounded-lg divide-y divide-border max-h-72 overflow-y-auto">
                    {allGroups.map((group) => (
                      <label
                        key={group.id}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
                          'hover:bg-background',
                          selectedGroupIds.has(group.id) && 'bg-accent-purple/5'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.has(group.id)}
                          onChange={() => handleGroupToggle(group.id)}
                          className="w-4 h-4 accent-accent-purple rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-white">{group.label}</span>
                          <span className="text-xs text-gray-500 ml-2">{group.brand_label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {selectedGroupIds.size > 0 && (
                  <p className="mt-2 text-xs text-gray-400">
                    {selectedGroupIds.size} group{selectedGroupIds.size !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleToStep3}
                  disabled={selectedGroupIds.size === 0}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                    'bg-accent-purple text-white hover:bg-accent-purple/80',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  Next
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Target Views & Bonus Amount ────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Bonus Amount */}
              <div>
                <label
                  htmlFor="bonus-amount"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Bonus Amount per Group
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-background border border-r-0 border-border rounded-l-md text-gray-400 text-sm">
                    $
                  </span>
                  <input
                    id="bonus-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={bonusAmount}
                    onChange={(e) => setBonusAmount(e.target.value)}
                    placeholder="0.00"
                    className={cn(
                      'flex-1 px-3 py-2 rounded-r-md',
                      'bg-background border text-white placeholder-gray-600',
                      'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent',
                      !isAmountValid && bonusAmount !== ''
                        ? 'border-red-500'
                        : 'border-border'
                    )}
                  />
                </div>
                {!isAmountValid && bonusAmount !== '' && (
                  <p className="mt-1 text-xs text-red-400">
                    Please enter a valid positive amount (e.g. 50.00)
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Each qualifying group receives this bonus amount.
                </p>
              </div>

              {/* Default Target Views */}
              <div>
                <label
                  htmlFor="default-target-views"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Default Target Views for All Groups
                </label>
                <input
                  id="default-target-views"
                  type="number"
                  min="1"
                  step="1"
                  value={defaultTargetViews}
                  onChange={(e) => handleDefaultTargetChange(e.target.value)}
                  placeholder="e.g. 100000"
                  className={cn(
                    'w-full px-3 py-2 rounded-md',
                    'bg-background border border-border text-white placeholder-gray-600',
                    'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent'
                  )}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Set a default — you can override per group below.
                </p>
              </div>

              {/* Per-group override table */}
              {selectedGroups.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-2">
                    Per-Group Target Views
                  </p>
                  <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
                    {selectedGroups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-white truncate block">
                            {group.label}
                          </span>
                          <span className="text-xs text-gray-500">
                            {group.brand_label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {overriddenGroups.has(group.id) && (
                            <span className="text-xs px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded">
                              custom
                            </span>
                          )}
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={groupTargets[group.id] ?? ''}
                            onChange={(e) =>
                              handleGroupTargetChange(group.id, e.target.value)
                            }
                            className={cn(
                              'w-28 px-2 py-1.5 rounded-md text-sm',
                              'bg-background border text-white',
                              'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent',
                              (!groupTargets[group.id] ||
                                parseInt(groupTargets[group.id], 10) <= 0) &&
                                groupTargets[group.id] !== undefined
                                ? 'border-red-500'
                                : 'border-border'
                            )}
                            placeholder="Views"
                          />
                          {overriddenGroups.has(group.id) && (
                            <button
                              type="button"
                              onClick={() => handleResetGroupTarget(group.id)}
                              className="text-xs text-gray-500 hover:text-gray-300 transition-colors shrink-0"
                              title="Reset to default"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  disabled={!isStep3Valid}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                    'bg-accent-purple text-white hover:bg-accent-purple/80',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  Review
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Review Summary ──────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-4">
              {/* Retroactive warning banner */}
              {isRetroactive && (
                <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <AlertTriangleIcon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-300">
                      Retroactive Round
                    </p>
                    <p className="text-xs text-amber-400/80 mt-0.5">
                      This week has already ended. The round will be evaluated immediately upon creation.
                    </p>
                  </div>
                </div>
              )}

              {/* Summary details */}
              <div className="bg-background border border-border rounded-lg divide-y divide-border">
                {/* Week */}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-400">Week</span>
                  <span className="text-sm font-medium text-white">
                    {selectedWeek ? formatWeekRange(selectedWeek) : '—'}
                  </span>
                </div>

                {/* Bonus amount */}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-400">Bonus Amount</span>
                  <span className="text-sm font-medium text-white">
                    {isAmountValid
                      ? centsToDisplay(Math.round(amountValue * 100))
                      : '—'}
                    {' '}
                    <span className="text-gray-500 font-normal">per group</span>
                  </span>
                </div>

                {/* Group count */}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-400">Target Groups</span>
                  <span className="text-sm font-medium text-white">
                    {selectedGroups.length} group{selectedGroups.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Group targets list */}
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">
                  Target Views per Group
                </p>
                <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                  {selectedGroups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-white truncate block">
                          {group.label}
                        </span>
                        <span className="text-xs text-gray-500">{group.brand_label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {overriddenGroups.has(group.id) && (
                          <span className="text-xs px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded">
                            custom
                          </span>
                        )}
                        <span className="text-sm font-medium text-white">
                          {parseInt(groupTargets[group.id] ?? '0', 10).toLocaleString()} views
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-md transition-colors',
                    'bg-accent-purple text-white hover:bg-accent-purple/80',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2Icon className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      Create Round
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  )
}
