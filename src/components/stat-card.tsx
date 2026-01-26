import { cn } from '@/lib/utils'

interface StatCardProps {
    label: string
    value: string | number
    icon?: string
    trend?: {
        value: number
        positive?: boolean
    }
    className?: string
}

export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
    return (
        <div className={cn('bg-surface border border-border rounded-sm p-4', className)}>
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-sm text-gray-400">{label}</p>
                    <p className="text-2xl font-bold text-white">{value}</p>
                    {trend && (
                        <p
                            className={cn(
                                'text-xs',
                                trend.positive ? 'text-green-400' : 'text-red-400'
                            )}
                        >
                            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
                        </p>
                    )}
                </div>
                {icon && <span className="text-2xl">{icon}</span>}
            </div>
        </div>
    )
}
