import { formatDistanceToNow } from 'date-fns'

/**
 * Safely format a date string to relative time (e.g., "5 minutes ago").
 * Returns fallback string if date is null, undefined, or invalid.
 */
export function safeFormatDistanceToNow(
    dateString: string | null | undefined,
    options: { addSuffix?: boolean; fallback?: string } = {}
): string {
    const { addSuffix = true, fallback = 'Unknown' } = options

    if (!dateString) return fallback

    try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return fallback
        return formatDistanceToNow(date, { addSuffix })
    } catch {
        return fallback
    }
}
