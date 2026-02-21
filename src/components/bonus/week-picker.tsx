'use client'

import { useState, useRef, useEffect } from 'react'
import { startOfWeek, endOfWeek, format, isAfter, isBefore, addDays } from 'date-fns'
import { DayPicker, rangeIncludesDate, type DateRange } from 'react-day-picker'
import { CalendarIcon, ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import 'react-day-picker/style.css'

interface WeekPickerProps {
  selectedWeek: DateRange | undefined
  onSelect: (week: DateRange) => void
  existingWeekStarts: string[]
  onRetroactiveDetected: (isRetroactive: boolean) => void
}

/**
 * Week picker component with popover calendar.
 *
 * - Highlights full week on hover/selection
 * - Disables future weeks and weeks with existing bonus rounds
 * - Detects retroactive week selection (week end is in the past)
 * - Week start: Sunday (weekStartsOn: 0) matching backend weekBoundary.ts
 */
export function WeekPicker({
  selectedWeek,
  onSelect,
  existingWeekStarts,
  onRetroactiveDetected,
}: WeekPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredWeek, setHoveredWeek] = useState<DateRange | undefined>()
  const containerRef = useRef<HTMLDivElement>(null)

  // Week start: Sunday (matching backend weekBoundary.ts getWeekStart which uses dayOfWeek=0)
  const weekStartsOn = 0 as const

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

  // Build disabled week ranges from existing round week starts
  const disabledWeeks: DateRange[] = existingWeekStarts.map((ws) => {
    const weekStart = new Date(ws)
    return {
      from: weekStart,
      to: endOfWeek(weekStart, { weekStartsOn }),
    }
  })

  // Allow current week — disable only weeks that START after today's week end
  const currentWeekEnd = endOfWeek(new Date(), { weekStartsOn })
  const disabledFuture = { after: currentWeekEnd }

  const handleDayClick = (day: Date, modifiers: Record<string, boolean>) => {
    if (modifiers.disabled || modifiers.hidden) return

    const weekStart = startOfWeek(day, { weekStartsOn })
    const weekEnd = endOfWeek(day, { weekStartsOn })
    const week: DateRange = { from: weekStart, to: weekEnd }

    onSelect(week)

    // Retroactive detection: if the week end is before now (past week)
    const isRetroactive = isBefore(weekEnd, new Date())
    onRetroactiveDetected(isRetroactive)

    setIsOpen(false)
    setHoveredWeek(undefined)
  }

  const handleDayMouseEnter = (day: Date, modifiers: Record<string, boolean>) => {
    if (modifiers.disabled || modifiers.hidden) return
    const weekStart = startOfWeek(day, { weekStartsOn })
    const weekEnd = endOfWeek(day, { weekStartsOn })
    setHoveredWeek({ from: weekStart, to: weekEnd })
  }

  const handleDayMouseLeave = () => {
    setHoveredWeek(undefined)
  }

  const displayRange = selectedWeek ?? hoveredWeek

  const formatWeekRange = (week: DateRange): string => {
    if (!week.from || !week.to) return 'Select a week'
    return `${format(week.from, 'MMM d')} - ${format(week.to, 'MMM d, yyyy')}`
  }

  const modifiers = {
    selected: displayRange,
    range_start: displayRange?.from,
    range_end: displayRange?.to,
    range_middle: (date: Date) =>
      displayRange ? rangeIncludesDate(displayRange, date, true) : false,
    week_start: (date: Date) => date.getDay() === weekStartsOn,
    week_end: (date: Date) => {
      // Day before week start is week end
      const nextDayOfWeek = (weekStartsOn + 6) % 7
      return date.getDay() === nextDayOfWeek
    },
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 text-left w-full',
          'bg-background border rounded-lg transition-colors',
          'text-sm',
          isOpen
            ? 'border-accent-purple ring-2 ring-accent-purple/30 text-white'
            : selectedWeek
            ? 'border-border text-white hover:border-gray-500'
            : 'border-border text-gray-400 hover:border-gray-500'
        )}
      >
        <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="flex-1">
          {selectedWeek ? formatWeekRange(selectedWeek) : 'Select a week'}
        </span>
        <ChevronDownIcon
          className={cn(
            'w-4 h-4 text-gray-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1 left-0',
            'bg-surface border border-border rounded-lg p-3 shadow-xl',
            'min-w-[300px]'
          )}
        >
          <DayPicker
            showWeekNumber
            onDayClick={handleDayClick}
            onDayMouseEnter={handleDayMouseEnter}
            onDayMouseLeave={handleDayMouseLeave}
            disabled={[disabledFuture, ...disabledWeeks]}
            modifiers={modifiers}
            classNames={{
              root: 'text-gray-300',
              months: 'flex flex-col',
              month: 'space-y-3',
              month_caption: 'flex justify-center pt-1 relative items-center mb-2',
              caption_label: 'text-sm font-medium text-white',
              nav: 'flex items-center gap-1',
              button_previous:
                'absolute left-0 p-1.5 text-gray-400 hover:text-white hover:bg-background rounded transition-colors',
              button_next:
                'absolute right-0 p-1.5 text-gray-400 hover:text-white hover:bg-background rounded transition-colors',
              month_grid: 'w-full border-collapse',
              weekdays: 'flex',
              weekday: 'text-gray-500 rounded-md w-9 font-normal text-xs text-center',
              week: 'flex w-full mt-1',
              week_number_header: 'text-gray-600 w-8 text-xs text-center',
              week_number: 'text-gray-600 w-8 text-xs text-center pt-2',
              day: cn(
                'h-9 w-9 text-center text-sm p-0 relative',
                'focus-within:relative focus-within:z-20'
              ),
              day_button: cn(
                'h-9 w-9 p-0 font-normal rounded-none w-full',
                'hover:bg-accent-purple/20 transition-colors',
                'aria-selected:opacity-100'
              ),
              selected:
                'bg-accent-purple/30 text-white',
              range_start: 'rounded-l-md bg-accent-purple! text-white!',
              range_end: 'rounded-r-md bg-accent-purple! text-white!',
              range_middle: 'bg-accent-purple/20 text-gray-200 rounded-none',
              today: 'text-accent-purple font-semibold',
              outside: 'text-gray-600',
              disabled: 'text-gray-700 opacity-40 cursor-not-allowed',
              hidden: 'invisible',
            }}
          />

          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs text-gray-500">
              Click any day to select its full week (Sunday to Saturday)
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
