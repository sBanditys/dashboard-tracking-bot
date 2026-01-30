'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * Debounced search input with magnifying glass icon and clear button.
 * Delays onChange callback by 300ms to reduce unnecessary API calls.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value)
  const debouncedValue = useDebounce(localValue, 300)

  // Sync local value when external value changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Notify parent of debounced value changes
  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue)
    }
  }, [debouncedValue, onChange, value])

  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
  }, [onChange])

  return (
    <div className={cn('relative', className)}>
      {/* Magnifying glass icon */}
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>

      <input
        type="search"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full sm:w-64 py-2.5 pl-10 pr-10 text-sm text-gray-300',
          'bg-surface border border-border rounded-lg',
          'placeholder:text-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent',
          'transition-colors'
        )}
      />

      {/* Clear button */}
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
          aria-label="Clear search"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
