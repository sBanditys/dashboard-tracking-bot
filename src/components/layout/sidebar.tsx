'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/use-user'
import { useActiveThresholdCount } from '@/hooks/use-alerts'

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useUser()

  // Detect if we're on a guild page to show guild-specific nav
  const guildMatch = pathname.match(/\/guilds\/([^\/]+)/)
  const guildId = guildMatch?.[1]

  // Check ADMINISTRATOR permission bit (0x8) for current guild
  const guildEntry = guildId ? user?.guilds?.find((g) => g.id === guildId) : undefined
  const isGuildAdmin = guildEntry !== undefined && (Number(guildEntry.permissions) & 0x8) !== 0

  const { count: alertCount } = useActiveThresholdCount(guildId ?? '')

  const navItems = [
    {
      name: 'Home',
      href: '/',
      icon: '🏠',
    },
    {
      name: 'Guilds',
      href: '/guilds',
      icon: '🛡️',
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: '⚙️',
    },
  ]

  const legalItems = [
    {
      name: 'Terms of Service',
      href: '/legal/terms',
    },
    {
      name: 'Privacy Policy',
      href: '/legal/privacy',
    },
  ]

  return (
    <div className="flex flex-col h-full w-64 bg-surface border-r border-border">
      {/* Logo/Brand */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link href="/" className="text-xl font-bold text-white" onClick={onNavigate}>
          Tracking Dashboard
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent-purple text-white'
                    : 'text-gray-300 hover:bg-surface/50 hover:text-white'
                )}
              >
                <span className="text-lg">{item.icon}</span>
                {item.name}
              </Link>
            )
          })}

          {/* Guild-specific navigation */}
          {guildId && (
            <>
              <div className="my-3 border-t border-border" />
              <Link
                href={`/guilds/${guildId}/activity`}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors',
                  pathname.includes('/activity')
                    ? 'bg-accent-purple text-white'
                    : 'text-gray-300 hover:bg-surface/50 hover:text-white'
                )}
              >
                <span className="text-lg">📋</span>
                Activity
              </Link>
              <Link
                href={`/guilds/${guildId}/analytics`}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors',
                  pathname.includes('/analytics')
                    ? 'bg-accent-purple text-white'
                    : 'text-gray-300 hover:bg-surface/50 hover:text-white'
                )}
              >
                <span className="text-lg">📊</span>
                Analytics
              </Link>

              <Link
                href={`/guilds/${guildId}/settings/trash`}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors',
                  pathname.includes('/settings/trash')
                    ? 'bg-accent-purple text-white'
                    : 'text-gray-300 hover:bg-surface/50 hover:text-white'
                )}
              >
                <span className="text-lg">🗑️</span>
                Deleted Items
              </Link>

              {/* Manage section — admin only */}
              {isGuildAdmin && (
                <>
                  <div className="my-3 border-t border-border" />
                  <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Manage
                  </p>
                  <Link
                    href={`/guilds/${guildId}/manage/alerts`}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors',
                      pathname.includes('/manage/alerts')
                        ? 'bg-accent-purple text-white'
                        : 'text-gray-300 hover:bg-surface/50 hover:text-white'
                    )}
                  >
                    <span className="text-lg">🔔</span>
                    Alerts
                    {alertCount > 0 && (
                      <span className="ml-auto text-xs bg-accent-purple rounded-full px-2 py-0.5 text-white">
                        {alertCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href={`/guilds/${guildId}/manage/data`}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors',
                      pathname.includes('/manage/data')
                        ? 'bg-accent-purple text-white'
                        : 'text-gray-300 hover:bg-surface/50 hover:text-white'
                    )}
                  >
                    <span className="text-lg">📁</span>
                    Data
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </nav>

      {/* Legal Links */}
      <div className="px-3 py-4 border-t border-border">
        <div className="space-y-1">
          {legalItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="block px-3 py-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
