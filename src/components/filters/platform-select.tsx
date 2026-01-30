'use client'

import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react'
import { cn } from '@/lib/utils'

const platforms = [
  { value: '', label: 'All Platforms' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'x', label: 'X' },
]

interface PlatformSelectProps {
  value: string  // '' for all, or specific platform
  onChange: (value: string) => void
  className?: string
}

/**
 * Platform filter dropdown using Headless UI Listbox.
 * ARIA-compliant with keyboard navigation support.
 */
export function PlatformSelect({ value, onChange, className }: PlatformSelectProps) {
  const selected = platforms.find(p => p.value === value) ?? platforms[0]

  return (
    <Listbox value={value} onChange={onChange}>
      <div className={cn('relative', className)}>
        <ListboxButton
          className={cn(
            'relative w-40 py-3 pl-3 pr-10 text-left',
            'bg-surface border border-border rounded-lg',
            'cursor-pointer text-sm text-gray-300',
            'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent',
            'transition-colors'
          )}
        >
          <span className="block truncate">{selected.label}</span>
          {/* Chevron icon */}
          <span className="absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </ListboxButton>

        <ListboxOptions
          anchor="bottom start"
          className={cn(
            'absolute z-20 mt-1 w-40',
            'bg-surface border border-border rounded-lg shadow-lg',
            'focus:outline-none overflow-hidden'
          )}
        >
          {platforms.map((platform) => (
            <ListboxOption
              key={platform.value}
              value={platform.value}
              className={cn(
                'relative cursor-pointer select-none py-3 pl-10 pr-4',
                'text-sm text-gray-300',
                'data-[focus]:bg-background data-[selected]:text-white',
                'transition-colors'
              )}
            >
              {({ selected }) => (
                <>
                  <span className={cn('block truncate', selected ? 'font-medium' : 'font-normal')}>
                    {platform.label}
                  </span>
                  {selected && (
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-accent-purple">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}
