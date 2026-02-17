'use client'

import { useState } from 'react'
import { useUpdateAlertSettings } from '@/hooks/use-alerts'
import { cn } from '@/lib/utils'
import type { AlertSettings } from '@/types/alert'

interface AlertSettingsPanelProps {
  guildId: string
  groupId: string
  settings: AlertSettings | null
}

interface ToggleSwitchProps {
  checked: boolean
  onChange: () => void
  disabled: boolean
  label: string
  description: string
}

function ToggleSwitch({ checked, onChange, disabled, label, description }: ToggleSwitchProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-accent-purple/50',
          checked ? 'bg-accent-purple' : 'bg-gray-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {disabled ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-3 h-3 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </span>
        ) : (
          <span
            className={cn(
              'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
              checked ? 'translate-x-5' : 'translate-x-1'
            )}
          />
        )}
      </button>
      <div>
        <p className="text-sm font-medium text-gray-200">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
  )
}

export function AlertSettingsPanel({ guildId, groupId, settings }: AlertSettingsPanelProps) {
  const updateMutation = useUpdateAlertSettings(guildId)
  const [pendingField, setPendingField] = useState<string | null>(null)

  // Current values (or defaults if no settings exist yet)
  const streakAlerts = settings?.streakAlerts ?? false
  const thresholdAlerts = settings?.thresholdAlerts ?? false
  const statusAlerts = settings?.statusAlerts ?? false

  const handleToggle = async (
    field: 'streakAlerts' | 'thresholdAlerts' | 'statusAlerts',
    currentValue: boolean
  ) => {
    setPendingField(field)
    try {
      await updateMutation.mutateAsync({
        groupId,
        data: { [field]: !currentValue },
      })
    } finally {
      setPendingField(null)
    }
  }

  const isLoading = updateMutation.isPending

  return (
    <div className="bg-surface/50 border border-border rounded-lg p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
        Group Alert Settings
      </p>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
        <ToggleSwitch
          checked={streakAlerts}
          onChange={() => handleToggle('streakAlerts', streakAlerts)}
          disabled={isLoading && pendingField === 'streakAlerts'}
          label="Streak Alerts"
          description="Alerts for tracking streaks"
        />
        <ToggleSwitch
          checked={thresholdAlerts}
          onChange={() => handleToggle('thresholdAlerts', thresholdAlerts)}
          disabled={isLoading && pendingField === 'thresholdAlerts'}
          label="Threshold Alerts"
          description="Alerts when metrics exceed targets"
        />
        <ToggleSwitch
          checked={statusAlerts}
          onChange={() => handleToggle('statusAlerts', statusAlerts)}
          disabled={isLoading && pendingField === 'statusAlerts'}
          label="Status Alerts"
          description="Alerts for account status changes"
        />
      </div>
    </div>
  )
}
