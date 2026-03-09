import { PlatformIcon } from '@/components/platform-icon'
import { centsToDisplay } from '@/lib/format'
import type { Campaign } from '@/types/campaign'

interface PlatformRateCardsProps {
  campaign: Campaign
}

const PLATFORMS = [
  { key: 'instagramRateCents' as const, platform: 'instagram' as const, label: 'Instagram' },
  { key: 'tiktokRateCents' as const, platform: 'tiktok' as const, label: 'TikTok' },
  { key: 'youtubeRateCents' as const, platform: 'youtube' as const, label: 'YouTube' },
]

export function PlatformRateCards({ campaign }: PlatformRateCardsProps) {
  const activePlatforms = PLATFORMS.filter((p) => campaign[p.key] !== null)

  if (activePlatforms.length === 0) {
    return <p className="text-sm text-gray-500">No platform rates configured</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {activePlatforms.map((p) => (
        <div
          key={p.platform}
          className="bg-surface border border-border rounded-lg p-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <PlatformIcon platform={p.platform} size="w-6 h-6" />
            <span className="text-sm text-gray-400">{p.label}</span>
          </div>
          <p className="text-white font-medium">
            {centsToDisplay(campaign[p.key]!)}
          </p>
        </div>
      ))}
    </div>
  )
}
