'use client'

import { cn } from '@/lib/utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useId } from 'react'

interface ChartDataPoint {
  date: string
  value: number
  rawDate: string
}

interface AnalyticsChartProps {
  data: ChartDataPoint[]
  title?: string
  centerText?: string
  totalValue?: number
  tooltipLabel?: string
  granularity?: 'day' | 'week'
  onDataPointClick?: (rawDate: string) => void
  statusBadge?: React.ReactNode
  className?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    payload: ChartDataPoint
  }>
  label?: string
  tooltipLabel: string
}

function formatCompact(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

function CustomTooltip({ active, payload, tooltipLabel }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-surface border border-border rounded-sm p-3 shadow-lg">
      <p className="text-sm font-semibold text-white mb-1">
        {payload[0].payload.date}
      </p>
      <p className="text-sm text-gray-300">
        {formatCompact(payload[0].value)} {tooltipLabel}
      </p>
    </div>
  )
}

export function AnalyticsChart({
  data,
  title = 'Views',
  centerText,
  totalValue,
  tooltipLabel = 'views',
  onDataPointClick,
  statusBadge,
  className,
}: AnalyticsChartProps) {
  const gradientId = useId().replace(/:/g, '')
  const isEmpty = !data || data.length === 0 || data.every(d => d.value === 0)

  const handleClick = (e: { activeLabel?: string | number } | null) => {
    if (e && e.activeLabel !== undefined && onDataPointClick) {
      const clickedItem = data.find(d => d.date === e.activeLabel)
      if (clickedItem) {
        onDataPointClick(clickedItem.rawDate)
      }
    }
  }

  return (
    <div className={cn('bg-surface border border-border rounded-sm p-6', className)}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="flex items-center gap-3">
          {statusBadge}
          {totalValue !== undefined && (
            <span className="text-2xl font-bold text-white">{formatCompact(totalValue)}</span>
          )}
        </div>
      </div>

      {centerText ? (
        <p className="text-sm font-medium text-gray-300 text-center mb-4">{centerText}</p>
      ) : null}

      {isEmpty ? (
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-gray-400 text-sm">No data for this period</p>
        </div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} onClick={handleClick} margin={{ top: 10, right: 12, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="6%" stopColor="var(--chart-accent)" stopOpacity={0.62} />
                  <stop offset="96%" stopColor="var(--chart-accent)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 6" stroke="var(--chart-grid)" />
              <XAxis
                dataKey="date"
                stroke="var(--chart-axis)"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                stroke="var(--chart-axis)"
                tick={{ fontSize: 12 }}
                tickFormatter={formatCompact}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip tooltipLabel={tooltipLabel} />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--chart-accent)"
                strokeWidth={2.25}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface-bg)', fill: 'var(--chart-accent)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
