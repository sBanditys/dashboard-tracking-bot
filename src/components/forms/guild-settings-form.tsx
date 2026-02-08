'use client'

import { useGuildChannels, useUpdateGuildSettings } from '@/hooks/use-guilds'
import { ChannelSelect } from '@/components/ui/channel-select'
import type { GuildSettings } from '@/types/guild'
import { useState, useEffect, useRef } from 'react'

interface GuildSettingsFormProps {
  guildId: string
  settings: GuildSettings
}

/**
 * Guild settings form with channel selection and auto-save.
 * Allows users to configure notification channels for logs and updates.
 */
export function GuildSettingsForm({ guildId, settings }: GuildSettingsFormProps) {
  const { data: channelsData, isLoading: channelsLoading } = useGuildChannels(guildId)
  const mutation = useUpdateGuildSettings(guildId)

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')

  // Store initial settings snapshot on mount
  const initialSettingsRef = useRef<GuildSettings>(settings)

  // Update snapshot if settings prop changes (e.g., after reload)
  useEffect(() => {
    initialSettingsRef.current = settings
  }, [settings])

  // Auto-clear success/error status after 3 seconds
  useEffect(() => {
    if (saveStatus === 'success' || saveStatus === 'error') {
      const timer = setTimeout(() => setSaveStatus('idle'), 3000)
      return () => clearTimeout(timer)
    }
  }, [saveStatus])

  const handleChannelChange = (field: keyof GuildSettings, value: string | null) => {
    setSaveStatus('saving')

    mutation.mutate(
      { [field]: value },
      {
        onSuccess: () => setSaveStatus('success'),
        onError: () => setSaveStatus('error'),
      }
    )
  }

  const channels = channelsData?.channels ?? []

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
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
