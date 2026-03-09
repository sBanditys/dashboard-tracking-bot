import Link from 'next/link'
import { format } from 'date-fns'
import { centsToDisplay } from '@/lib/format'
import { CampaignStatusBadge } from './campaign-status-badge'
import type { Campaign } from '@/types/campaign'

interface CampaignCardProps {
  campaign: Campaign
  guildId: string
}

export function CampaignCard({ campaign, guildId }: CampaignCardProps) {
  return (
    <Link
      href={`/guilds/${guildId}/campaigns/${campaign.id}`}
      className="block bg-surface border border-border rounded-lg p-4 hover:bg-surface-hover/30 transition-colors"
    >
      {/* Top row: name + status badge */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-white truncate">{campaign.name}</h3>
        <CampaignStatusBadge status={campaign.status} />
      </div>

      {/* Info row */}
      <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
        <span>{centsToDisplay(campaign.budgetCents)}</span>
        <span>{campaign._count.posts} posts</span>
        <span>{campaign._count.participants} participants</span>
      </div>

      {/* Date */}
      <p className="mt-1 text-xs text-gray-500">
        {format(new Date(campaign.createdAt), 'MMM d, yyyy')}
      </p>
    </Link>
  )
}
