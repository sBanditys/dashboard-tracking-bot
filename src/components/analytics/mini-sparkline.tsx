'use client'

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

interface DataPoint {
  label: string
  value: number
}

interface MiniSparklineProps {
  data: DataPoint[]
  height?: number
  color?: string
  tooltipLabel?: string
}

function formatCompact(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    payload: DataPoint
  }>
  tooltipLabel: string
}

function SparklineTooltip({ active, payload, tooltipLabel }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-surface border border-border rounded-sm px-2.5 py-1.5 shadow-lg">
      <p className="text-xs text-gray-400">{payload[0].payload.label}</p>
      <p className="text-sm font-semibold text-white">
        {formatCompact(payload[0].value)} {tooltipLabel}
      </p>
    </div>
  )
}

export function MiniSparkline({
  data,
  height = 64,
  color = '#8b5cf6',
  tooltipLabel = 'posts',
}: MiniSparklineProps) {
  const isEmpty = !data || data.length === 0 || data.every(d => d.value === 0)

  if (isEmpty) {
    return (
      <div style={{ height }} className="bg-surface-hover/30 rounded animate-pulse" />
    )
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.6} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Tooltip
            content={<SparklineTooltip tooltipLabel={tooltipLabel} />}
            cursor={{ stroke: color, strokeOpacity: 0.3 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#sparklineGradient)"
            dot={false}
            activeDot={{ r: 3, fill: color, stroke: '#1a1a2e', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
