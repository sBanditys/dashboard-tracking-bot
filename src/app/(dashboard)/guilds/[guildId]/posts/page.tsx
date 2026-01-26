'use client'

import { useState, useMemo, useCallback } from 'react'
import { usePosts, useBrands } from '@/hooks/use-tracking'
import { GuildTabs } from '@/components/guild-tabs'
import { DataTable } from '@/components/ui/data-table'
import { Pagination } from '@/components/ui/pagination'
import { cn } from '@/lib/utils'
import type { Post, PostFilters } from '@/types/tracking'

interface PageProps {
    params: { guildId: string }
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
    done: 'bg-green-500/10 text-green-400',
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
            post.author_handle ? (
                <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-accent-purple hover:underline"
                >
                    @{post.author_handle}
                </a>
            ) : (
                <span className="text-gray-400">-</span>
            )
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
        key: 'views',
        header: 'Views',
        sortable: true,
        sortKey: 'views',
        render: (post: Post) => (
            <span className="text-gray-300">
                {post.metrics ? formatNumber(post.metrics.views) : '-'}
            </span>
        ),
    },
    {
        key: 'likes',
        header: 'Likes',
        sortable: true,
        sortKey: 'likes',
        render: (post: Post) => (
            <span className="text-gray-300">
                {post.metrics ? formatNumber(post.metrics.likes) : '-'}
            </span>
        ),
    },
    {
        key: 'posted_at',
        header: 'Posted',
        sortable: true,
        sortKey: 'posted_at',
        render: (post: Post) => (
            <span className="text-gray-400 text-xs">
                {post.posted_at
                    ? new Date(post.posted_at).toLocaleString(undefined, {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : '-'}
            </span>
        ),
    },
]

type SortDirection = 'asc' | 'desc' | null

interface SortConfig {
    key: string
    direction: SortDirection
}

export default function PostsPage({ params }: PageProps) {
    const { guildId } = params
    const [page, setPage] = useState(1)
    const [filters, setFilters] = useState<PostFilters>({})
    const [groupFilter, setGroupFilter] = useState<string>('')
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'posted_at', direction: 'desc' })

    // Build filters with sorting
    const filtersWithSort: PostFilters = useMemo(() => ({
        ...filters,
        sort_by: sortConfig.key as 'posted_at' | 'views' | 'likes',
        sort_order: sortConfig.direction || 'desc',
    }), [filters, sortConfig])

    const limit = 25
    const { data, isLoading, isError } = usePosts(guildId, page, limit, filtersWithSort)
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

    // Handle column header click for sorting
    const handleSort = useCallback((key: string) => {
        setSortConfig(prev => {
            if (prev.key === key) {
                // Cycle through: desc -> asc -> back to desc
                if (prev.direction === 'desc') return { key, direction: 'asc' }
                return { key, direction: 'desc' }
            }
            // Default to descending for new sort key
            return { key, direction: 'desc' }
        })
        setPage(1)
    }, [])

    // Filter posts by group (client-side only for group filter)
    const filteredPosts = useMemo(() => {
        let posts = data?.posts || []
        if (groupFilter) {
            posts = posts.filter(post => post.group === groupFilter)
        }
        return posts
    }, [data?.posts, groupFilter])

    const handlePlatformFilter = (platform: string | undefined) => {
        setFilters({ ...filters, platform: platform as PostFilters['platform'] })
        setPage(1)
    }

    const handleStatusFilter = (status: string | undefined) => {
        setFilters({ ...filters, status })
        setPage(1)
    }

    const hasActiveFilters = filters.platform || filters.status || groupFilter ||
        (sortConfig.key !== 'posted_at' || sortConfig.direction !== 'desc')

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
                    <option value="done">Done</option>
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="failed">Failed</option>
                </select>

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

                {hasActiveFilters && (
                    <button
                        onClick={() => {
                            setFilters({})
                            setGroupFilter('')
                            setSortConfig({ key: 'posted_at', direction: 'desc' })
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
                data={filteredPosts}
                isLoading={isLoading}
                keyExtractor={(post) => post.url}
                emptyMessage="No posts found"
                sortConfig={sortConfig}
                onSort={handleSort}
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
