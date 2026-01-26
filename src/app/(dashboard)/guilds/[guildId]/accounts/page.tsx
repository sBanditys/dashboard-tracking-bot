'use client'

import { useState, useMemo } from 'react'
import { useAccounts } from '@/hooks/use-tracking'
import { useBrands } from '@/hooks/use-tracking'
import { GuildTabs } from '@/components/guild-tabs'
import { DataTable } from '@/components/ui/data-table'
import { Pagination } from '@/components/ui/pagination'
import { cn } from '@/lib/utils'
import type { Account } from '@/types/tracking'

interface PageProps {
    params: { guildId: string }
}

// SVG Platform Icons
const InstagramIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
)

const TikTokIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
)

const YouTubeIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
)

const XIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
)

const PlatformIcon = ({ platform }: { platform: string }) => {
    switch (platform) {
        case 'instagram':
            return <span className="text-pink-500"><InstagramIcon /></span>
        case 'tiktok':
            return <span className="text-gray-400"><TikTokIcon /></span>
        case 'youtube':
            return <span className="text-red-500"><YouTubeIcon /></span>
        case 'x':
            return <span className="text-gray-400"><XIcon /></span>
        default:
            return <span className="text-gray-400">🔗</span>
    }
}

// Build profile URL for each platform
function getProfileUrl(platform: string, username: string): string {
    switch (platform) {
        case 'instagram':
            return `https://instagram.com/${username}`
        case 'tiktok':
            return `https://tiktok.com/@${username}`
        case 'youtube':
            return `https://youtube.com/@${username}`
        case 'x':
            return `https://x.com/${username}`
        default:
            return '#'
    }
}

const columns = [
    {
        key: 'platform',
        header: 'Platform',
        render: (account: Account) => (
            <span className="flex items-center gap-2">
                <PlatformIcon platform={account.platform} />
                <span className="capitalize">{account.platform}</span>
            </span>
        ),
    },
    {
        key: 'username',
        header: 'Username',
        render: (account: Account) => (
            <a
                href={getProfileUrl(account.platform, account.username)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-accent-purple hover:underline"
            >
                @{account.username}
            </a>
        ),
    },
    {
        key: 'brand',
        header: 'Brand',
    },
    {
        key: 'group',
        header: 'Group',
        render: (account: Account) => (
            <span className="text-gray-400">{account.group || '-'}</span>
        ),
    },
    {
        key: 'is_verified',
        header: 'Status',
        render: (account: Account) => (
            <span
                className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs',
                    account.is_verified
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-gray-500/10 text-gray-400'
                )}
            >
                {account.is_verified ? '✓ Verified' : 'Pending'}
            </span>
        ),
    },
    {
        key: 'created_at',
        header: 'Added',
        render: (account: Account) => (
            <span className="text-gray-400 text-xs">
                {new Date(account.created_at).toLocaleDateString()}
            </span>
        ),
    },
]

export default function AccountsPage({ params }: PageProps) {
    const { guildId } = params
    const [page, setPage] = useState(1)
    const [groupFilter, setGroupFilter] = useState<string>('')
    const { data, isLoading, isError } = useAccounts(guildId, page)
    const { data: brandsData } = useBrands(guildId)

    // Extract unique groups from brands data
    const groups = useMemo(() => {
        if (!brandsData?.brands) return []
        const groupSet = new Set<string>()
        brandsData.brands.forEach(brand => {
            brand.groups.forEach(group => {
                groupSet.add(group.label)
            })
        })
        return Array.from(groupSet).sort()
    }, [brandsData])

    // Filter accounts by group
    const filteredAccounts = useMemo(() => {
        if (!data?.accounts || !groupFilter) return data?.accounts || []
        return data.accounts.filter(account => account.group === groupFilter)
    }, [data?.accounts, groupFilter])

    if (isError) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400">Failed to load accounts</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Accounts</h1>
                <p className="text-gray-400">
                    All tracked social media accounts
                    {data && <span className="ml-2">({data.pagination.total} total)</span>}
                </p>
            </div>

            <GuildTabs guildId={guildId} />

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <select
                    value={groupFilter}
                    onChange={(e) => {
                        setGroupFilter(e.target.value)
                        setPage(1)
                    }}
                    className="bg-surface border border-border rounded-sm px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-accent-purple"
                >
                    <option value="">All Groups</option>
                    {groups.map((group) => (
                        <option key={group} value={group}>
                            {group}
                        </option>
                    ))}
                </select>

                {groupFilter && (
                    <button
                        onClick={() => {
                            setGroupFilter('')
                            setPage(1)
                        }}
                        className="text-xs text-gray-400 hover:text-white px-2"
                    >
                        Clear filter
                    </button>
                )}
            </div>

            <DataTable
                columns={columns}
                data={filteredAccounts}
                isLoading={isLoading}
                keyExtractor={(account) => account.id}
                emptyMessage="No accounts found"
            />

            {data && data.pagination.total_pages > 1 && !groupFilter && (
                <div className="flex justify-center">
                    <Pagination
                        page={page}
                        totalPages={data.pagination.total_pages}
                        onPageChange={setPage}
                    />
                </div>
            )}
        </div>
    )
}
