'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Database } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ManageNavProps {
    guildId: string
}

/**
 * Sub-navigation for the manage section (Alerts and Data tabs)
 */
export function ManageNav({ guildId }: ManageNavProps) {
    const pathname = usePathname()

    const navItems = [
        {
            name: 'Alerts',
            href: `/guilds/${guildId}/manage/alerts`,
            icon: Bell,
            active: pathname.includes('/manage/alerts'),
        },
        {
            name: 'Data',
            href: `/guilds/${guildId}/manage/data`,
            icon: Database,
            active: pathname.includes('/manage/data'),
        },
    ]

    return (
        <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => {
                const Icon = item.icon
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                            item.active
                                ? 'bg-accent-purple text-white'
                                : 'bg-surface border border-border text-gray-300 hover:bg-surface/50 hover:text-white'
                        )}
                    >
                        <Icon className="w-4 h-4" />
                        {item.name}
                    </Link>
                )
            })}
        </nav>
    )
}
