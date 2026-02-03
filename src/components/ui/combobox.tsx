// Source: https://headlessui.com/react/combobox
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption, ComboboxButton } from '@headlessui/react'
import { useState, useMemo } from 'react'

interface Channel {
  id: string
  name: string
  type: number  // 0 = text, 2 = voice, etc.
  bot_has_access: boolean
}

interface ChannelSelectProps {
  channels: Channel[]
  value: string | null
  onChange: (channelId: string | null) => void
}

export function ChannelSelect({ channels, value, onChange }: ChannelSelectProps) {
  const [query, setQuery] = useState('')

  // Filter to text channels only (per decision)
  const textChannels = useMemo(
    () => channels.filter(c => c.type === 0),
    [channels]
  )

  const filtered = query === ''
    ? textChannels
    : textChannels.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase())
      )

  const selected = textChannels.find(c => c.id === value)

  return (
    <Combobox value={value} onChange={onChange}>
      <div className="relative">
        <ComboboxInput
          className="w-full py-3 pl-3 pr-10 bg-surface border border-border rounded-lg text-sm text-gray-300"
          displayValue={(id: string | null) =>
            textChannels.find(c => c.id === id)?.name ?? ''
          }
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search channels..."
        />
        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-3">
          {/* Chevron icon */}
        </ComboboxButton>

        <ComboboxOptions className="absolute z-20 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
          {filtered.map((channel) => (
            <ComboboxOption
              key={channel.id}
              value={channel.id}
              className="relative cursor-pointer select-none py-3 px-4 text-sm text-gray-300 data-[focus]:bg-background"
            >
              <span className="flex items-center gap-2">
                <span>#</span>
                <span>{channel.name}</span>
                {/* Per decision: warn if bot may not have permission */}
                {!channel.bot_has_access && (
                  <span className="text-yellow-500 text-xs">(may lack permissions)</span>
                )}
              </span>
            </ComboboxOption>
          ))}
        </ComboboxOptions>
      </div>
    </Combobox>
  )
}
