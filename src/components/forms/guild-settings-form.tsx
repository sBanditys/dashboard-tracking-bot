'use client'

import { useGuildChannels, useUpdateGuildSettings } from '@/hooks/use-guilds'
import { ChannelSelect } from '@/components/ui/channel-select'
import type { GuildSettings, GuildDetails } from '@/types/guild'
import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

interface GuildSettingsFormProps {
  guildId: string
  settings: GuildSettings
}

/**
 * Guild settings form with channel selection and auto-save.
 * Allows users to configure notification channels for logs and updates.
 */
export function GuildSettingsForm({ guildId, settings }: GuildSettingsFormProps) {
  const queryClient = useQueryClient()
  const { data: channelsData, isLoading: channelsLoading } = useGuildChannels(guildId)
  const { isRetrying, ...mutation } = useUpdateGuildSettings(guildId)

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [showStaleWarning, setShowStaleWarning] = useState(false)
  const [pendingChange, setPendingChange] = useState<{ field: keyof GuildSettings; value: string | null } | null>(null)

  // Store initial settings snapshot on mount
  const initialSettingsRef = useRef<GuildSettings>(settings)

  // Update snapshot if settings prop changes (e.g., after reload)
  useEffect(() => {
    initialSettingsRef.current = settings
    setShowStaleWarning(false)
    setPendingChange(null)
  }, [settings])

  // Auto-clear success/error status after 3 seconds
  useEffect(() => {
    if (saveStatus === 'success' || saveStatus === 'error') {
      const timer = setTimeout(() => setSaveStatus('idle'), 3000)
      return () => clearTimeout(timer)
    }
  }, [saveStatus])

  // Check if settings have changed since component mount
  const checkForStaleSettings = () => {
    const currentGuild = queryClient.getQueryData<GuildDetails>(['guild', guildId])
    if (!currentGuild) return false

    const currentSettings = currentGuild.settings
    const initialSettings = initialSettingsRef.current

    // Compare settings fields
    return (
      currentSettings.logs_channel_id !== initialSettings.logs_channel_id ||
      currentSettings.updates_channel_id !== initialSettings.updates_channel_id
    )
  }

  const handleChannelChange = (field: keyof GuildSettings, value: string | null) => {
    // Check for concurrent edits before saving
    if (checkForStaleSettings()) {
      // Settings changed by another user - show warning
      setPendingChange({ field, value })
      setShowStaleWarning(true)
      return
    }

    // No stale data - proceed with save
    executeSave(field, value)
  }

  const executeSave = (field: keyof GuildSettings, value: string | null) => {
    setSaveStatus('saving')
    setShowStaleWarning(false)
    setPendingChange(null)

    mutation.mutate(
      { [field]: value },
      {
        onSuccess: () => setSaveStatus('success'),
        onError: () => setSaveStatus('error'),
      }
    )
  }

  const handleReload = () => {
    // Invalidate query to refetch latest settings
    queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
    setShowStaleWarning(false)
    setPendingChange(null)
  }

  const handleSaveAnyway = () => {
    if (pendingChange) {
      executeSave(pendingChange.field, pendingChange.value)
    }
  }

  const channels = channelsData?.channels ?? []

  return (
    <div className="relative bg-surface border border-border rounded-lg p-6">
      {/* Blocking overlay during mutation retry — prevents edits while retrying */}
      {isRetrying && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Saving changes...</span>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Guild Settings</h2>
          <p className="text-sm text-gray-400">Configure notification channels for your guild</p>
        </div>

        {/* Status Indicator */}
        {saveStatus === 'saving' && (
          <span className="text-sm text-gray-400">Saving...</span>
        )}
        {saveStatus === 'success' && (
          <span className="text-sm text-green-400">Saved</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-sm text-red-400">Failed to save</span>
        )}
      </div>

      {/* Concurrent Edit Warning */}
      {showStaleWarning && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-400 mb-3">
            Settings were updated by another user. Reload to see changes or save to overwrite.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleReload}
              className="px-3 py-1.5 text-sm bg-surface border border-border rounded text-white hover:bg-background transition-colors"
            >
              Reload
            </button>
            <button
              onClick={handleSaveAnyway}
              className="px-3 py-1.5 text-sm bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-400 hover:bg-yellow-500/30 transition-colors"
            >
              Save Anyway
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Logs Channel */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Logs Channel
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Channel where bot activity logs will be sent
          </p>
          {channelsLoading ? (
            <div className="h-12 bg-background border border-border rounded-lg animate-pulse" />
          ) : (
            <ChannelSelect
              channels={channels}
              value={settings.logs_channel_id}
              onChange={(value) => handleChannelChange('logs_channel_id', value)}
              placeholder="Select logs channel..."
            />
          )}
        </div>

        {/* Updates Channel */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Updates Channel
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Channel where update notifications will be posted
          </p>
          {channelsLoading ? (
            <div className="h-12 bg-background border border-border rounded-lg animate-pulse" />
          ) : (
            <ChannelSelect
              channels={channels}
              value={settings.updates_channel_id}
              onChange={(value) => handleChannelChange('updates_channel_id', value)}
              placeholder="Select updates channel..."
            />
          )}
        </div>
      </div>

      {/* Error Message (if mutation error) */}
      {mutation.error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">
            {mutation.error.message}
          </p>
        </div>
      )}
    </div>
  )
}
