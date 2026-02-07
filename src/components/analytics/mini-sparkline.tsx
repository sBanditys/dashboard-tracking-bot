'use client'

import { AreaChart, Area, ResponsiveContainer } from 'recharts'

interface MiniSparklineProps {
  data: Array<{ value: number }>
  className?: string
}

export function MiniSparkline({ data, className }: MiniSparklineProps) {
  // Don't render if insufficient data
  if (!data || data.length < 2) return null

  return (
    <ResponsiveContainer width="100%" height={40} className={className}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Area
          type="monotone"
          dataKey="value"
          stroke="#8b5cf6"
          fill="#8b5cf6"
          fillOpacity={0.3}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
