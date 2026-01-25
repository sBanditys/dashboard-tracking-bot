'use client'

import { useUser } from '@/hooks/use-user'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, isLoading } = useUser()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome, {user.username}!
        </h1>
        <p className="text-gray-400">
          Get started by selecting a guild to view your tracking data
        </p>
      </div>

      {/* Getting Started Section */}
      <div className="bg-surface border border-border rounded-sm p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Get Started
        </h2>
        <p className="text-gray-300 mb-6">
          Select a guild to view tracked accounts, posts, and manage your bot settings.
        </p>
        <Link href="/guilds">
          <Button variant="primary" size="lg">
            Select a Guild
          </Button>
        </Link>
      </div>

      {/* Quick Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-surface border border-border rounded-sm p-4">
          <div className="text-2xl mb-2">🛡️</div>
          <h3 className="text-lg font-medium text-white mb-1">Guilds</h3>
          <p className="text-sm text-gray-400">
            View and manage your Discord server settings
          </p>
        </div>

        <div className="bg-surface border border-border rounded-sm p-4">
          <div className="text-2xl mb-2">📊</div>
          <h3 className="text-lg font-medium text-white mb-1">Tracking Data</h3>
          <p className="text-sm text-gray-400">
            Access tracked accounts, posts, and brand information
          </p>
        </div>

        <div className="bg-surface border border-border rounded-sm p-4">
          <div className="text-2xl mb-2">⚙️</div>
          <h3 className="text-lg font-medium text-white mb-1">Settings</h3>
          <p className="text-sm text-gray-400">
            Configure your preferences and account settings
          </p>
        </div>
      </div>
    </div>
  )
}
