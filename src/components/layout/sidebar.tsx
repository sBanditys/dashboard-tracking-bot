'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname()

  // Detect if we're on a guild page to show guild-specific nav
  const guildMatch = pathname.match(/\/guilds\/([^\/]+)/)
  const guildId = guildMatch?.[1]

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
