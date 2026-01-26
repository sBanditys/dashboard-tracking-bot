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

const platformIcons: Record<string, string> = {
    instagram: '📸',
    tiktok: '🎵',
    youtube: '▶️',
    x: '𝕏',
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
                <span>{platformIcons[account.platform] || '🔗'}</span>
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
