'use client'

import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react'
import { cn } from '@/lib/utils'

interface Group {
  id: string
  label: string
  slug: string
}

interface GroupSelectProps {
  value: string  // '' for all, or specific group slug
  onChange: (value: string) => void
  groups: Group[]
  className?: string
  isLoading?: boolean
}

/**
 * Group filter dropdown using Headless UI Listbox.
 * Groups are fetched from brands data.
 */
export function GroupSelect({ value, onChange, groups, className, isLoading }: GroupSelectProps) {
  const options = [
    { value: '', label: 'All Groups' },
    ...groups.map(g => ({ value: g.slug, label: g.label }))
  ]

  const selected = options.find(g => g.value === value) ?? options[0]

  if (isLoading) {
    return (
      <div className={cn('relative w-40 py-3 px-3 bg-surface border border-border rounded-lg', className)}>
        <span className="text-sm text-gray-500">Loading groups...</span>
      </div>
    )
  }

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
            'absolute z-20 mt-1 w-48 max-h-60 overflow-auto',
            'bg-surface border border-border rounded-lg shadow-lg',
            'focus:outline-none'
          )}
        >
          {options.map((option) => (
            <ListboxOption
              key={option.value || 'all'}
              value={option.value}
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
                    {option.label}
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
