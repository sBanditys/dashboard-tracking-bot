'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface GuildTabsProps {
    guildId: string
    className?: string
}

const tabs = [
    { name: 'Overview', href: '' },
    { name: 'Brands', href: '/brands' },
    { name: 'Accounts', href: '/accounts' },
    { name: 'Posts', href: '/posts' },
    { name: 'Exports', href: '/exports' },
]

export function GuildTabs({ guildId, className }: GuildTabsProps) {
    const pathname = usePathname()
    const basePath = `/guilds/${guildId}`

    return (
        <div className={cn('border-b border-border mb-6', className)}>
            <nav className="flex gap-4 -mb-px">
                {tabs.map((tab) => {
                    const href = `${basePath}${tab.href}`
                    const isActive = tab.href === ''
                        ? pathname === basePath
                        : pathname.startsWith(href)

                    return (
                        <Link
                            key={tab.name}
                            href={href}
                            className={cn(
                                'px-1 py-3 text-sm font-medium border-b-2 transition-colors',
                                isActive
                                    ? 'border-accent-purple text-white'
                                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                            )}
                        >
                            {tab.name}
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
