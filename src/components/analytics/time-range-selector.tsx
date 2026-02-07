'use client'

import { cn } from '@/lib/utils'

// Define TimeRange locally since types file may not exist yet (Wave 1 parallel execution)
export type TimeRange = 7 | 30 | 90

interface TimeRangeSelectorProps {
  value: TimeRange
  onChange: (range: TimeRange) => void
  className?: string
}

export function TimeRangeSelector({ value, onChange, className }: TimeRangeSelectorProps) {
  const ranges: Array<{ value: TimeRange; label: string }> = [
    { value: 7, label: '7d' },
    { value: 30, label: '30d' },
    { value: 90, label: '90d' },
  ]

  return (
    <div className={cn('inline-flex rounded-sm border border-border bg-surface', className)}>
      {ranges.map((range, index) => {
        const isActive = value === range.value
        const isFirst = index === 0
        const isLast = index === ranges.length - 1

        return (
          <button
            key={range.value}
            onClick={() => onChange(range.value)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium transition-colors',
              isActive && 'bg-accent-purple text-white',
              !isActive && 'text-gray-400 hover:text-white hover:bg-surface/50',
              isFirst && 'rounded-l-sm',
              isLast && 'rounded-r-sm'
            )}
          >
            {range.label}
          </button>
        )
      })}
    </div>
  )
}
