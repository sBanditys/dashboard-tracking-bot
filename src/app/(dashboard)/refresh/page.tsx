'use client'

import { useUser } from '@/hooks/use-user'
import { RefreshPanel } from '@/components/refresh/refresh-panel'

const ALLOWED_USER_IDS = new Set(
  (process.env.NEXT_PUBLIC_REFRESH_ALLOWED_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
)

export default function RefreshPage() {
  const { user, isLoading } = useUser()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="inline-block w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !ALLOWED_USER_IDS.has(user.id)) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">
            You do not have access to the CSV Metrics Refresh feature.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">CSV Metrics Refresh</h1>
        <p className="text-gray-400">
          Upload a CSV of social media post URLs to fetch fresh metrics. Results are returned as a
          formatted XLSX file with separate sheets per platform.
        </p>
      </div>

      <RefreshPanel />
    </div>
  )
}
