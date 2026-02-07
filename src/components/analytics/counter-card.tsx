'use client'

import { cn } from '@/lib/utils'

interface CounterCardProps {
  label: string
  value: number
  previousValue: number
  icon?: string
  breakdown?: Array<{ platform: string; count: number }>
  className?: string
}

export function CounterCard({
  label,
  value,
  previousValue,
  icon,
  breakdown,
  className,
}: CounterCardProps) {
  // Calculate trend delta
  let delta: number | null = null
  let isPositive = false

  if (previousValue > 0) {
    delta = Math.round(((value - previousValue) / previousValue) * 100)
    isPositive = delta > 0
  }

  // Capitalize platform name
  const capitalizePlatform = (platform: string) => {
    return platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase()
  }

  return (
    <div className={cn('bg-surface border border-border rounded-sm p-4', className)}>
      {/* Top row: label + icon */}
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm text-gray-400">{label}</p>
        {icon && <span className="text-xl">{icon}</span>}
      </div>

      {/* Value */}
      <p className="text-3xl font-bold text-white mb-1">{value.toLocaleString()}</p>

      {/* Trend delta */}
      {delta !== null && delta !== 0 && (
        <p
          className={cn(
            'text-sm',
            isPositive ? 'text-green-400' : 'text-red-400'
          )}
        >
          {isPositive ? '↑' : '↓'} {Math.abs(delta)}% vs previous period
        </p>
      )}

      {/* Platform breakdown */}
      {breakdown && breakdown.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {breakdown.map(({ platform, count }) => (
            <span
              key={platform}
              className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300"
            >
              {count} {capitalizePlatform(platform)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
