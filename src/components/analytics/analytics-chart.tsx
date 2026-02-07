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

interface AnalyticsChartProps {
  data: Array<{ date: string; count: number; rawDate: string }>
  granularity: 'day' | 'week'
  onDataPointClick?: (rawDate: string) => void
  className?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    payload: { date: string; count: number; rawDate: string }
  }>
  granularity: 'day' | 'week'
}

function CustomTooltip({ active, payload, granularity }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-surface border border-border rounded-sm p-3 shadow-lg">
      <p className="text-sm font-semibold text-white mb-1">
        {payload[0].payload.date}
      </p>
      <p className="text-sm text-gray-300">
        {payload[0].value} posts {granularity === 'week' ? 'this week' : 'on this day'}
      </p>
    </div>
  )
}

export function AnalyticsChart({ data, granularity, onDataPointClick, className }: AnalyticsChartProps) {
  const isEmpty = !data || data.length === 0 || data.every(d => d.count === 0)

  const handleClick = (e: any) => {
    if (e && e.activeLabel !== undefined && onDataPointClick) {
      const clickedItem = data.find(d => d.date === e.activeLabel)
      if (clickedItem) {
        onDataPointClick(clickedItem.rawDate)
      }
    }
  }

  return (
    <div className={cn('bg-surface border border-border rounded-sm p-6', className)}>
      <h3 className="text-lg font-semibold text-white mb-4">Submissions</h3>

      {isEmpty ? (
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-gray-400 text-sm">No submissions data for this period</p>
        </div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} onClick={handleClick}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip granularity={granularity} />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#8b5cf6"
                fillOpacity={1}
                fill="url(#colorCount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
