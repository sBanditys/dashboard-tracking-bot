'use client'

import { useState } from 'react'
import { Trash2, RefreshCw, ChevronDown, ChevronUp, CheckCircle, Clock, XCircle } from 'lucide-react'
import {
  useEmailConfig,
  useUpdateEmailConfig,
  useAddRecipient,
  useRemoveRecipient,
  useResendVerification,
} from '@/hooks/use-email-alerts'
import { cn } from '@/lib/utils'
import type { EmailRecipient } from '@/types/alert'

interface EmailConfigSectionProps {
  guildId: string
}

function VerificationBadge({ recipient }: { recipient: EmailRecipient }) {
  if (recipient.verified) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-400">
        <CheckCircle className="w-3.5 h-3.5" />
        Verified
      </span>
    )
  }
  if (recipient.verificationExpired) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-400">
        <XCircle className="w-3.5 h-3.5" />
        Expired
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-yellow-400">
      <Clock className="w-3.5 h-3.5" />
      Pending
    </span>
  )
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function EmailConfigSection({ guildId }: EmailConfigSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useEmailConfig(guildId)
  const updateConfigMutation = useUpdateEmailConfig(guildId)
  const addRecipientMutation = useAddRecipient(guildId)
  const removeRecipientMutation = useRemoveRecipient(guildId)
  const resendVerificationMutation = useResendVerification(guildId)

  const config = data?.config
  const recipients = data?.recipients ?? []
  const maxRecipients = data?.maxRecipients ?? 5

  const isAtMaxRecipients = recipients.length >= maxRecipients

  const handleDeliveryModeChange = (mode: 'immediate' | 'digest') => {
    if (!config) return
    updateConfigMutation.mutate({
      deliveryMode: mode,
      digestHour: mode === 'digest' ? (config.digestHour ?? 9) : null,
    })
  }

  const handleDigestHourChange = (hour: number) => {
    updateConfigMutation.mutate({
      deliveryMode: 'digest',
      digestHour: hour,
    })
  }

  const handleAddRecipient = () => {
    const trimmed = newEmail.trim()
    if (!trimmed) {
      setEmailError('Please enter an email address')
      return
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError('Please enter a valid email address')
      return
    }
    setEmailError(null)
    addRecipientMutation.mutate(
      { email: trimmed },
      { onSuccess: () => setNewEmail('') }
    )
  }

  const handleRemoveRecipient = async (recipientId: string) => {
    if (!confirm('Remove this email recipient?')) return
    setRemovingId(recipientId)
    try {
      await removeRecipientMutation.mutateAsync(recipientId)
    } finally {
      setRemovingId(null)
    }
  }

  const handleResendVerification = (recipientId: string) => {
    resendVerificationMutation.mutate(recipientId)
  }

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-hover transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Email Notifications</span>
          {config && (
            <span className="text-xs text-gray-500">
              &middot; {config.deliveryMode === 'immediate' ? 'Immediate' : 'Daily Digest'}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Collapsible body */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-6 border-t border-border">
          {isLoading && (
            <p className="text-sm text-gray-400 pt-4">Loading email settings...</p>
          )}

          {isError && (
            <div className="pt-4 space-y-2">
              <p className="text-sm text-red-400">Failed to load email settings</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-surface border border-border text-gray-300 hover:bg-surface-hover transition-colors"
              >
                <RefreshCw size={12} />
                Try again
              </button>
            </div>
          )}

          {config && (
            <>
              {/* Delivery mode toggle */}
              <div className="pt-4 space-y-3">
                <label className="text-sm font-medium text-gray-300">Delivery Mode</label>
                <div className="flex rounded-lg border border-border overflow-hidden w-fit">
                  <button
                    type="button"
                    onClick={() => handleDeliveryModeChange('immediate')}
                    disabled={updateConfigMutation.isPending}
                    className={cn(
                      'px-4 py-2 text-sm font-medium transition-colors',
                      config.deliveryMode === 'immediate'
                        ? 'bg-accent-purple text-white'
                        : 'bg-surface text-gray-400 hover:text-white hover:bg-surface-hover',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    Immediate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeliveryModeChange('digest')}
                    disabled={updateConfigMutation.isPending}
                    className={cn(
                      'px-4 py-2 text-sm font-medium transition-colors border-l border-border',
                      config.deliveryMode === 'digest'
                        ? 'bg-accent-purple text-white'
                        : 'bg-surface text-gray-400 hover:text-white hover:bg-surface-hover',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    Daily Digest
                  </button>
                </div>

                {/* Digest time picker */}
                {config.deliveryMode === 'digest' && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-400">Send digest at:</label>
                    <select
                      value={config.digestHour ?? 9}
                      onChange={(e) => handleDigestHourChange(Number(e.target.value))}
                      disabled={updateConfigMutation.isPending}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-sm',
                        'bg-background border border-border text-white',
                        'focus:outline-none focus:ring-2 focus:ring-accent-purple/50',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {String(i).padStart(2, '0')}:00 UTC
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Rate limit info */}
                <p className="text-xs text-gray-500">
                  Max {config.rateLimit} emails/hour per recipient
                </p>
              </div>

              {/* Recipients list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Recipients</label>
                  <span className="text-xs text-gray-500">
                    {recipients.length} of {maxRecipients} recipients
                  </span>
                </div>

                {recipients.length === 0 && (
                  <p className="text-sm text-gray-500">No recipients configured yet.</p>
                )}

                <ul className="space-y-2">
                  {recipients.map((recipient) => (
                    <li
                      key={recipient.id}
                      className="flex items-center justify-between gap-3 bg-background rounded-lg px-4 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm text-gray-300 font-mono truncate">
                          {recipient.email}
                        </span>
                        <VerificationBadge recipient={recipient} />
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Resend verification */}
                        {!recipient.verified && (
                          <button
                            type="button"
                            onClick={() => handleResendVerification(recipient.id)}
                            disabled={resendVerificationMutation.isPending}
                            title="Resend verification email"
                            aria-label={`Resend verification email to ${recipient.email}`}
                            className={cn(
                              'p-1.5 text-gray-400 hover:text-blue-400 transition-colors rounded',
                              'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
                              'disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipient(recipient.id)}
                          disabled={removingId === recipient.id || removeRecipientMutation.isPending}
                          title="Remove recipient"
                          aria-label={`Remove ${recipient.email} from recipients`}
                          className={cn(
                            'p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded',
                            'focus:outline-none focus:ring-2 focus:ring-red-500/50',
                            'disabled:opacity-50 disabled:cursor-not-allowed'
                          )}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Add recipient form */}
                <div className="space-y-2">
                  {isAtMaxRecipients ? (
                    <p className="text-sm text-gray-500">
                      Maximum recipients reached ({maxRecipients}/{maxRecipients}).
                    </p>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => {
                            setNewEmail(e.target.value)
                            if (emailError) setEmailError(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddRecipient()
                          }}
                          placeholder="name@example.com"
                          disabled={addRecipientMutation.isPending}
                          className={cn(
                            'flex-1 px-3 py-2 rounded-md text-sm',
                            'bg-background border text-white',
                            emailError ? 'border-red-500' : 'border-border',
                            'placeholder:text-gray-500',
                            'focus:outline-none focus:ring-2 focus:ring-accent-purple/50',
                            'disabled:opacity-50 disabled:cursor-not-allowed'
                          )}
                        />
                        <button
                          type="button"
                          onClick={handleAddRecipient}
                          disabled={addRecipientMutation.isPending || isAtMaxRecipients}
                          className={cn(
                            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                            'bg-accent-purple text-white hover:bg-accent-purple/90',
                            'focus:outline-none focus:ring-2 focus:ring-accent-purple/50',
                            'disabled:opacity-50 disabled:cursor-not-allowed'
                          )}
                        >
                          {addRecipientMutation.isPending ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                      {emailError && (
                        <p className="text-xs text-red-400">{emailError}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
