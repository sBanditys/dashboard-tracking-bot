'use client'

import { cn } from '@/lib/utils'

interface BotStatusProps {
    healthy: boolean
    lastHeartbeat?: string
    version?: string | null
    className?: string
}

export function BotStatus({ healthy, lastHeartbeat, version, className }: BotStatusProps) {
    const getTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime()
        const seconds = Math.floor(diff / 1000)
        if (seconds < 60) return `${seconds}s ago`
        const minutes = Math.floor(seconds / 60)
        if (minutes < 60) return `${minutes}m ago`
        const hours = Math.floor(minutes / 60)
        return `${hours}h ago`
    }

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <div
                className={cn(
                    'h-3 w-3 rounded-full',
                    healthy ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                )}
            />
            <div className="flex flex-col">
                <span className={cn('text-sm font-medium', healthy ? 'text-green-400' : 'text-red-400')}>
                    {healthy ? 'Bot Online' : 'Bot Offline'}
                </span>
                {lastHeartbeat && (
                    <span className="text-xs text-gray-500">
                        Last seen: {getTimeAgo(lastHeartbeat)}
                        {version && ` • v${version}`}
                    </span>
                )}
            </div>
        </div>
    )
}
