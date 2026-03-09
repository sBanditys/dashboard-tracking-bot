'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Campaign } from '@/types/campaign'

interface CampaignSettingsProps {
  campaign: Campaign
}

export function CampaignSettings({ campaign }: CampaignSettingsProps) {
  const [open, setOpen] = useState(false)

  const settings = [
    { label: 'Rules', value: campaign.rules || 'No rules set' },
    {
      label: 'Daily Submission Limit',
      value: campaign.dailySubmissionLimit?.toString() ?? 'No limit',
    },
    {
      label: 'Payment Methods',
      value: campaign.paymentMethods.length > 0
        ? campaign.paymentMethods.join(', ')
        : 'None',
    },
    { label: 'Review Channel', value: campaign.reviewChannelId || 'Not set' },
    { label: 'Alerts Channel', value: campaign.alertsChannelId || 'Not set' },
    {
      label: 'Announcement Channel',
      value: campaign.announcementChannelId || 'Not set',
    },
  ]

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-lg font-semibold text-white hover:text-gray-300 transition-colors"
      >
        Campaign Settings
        {open ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 mt-4 pb-1">
            {settings.map((s) => (
              <div key={s.label}>
                <dt className="text-sm text-gray-400">{s.label}</dt>
                <dd className="text-sm text-white mt-0.5">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
