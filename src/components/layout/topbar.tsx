'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { GuildSwitcher } from '@/components/guild-switcher'
import { UserMenu } from './user-menu'

interface TopbarProps {
  onMenuClick?: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left: Mobile hamburger + Logo + Guild Switcher */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-sm hover:bg-surface transition-colors text-white"
            aria-label="Open menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <Link
            href="/"
            className="text-lg font-semibold text-white hidden lg:block"
          >
            Tracking Dashboard
          </Link>

          <GuildSwitcher />
        </div>

        {/* Right: Theme toggle + User menu */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
