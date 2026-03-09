import { cn } from '@/lib/utils'
import type { CampaignStatus } from '@/types/campaign'

const STATUS_STYLES: Record<CampaignStatus, { bg: string; text: string; label: string }> = {
  Draft: { bg: 'bg-gray-500', text: 'text-gray-800', label: 'Draft' },
  Active: { bg: 'bg-green-500', text: 'text-green-900', label: 'Active' },
  Paused: { bg: 'bg-yellow-500', text: 'text-yellow-900', label: 'Paused' },
  SubmissionsClosed: { bg: 'bg-orange-500', text: 'text-orange-900', label: 'Submissions Closed' },
  Completed: { bg: 'bg-blue-500', text: 'text-blue-900', label: 'Completed' },
}

interface CampaignStatusBadgeProps {
  status: CampaignStatus
  className?: string
}

export function CampaignStatusBadge({ status, className }: CampaignStatusBadgeProps) {
  const style = STATUS_STYLES[status]

  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-medium',
        style.bg,
        style.text,
        className
      )}
    >
      {style.label}
    </span>
  )
}
