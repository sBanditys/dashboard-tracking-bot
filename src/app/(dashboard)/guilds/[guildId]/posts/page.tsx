'use client'

import { use, useState } from 'react'
import { usePosts } from '@/hooks/use-tracking'
import { GuildTabs } from '@/components/guild-tabs'
import { DataTable } from '@/components/ui/data-table'
import { Pagination } from '@/components/ui/pagination'
import { cn } from '@/lib/utils'
import type { Post, PostFilters } from '@/types/tracking'

interface PageProps {
    params: Promise<{ guildId: string }>
}

const platformIcons: Record<string, string> = {
    instagram: '📸',
    tiktok: '🎵',
    youtube: '▶️',
    x: '𝕏',
}

const statusColors: Record<string, string> = {
    verified: 'bg-green-500/10 text-green-400',
    pending: 'bg-yellow-500/10 text-yellow-400',
    failed: 'bg-red-500/10 text-red-400',
    processing: 'bg-blue-500/10 text-blue-400',
}

function formatNumber(num: number | null): string {
    if (num === null) return '-'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
}

const columns = [
    {
        key: 'platform',
        header: 'Platform',
        render: (post: Post) => (
            <span className="flex items-center gap-2">
                <span>{platformIcons[post.platform] || '🔗'}</span>
            </span>
        ),
        className: 'w-16',
    },
    {
        key: 'author_handle',
        header: 'Author',
        render: (post: Post) => (
            <span className="font-medium text-white">
                {post.author_handle ? `@${post.author_handle}` : '-'}
            </span>
        ),
    },
    {
        key: 'brand',
        header: 'Brand',
        render: (post: Post) => (
            <span className="text-gray-300">{post.brand || '-'}</span>
        ),
    },
    {
        key: 'status',
        header: 'Status',
        render: (post: Post) => (
            <span
                className={cn(
                    'inline-flex px-2 py-0.5 rounded text-xs capitalize',
                    statusColors[post.status] || 'bg-gray-500/10 text-gray-400'
                )}
            >
                {post.status}
            </span>
        ),
    },
    {
        key: 'metrics',
        header: 'Views',
        render: (post: Post) => (
            <span className="text-gray-300">
                {post.metrics ? formatNumber(post.metrics.views) : '-'}
            </span>
        ),
    },
    {
        key: 'likes',
        header: 'Likes',
        render: (post: Post) => (
            <span className="text-gray-300">
                {post.metrics ? formatNumber(post.metrics.likes) : '-'}
            </span>
        ),
    },
    {
        key: 'submitted_at',
        header: 'Submitted',
        render: (post: Post) => (
            <span className="text-gray-400 text-xs">
                {post.submitted_at
                    ? new Date(post.submitted_at).toLocaleDateString()
                    : '-'}
            </span>
        ),
    },
]

export default function PostsPage({ params }: PageProps) {
    const { guildId } = use(params)
    const [page, setPage] = useState(1)
    const [filters, setFilters] = useState<PostFilters>({})
    const { data, isLoading, isError } = usePosts(guildId, page, 25, filters)

    const handlePlatformFilter = (platform: string | undefined) => {
        setFilters({ ...filters, platform: platform as PostFilters['platform'] })
        setPage(1)
    }

    const handleStatusFilter = (status: string | undefined) => {
        setFilters({ ...filters, status })
        setPage(1)
    }

    if (isError) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400">Failed to load posts</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Posts</h1>
                <p className="text-gray-400">
                    Submitted posts and their performance
                    {data && <span className="ml-2">({data.pagination.total} total)</span>}
                </p>
            </div>

            <GuildTabs guildId={guildId} />

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <select
                    value={filters.platform || ''}
                    onChange={(e) => handlePlatformFilter(e.target.value || undefined)}
                    className="bg-surface border border-border rounded-sm px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-accent-purple"
                >
                    <option value="">All Platforms</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="x">X</option>
                </select>

                <select
                    value={filters.status || ''}
                    onChange={(e) => handleStatusFilter(e.target.value || undefined)}
                    className="bg-surface border border-border rounded-sm px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-accent-purple"
                >
                    <option value="">All Statuses</option>
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="failed">Failed</option>
                </select>

                {(filters.platform || filters.status) && (
                    <button
                        onClick={() => {
                            setFilters({})
                            setPage(1)
                        }}
                        className="text-xs text-gray-400 hover:text-white px-2"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            <DataTable
                columns={columns}
                data={data?.posts || []}
                isLoading={isLoading}
                keyExtractor={(post) => post.url}
                emptyMessage="No posts found"
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
