'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface SparklineDataPoint {
  label: string
  value: number
}

interface FollowerSparklineProps {
  data: SparklineDataPoint[]
  color?: string
  height?: number
}

export function FollowerSparkline({ data, color, height = 32 }: FollowerSparklineProps) {
  if (!data || data.length < 2) {
    return null
  }

  const derivedColor =
    color ??
    (() => {
      const first = data[0].value
      const last = data[data.length - 1].value
      if (last > first) return '#22c55e'
      if (last < first) return '#ef4444'
      return '#6b7280'
    })()

  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={derivedColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
