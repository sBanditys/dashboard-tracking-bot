'use client'

import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const PAGE_SIZE_KEY = 'tracking-page-size'
const PAGE_SIZE_OPTIONS = [25, 50, 100] as const
const DEFAULT_PAGE_SIZE = 50

interface PageSizeSelectProps {
  value: number
  onChange: (value: number) => void
  className?: string
}

/**
 * Page size selector dropdown.
 * Persists selection to localStorage for consistent UX across sessions.
 */
export function PageSizeSelect({ value, onChange, className }: PageSizeSelectProps) {
  const [mounted, setMounted] = useState(false)

  // Load initial value from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(PAGE_SIZE_KEY)
    if (stored) {
      const parsed = parseInt(stored, 10)
      if (PAGE_SIZE_OPTIONS.includes(parsed as typeof PAGE_SIZE_OPTIONS[number])) {
        onChange(parsed)
      }
    }
  }, [onChange])

  // Persist to localStorage when value changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(PAGE_SIZE_KEY, value.toString())
    }
  }, [value, mounted])

  return (
    <Listbox value={value} onChange={onChange}>
      <div className={cn('relative', className)}>
        <ListboxButton
          className={cn(
            'relative w-28 py-3 pl-3 pr-10 text-left',
            'bg-surface border border-border rounded-lg',
            'cursor-pointer text-sm text-gray-300',
            'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent',
            'transition-colors'
          )}
        >
          <span className="block truncate">Show {value}</span>
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
            'absolute z-20 mt-1 w-28',
            'bg-surface border border-border rounded-lg shadow-lg',
            'focus:outline-none overflow-hidden'
          )}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <ListboxOption
              key={size}
              value={size}
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
                    {size}
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

/**
 * Hook to get initial page size from localStorage.
 * Use this to initialize state in parent components.
 */
export function getInitialPageSize(): number {
  if (typeof window === 'undefined') return DEFAULT_PAGE_SIZE
  const stored = localStorage.getItem(PAGE_SIZE_KEY)
  if (stored) {
    const parsed = parseInt(stored, 10)
    if (PAGE_SIZE_OPTIONS.includes(parsed as typeof PAGE_SIZE_OPTIONS[number])) {
      return parsed
    }
  }
  return DEFAULT_PAGE_SIZE
}
