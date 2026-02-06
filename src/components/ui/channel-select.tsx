'use client'

import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption, ComboboxButton } from '@headlessui/react'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { Channel } from '@/types/guild'

interface ChannelSelectProps {
  channels: Channel[]
  value: string | null
  onChange: (channelId: string | null) => void
  placeholder?: string
  className?: string
}

/**
 * Searchable Discord channel combobox using Headless UI.
 * Filters to text channels only (type === 0) and shows permission warnings.
 */
export function ChannelSelect({
  channels,
  value,
  onChange,
  placeholder = 'Search channels...',
  className
}: ChannelSelectProps) {
  const [query, setQuery] = useState('')

  // Filter to text channels only (type === 0)
  const textChannels = useMemo(
    () => channels.filter(c => c.type === 0),
    [channels]
  )

  // Filter by search query
  const filteredChannels = useMemo(() => {
    if (query === '') {
      return textChannels
    }
    return textChannels.filter(c =>
      c.name.toLowerCase().includes(query.toLowerCase())
    )
  }, [textChannels, query])

  return (
    <Combobox value={value} onChange={onChange}>
      <div className={cn('relative', className)}>
        <ComboboxInput
          className={cn(
            'w-full py-3 pl-3 pr-10',
            'bg-surface border border-border rounded-lg',
            'text-sm text-gray-300',
            'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent',
            'transition-colors'
          )}
          displayValue={(id: string | null) => {
            const channel = textChannels.find(c => c.id === id)
            return channel ? `#${channel.name}` : ''
          }}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
        />

        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-3">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </ComboboxButton>

        <ComboboxOptions
          className={cn(
            'absolute z-20 mt-1 w-full',
            'bg-surface border border-border rounded-lg shadow-lg',
            'max-h-60 overflow-auto',
            'focus:outline-none'
          )}
        >
          {filteredChannels.length === 0 ? (
            <div className="py-3 px-4 text-sm text-gray-500">
              No channels found
            </div>
          ) : (
            filteredChannels.map((channel) => (
              <ComboboxOption
                key={channel.id}
                value={channel.id}
                className={cn(
                  'py-3 px-4 text-sm text-gray-300',
                  'data-[focus]:bg-background cursor-pointer',
                  'transition-colors'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">#</span>
                  <span>{channel.name}</span>
                  {!channel.bot_has_access && (
                    <span className="text-yellow-500 text-xs ml-auto">
                      (may lack permissions)
                    </span>
                  )}
                </div>
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </div>
    </Combobox>
  )
}
