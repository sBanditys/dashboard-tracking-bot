'use client'

import { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import type { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import 'react-day-picker/style.css'

interface DateRangePickerProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  className?: string
}

/**
 * Date range picker with calendar popover.
 * Auto-closes when both start and end dates are selected.
 */
export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const formatRange = (): string => {
    if (!value?.from) return 'Select dates'
    if (!value.to) return format(value.from, 'MMM d, yyyy')
    return `${format(value.from, 'MMM d')} - ${format(value.to, 'MMM d, yyyy')}`
  }

  const handleSelect = (range: DateRange | undefined) => {
    onChange(range)
    // Auto-close when both dates selected
    if (range?.from && range?.to) {
      setIsOpen(false)
    }
  }

  const handleClear = () => {
    onChange(undefined)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 py-3 px-3 text-left',
          'bg-surface border border-border rounded-lg',
          'text-sm text-gray-300',
          'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent',
          'transition-colors'
        )}
      >
        {/* Calendar icon */}
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span>{formatRange()}</span>
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute z-30 mt-1',
            'bg-surface border border-border rounded-lg p-4 shadow-lg',
            'date-range-picker-dark'
          )}
        >
          <DayPicker
            mode="range"
            selected={value}
            onSelect={handleSelect}
            numberOfMonths={1}
            showOutsideDays
            classNames={{
              root: 'text-gray-300',
              months: 'flex flex-col',
              month: 'space-y-4',
              caption: 'flex justify-center pt-1 relative items-center',
              caption_label: 'text-sm font-medium text-white',
              nav: 'space-x-1 flex items-center',
              button_previous: 'absolute left-0 p-1.5 text-gray-400 hover:text-white hover:bg-background rounded transition-colors',
              button_next: 'absolute right-0 p-1.5 text-gray-400 hover:text-white hover:bg-background rounded transition-colors',
              month_grid: 'w-full border-collapse space-y-1',
              weekdays: 'flex',
              weekday: 'text-gray-500 rounded-md w-9 font-normal text-xs',
              week: 'flex w-full mt-2',
              day: cn(
                'h-9 w-9 text-center text-sm p-0 relative',
                '[&:has([aria-selected].day-range-end)]:rounded-r-md',
                '[&:has([aria-selected].day-range-start)]:rounded-l-md',
                'first:[&:has([aria-selected])]:rounded-l-md',
                'last:[&:has([aria-selected])]:rounded-r-md',
                'focus-within:relative focus-within:z-20'
              ),
              day_button: cn(
                'h-9 w-9 p-0 font-normal rounded',
                'hover:bg-background transition-colors',
                'aria-selected:opacity-100'
              ),
              range_end: 'day-range-end',
              range_start: 'day-range-start',
              selected: 'bg-accent-purple text-white hover:bg-accent-purple hover:text-white focus:bg-accent-purple focus:text-white',
              today: 'bg-background text-white',
              outside: 'text-gray-600 aria-selected:bg-accent-purple/50 aria-selected:text-gray-300',
              disabled: 'text-gray-600 opacity-50',
              range_middle: 'aria-selected:bg-accent-purple/20 aria-selected:text-gray-300',
              hidden: 'invisible',
            }}
          />

          {/* Clear button */}
          {value?.from && (
            <div className="mt-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={handleClear}
                className="text-sm text-gray-400 hover:text-accent-purple transition-colors"
              >
                Clear dates
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
