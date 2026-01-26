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
    const iconClass = "text-gray-400"

    switch (platform) {
        case 'instagram':
            return <span className="text-pink-500"><InstagramIcon /></span>
        case 'tiktok':
            return <span className={iconClass}><TikTokIcon /></span>
        case 'youtube':
            return <span className="text-red-500"><YouTubeIcon /></span>
        case 'x':
            return <span className={iconClass}><XIcon /></span>
        default:
            return <span className={iconClass}>🔗</span>
    }
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
            <span className="flex items-center justify-center">
                <PlatformIcon platform={post.platform} />
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
