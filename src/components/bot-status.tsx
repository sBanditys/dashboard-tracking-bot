'use client'

import { cn } from '@/lib/utils'
import { safeFormatDistanceToNow } from '@/lib/date-utils'
import type { ConnectionState } from '@/hooks/use-sse'

interface BotStatusProps {
    healthy?: boolean
    lastHeartbeat?: string
    version?: string | null
    className?: string
    connectionState?: ConnectionState
    onReconnect?: () => void
}

export function BotStatus({
    healthy,
    lastHeartbeat,
    version,
    className,
    connectionState = 'connected',
    onReconnect,
}: BotStatusProps) {
    const getStatusDisplay = () => {
        // Connecting state
        if (connectionState === 'connecting') {
            return {
                dotClass: 'bg-gray-400 animate-pulse',
                textClass: 'text-gray-400',
                text: 'Connecting...',
                subtext: null,
            }
        }

        // Reconnecting state (stall-triggered reconnect — was previously connected)
        if (connectionState === 'reconnecting') {
            return {
                dotClass: 'bg-yellow-500 animate-pulse',
                textClass: 'text-yellow-400',
                text: 'Reconnecting...',
                subtext: null,
            }
        }

        // Error state - connection lost, retries exhausted
        if (connectionState === 'error') {
            return {
                dotClass: 'bg-yellow-500',
                textClass: 'text-yellow-400',
                text: 'Connection lost',
                subtext: 'Click to retry',
            }
        }

        // Disconnected state - SSE not connected
        if (connectionState === 'disconnected') {
            return {
                dotClass: 'bg-gray-400',
                textClass: 'text-gray-400',
                text: 'Disconnected',
                subtext: null,
            }
        }

        // Connected but status data not yet loaded
        if (healthy === undefined) {
            return {
                dotClass: 'bg-green-500 animate-pulse',
                textClass: 'text-green-400',
                text: 'Connected',
                subtext: null,
            }
        }

        // Connected — show actual bot status
        if (healthy) {
            return {
                dotClass: 'bg-green-500 animate-pulse',
                textClass: 'text-green-400',
                text: 'Online',
                subtext: version ? `v${version}` : null,
            }
        }

        // Bot offline
        const lastSeenText = lastHeartbeat
            ? `Last seen: ${safeFormatDistanceToNow(lastHeartbeat)}`
            : null
        return {
            dotClass: 'bg-red-500',
            textClass: 'text-red-400',
            text: 'Offline',
            subtext: lastSeenText,
            hint: 'Check Discord',
        }
    }

    const status = getStatusDisplay()
    const isClickable = (connectionState === 'error' || connectionState === 'reconnecting') && onReconnect

    const content = (
        <>
            <div
                className={cn(
                    'h-3 w-3 rounded-full transition-colors duration-300',
                    status.dotClass
                )}
            />
            <div className="flex flex-col">
                <span className={cn('text-sm font-medium transition-colors duration-300', status.textClass)}>
                    {status.text}
                </span>
                {status.subtext && (
                    <span className="text-xs text-gray-500">
                        {status.subtext}
                    </span>
                )}
                {'hint' in status && status.hint && (
                    <span className="text-xs text-gray-500">
                        {status.hint}
                    </span>
                )}
            </div>
        </>
    )

    if (isClickable) {
        return (
            <button
                type="button"
                onClick={onReconnect}
                className={cn(
                    'flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity',
                    className
                )}
            >
                {content}
            </button>
        )
    }

    return (
        <div className={cn('flex items-center gap-2', className)}>
            {content}
        </div>
    )
}
