'use client'

import { use, useState } from 'react'
import { useAccounts } from '@/hooks/use-tracking'
import { GuildTabs } from '@/components/guild-tabs'
import { DataTable } from '@/components/ui/data-table'
import { Pagination } from '@/components/ui/pagination'
import { cn } from '@/lib/utils'
import type { Account } from '@/types/tracking'

interface PageProps {
    params: Promise<{ guildId: string }>
}

const platformIcons: Record<string, string> = {
    instagram: '📸',
    tiktok: '🎵',
    youtube: '▶️',
    x: '𝕏',
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
            <span className="font-medium text-white">@{account.username}</span>
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
    const { guildId } = use(params)
    const [page, setPage] = useState(1)
    const { data, isLoading, isError } = useAccounts(guildId, page)

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

            <DataTable
                columns={columns}
                data={data?.accounts || []}
                isLoading={isLoading}
                keyExtractor={(account) => account.id}
                emptyMessage="No accounts found"
            />

            {data && data.pagination.total_pages > 1 && (
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
