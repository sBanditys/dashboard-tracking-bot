'use client'

import { useState, useRef } from 'react'
import { Info, ChevronUp, ChevronDown } from 'lucide-react'
import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react'
import { cn } from '@/lib/utils'
import { centsToDisplay, useUpdatePayment, useBulkUpdatePayments, useUpdatePaymentNotes } from '@/hooks/use-bonus'
import type { BonusPayment } from '@/types/bonus'

interface PaymentsTabProps {
  roundId: string
  guildId: string
  payments: BonusPayment[]
  evaluated: boolean
  isAdmin: boolean
}

type SortField = 'group' | 'paid' | 'amount'
type SortDir = 'asc' | 'desc'

interface BulkConfirmState {
  open: boolean
  targetPaid: boolean | null
}

const MAX_NOTES_LENGTH = 500

/**
 * Individual toggle switch for payment paid status.
 */
function PaymentToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
        checked ? 'bg-green-500' : 'bg-gray-600',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  )
}

/**
 * Notes field with character counter and auto-save on blur.
 */
function NotesField({
  payment,
  roundId,
  guildId,
  isAdmin,
}: {
  payment: BonusPayment
  roundId: string
  guildId: string
  isAdmin: boolean
}) {
  const [value, setValue] = useState(payment.notes ?? '')
  const originalRef = useRef(payment.notes ?? '')
  const updateNotes = useUpdatePaymentNotes(guildId)

  function handleBlur() {
    if (value !== originalRef.current) {
      updateNotes.mutate({
        roundId,
        paymentId: payment.id,
        paid: payment.paid,
        notes: value,
      })
      originalRef.current = value
    }
  }

  return (
    <div className="mt-1.5">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_NOTES_LENGTH))}
          onBlur={handleBlur}
          readOnly={!isAdmin}
          placeholder={isAdmin ? 'Add notes...' : 'No notes'}
          rows={1}
          className={cn(
            'w-full resize-none rounded-md px-2 py-1 text-xs text-gray-300 bg-surface-hover border border-border',
            'placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-accent-purple/50',
            !isAdmin && 'cursor-default opacity-70'
          )}
        />
      </div>
      {isAdmin && (
        <div className="text-right text-xs text-gray-500 mt-0.5">
          {value.length}/{MAX_NOTES_LENGTH}
        </div>
      )}
    </div>
  )
}

/**
 * Bulk action confirmation dialog.
 */
function BulkConfirmModal({
  open,
  onClose,
  onConfirm,
  targetPaid,
  affectedCount,
  totalCents,
  isLoading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  targetPaid: boolean
  affectedCount: number
  totalCents: number
  isLoading: boolean
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-w-md w-full bg-surface border border-border rounded-lg p-6 space-y-4">
          <DialogTitle className="text-lg font-semibold text-white">
            {targetPaid ? 'Mark All Paid' : 'Mark All Unpaid'}
          </DialogTitle>
          <Description className="text-gray-300 text-sm">
            This will mark{' '}
            <span className="text-white font-medium">{affectedCount} payment{affectedCount !== 1 ? 's' : ''}</span>{' '}
            totalling{' '}
            <span className="text-white font-medium">{centsToDisplay(totalCents)}</span>{' '}
            as <span className="text-white font-medium">{targetPaid ? 'paid' : 'unpaid'}</span>.
            Are you sure?
          </Description>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium rounded-md text-gray-300 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors text-white',
                targetPaid
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoading
                ? 'Updating...'
                : targetPaid
                ? 'Mark All Paid'
                : 'Mark All Unpaid'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

/**
 * Payments tab — shows payment progress bar, bulk actions, and per-payment toggles.
 * Admin: can toggle, bulk-update, and edit notes.
 * Non-admin: read-only view.
 */
export function PaymentsTab({ roundId, guildId, payments, evaluated, isAdmin }: PaymentsTabProps) {
  const [sortField, setSortField] = useState<SortField>('group')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [bulkConfirm, setBulkConfirm] = useState<BulkConfirmState>({ open: false, targetPaid: null })

  const updatePayment = useUpdatePayment(guildId)
  const bulkUpdate = useBulkUpdatePayments(guildId)

  if (!evaluated) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-hover/30 border border-border text-gray-400">
        <Info className="h-5 w-5 mt-0.5 flex-shrink-0 text-gray-500" />
        <p className="text-sm">
          Payments will be available after this round is evaluated.
        </p>
      </div>
    )
  }

  // Running total
  const paidCents = payments.reduce((sum, p) => sum + (p.paid ? p.amount_cents : 0), 0)
  const totalCents = payments.reduce((sum, p) => sum + p.amount_cents, 0)
  const paidPercent = totalCents > 0 ? (paidCents / totalCents) * 100 : 0

  // Bulk action state
  const anyUnpaid = payments.some((p) => !p.paid)
  const anyPaid = payments.some((p) => p.paid)

  // Affected counts for confirmation dialog
  const bulkAffectedPayments =
    bulkConfirm.targetPaid !== null
      ? payments.filter((p) => p.paid !== bulkConfirm.targetPaid)
      : []
  const bulkAffectedCents = bulkAffectedPayments.reduce(
    (sum, p) => sum + p.amount_cents,
    0
  )

  // Sorting
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = [...payments].sort((a, b) => {
    let cmp = 0
    if (sortField === 'group') {
      cmp = a.account_group_label.localeCompare(b.account_group_label)
    } else if (sortField === 'paid') {
      cmp = (a.paid ? 1 : 0) - (b.paid ? 1 : 0)
    } else if (sortField === 'amount') {
      cmp = a.amount_cents - b.amount_cents
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return null
    return sortDir === 'asc' ? (
      <ChevronUp className="h-3 w-3 inline ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 inline ml-1" />
    )
  }

  function handleToggle(payment: BonusPayment) {
    updatePayment.mutate({
      roundId,
      paymentId: payment.id,
      paid: !payment.paid,
    })
  }

  function handleBulkConfirm() {
    if (bulkConfirm.targetPaid === null) return
    bulkUpdate.mutate(
      { roundId, paid: bulkConfirm.targetPaid },
      {
        onSettled: () => setBulkConfirm({ open: false, targetPaid: null }),
      }
    )
  }

  return (
    <div className="space-y-4">
      {/* Running total progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-gray-400">
          <span className="font-medium text-gray-200">{centsToDisplay(paidCents)} paid</span>
          <span>of {centsToDisplay(totalCents)} total</span>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-hover overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${paidPercent}%` }}
          />
        </div>
      </div>

      {/* Bulk action buttons — admin only */}
      {isAdmin && (
        <div className="flex gap-2">
          {anyUnpaid && (
            <button
              type="button"
              onClick={() => setBulkConfirm({ open: true, targetPaid: true })}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-900/40 text-green-400 hover:bg-green-900/60 transition-colors"
            >
              Mark All Paid
            </button>
          )}
          {anyPaid && (
            <button
              type="button"
              onClick={() => setBulkConfirm({ open: true, targetPaid: false })}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-900/40 text-red-400 hover:bg-red-900/60 transition-colors"
            >
              Mark All Unpaid
            </button>
          )}
        </div>
      )}

      {/* Payment list */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-gray-400 text-xs uppercase tracking-wider">
              <th
                className="text-left py-2 pr-4 font-medium cursor-pointer hover:text-gray-200 select-none"
                onClick={() => handleSort('group')}
              >
                Group
                <SortIcon field="group" />
              </th>
              <th
                className="text-right py-2 px-4 font-medium cursor-pointer hover:text-gray-200 select-none"
                onClick={() => handleSort('amount')}
              >
                Amount
                <SortIcon field="amount" />
              </th>
              <th
                className="text-center py-2 px-4 font-medium cursor-pointer hover:text-gray-200 select-none"
                onClick={() => handleSort('paid')}
              >
                Paid
                <SortIcon field="paid" />
              </th>
              <th className="text-left py-2 pl-4 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {sorted.map((payment) => (
              <tr key={payment.id} className="align-top">
                <td className="py-3 pr-4">
                  <div className="text-white font-medium">{payment.account_group_label}</div>
                  {/* Notes field below group name */}
                  <NotesField
                    payment={payment}
                    roundId={roundId}
                    guildId={guildId}
                    isAdmin={isAdmin}
                  />
                </td>
                <td className="py-3 px-4 text-right text-gray-300 tabular-nums font-medium">
                  {centsToDisplay(payment.amount_cents)}
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex justify-center">
                    <PaymentToggle
                      checked={payment.paid}
                      disabled={!isAdmin || updatePayment.isPending}
                      onChange={() => handleToggle(payment)}
                    />
                  </div>
                </td>
                <td className="py-3 pl-4">
                  {payment.paid && payment.paid_at ? (
                    <div className="text-xs text-gray-400 space-y-0.5">
                      {payment.paid_by && (
                        <div className="text-gray-300">{payment.paid_by}</div>
                      )}
                      <div>{new Date(payment.paid_at).toLocaleDateString()}</div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">Unpaid</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk confirm modal */}
      {bulkConfirm.targetPaid !== null && (
        <BulkConfirmModal
          open={bulkConfirm.open}
          onClose={() => setBulkConfirm({ open: false, targetPaid: null })}
          onConfirm={handleBulkConfirm}
          targetPaid={bulkConfirm.targetPaid}
          affectedCount={bulkAffectedPayments.length}
          totalCents={bulkAffectedCents}
          isLoading={bulkUpdate.isPending}
        />
      )}
    </div>
  )
}
