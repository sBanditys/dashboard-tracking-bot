import Link from 'next/link'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { ActivityEvent as ActivityEventType } from '@/types/analytics'

interface ActivityEventProps {
  event: ActivityEventType
  guildId: string
}

/**
 * Single activity event item with colored indicator dot and clickable link.
 * Builds navigation links based on event type and guildId.
 */
export function ActivityEvent({ event, guildId }: ActivityEventProps) {
  // Determine dot color based on event type
  const dotColor = {
    post_captured: 'bg-blue-500',
    settings_changed: 'bg-yellow-500',
    account_added: 'bg-green-500',
    brand_added: 'bg-green-500',
    account_removed: 'bg-red-500',
    brand_removed: 'bg-red-500',
  }[event.type]

  // Build navigation link from event type
  const buildLink = () => {
    if (!event.link) return null

    switch (event.type) {
      case 'post_captured':
        return `/guilds/${guildId}/posts`
      case 'account_added':
      case 'account_removed':
        return `/guilds/${guildId}/accounts`
      case 'brand_added':
      case 'brand_removed':
        return `/guilds/${guildId}/brands`
      case 'settings_changed':
        return `/guilds/${guildId}`
      default:
        return null
    }
  }

  const link = buildLink()
  const timeString = format(new Date(event.created_at), 'h:mm a')

  const content = (
    <>
      {/* Colored dot indicator */}
      <div className={cn('w-2 h-2 rounded-full mt-2 flex-shrink-0', dotColor)} />

      {/* Event content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm text-gray-300',
            link && 'hover:text-white transition-colors'
          )}
        >
          {event.description}
        </p>
        <p className="text-xs text-gray-500">{timeString}</p>
      </div>
    </>
  )

  if (link) {
    return (
      <Link href={link} className="flex items-start gap-3 py-2">
        {content}
      </Link>
    )
  }

  return <div className="flex items-start gap-3 py-2">{content}</div>
}
