'use client'

import { useState, useEffect, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import type { DateRange } from 'react-day-picker'
import { usePostsInfinite, type PostFiltersExtended } from '@/hooks/use-tracking'
import { GuildTabs } from '@/components/guild-tabs'
import {
    FilterBar,
    SearchInput,
    PlatformSelect,
    StatusSelect,
    DateRangePicker,
    PageSizeSelect
} from '@/components/filters'
import { PostCard, PostCardSkeleton } from '@/components/tracking'
import { EmptyState, NoResults } from '@/components/empty-state'
import { ScrollToTop } from '@/components/scroll-to-top'

interface PageProps {
    params: { guildId: string }
}

export default function PostsPage({ params }: PageProps) {
    const { guildId } = params

    // Filter state
    const [search, setSearch] = useState('')
    const [platform, setPlatform] = useState('')
    const [status, setStatus] = useState('')
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
    const [pageSize, setPageSize] = useState(50)

    // Build filters object
    const filters: PostFiltersExtended = {
        search: search || undefined,
        platform: (platform || undefined) as PostFiltersExtended['platform'],
        status: status || undefined,
        from: dateRange?.from?.toISOString(),
        to: dateRange?.to?.toISOString(),
    }

    // Infinite query
    const {
        data,
        isLoading,
        isError,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
    } = usePostsInfinite(guildId, pageSize, filters)

    // Intersection observer for infinite scroll
    const { ref, inView } = useInView({ threshold: 0, rootMargin: '100px' })

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

    // Flatten paginated data
    const posts = data?.pages.flatMap(page => page.posts) ?? []
    const totalCount = data?.pages[0]?.pagination.total ?? 0

    // Check if any filters are active
    const hasActiveFilters = search || platform || status || dateRange?.from

    // Clear all filters
    const handleClearFilters = useCallback(() => {
        setSearch('')
        setPlatform('')
        setStatus('')
        setDateRange(undefined)
    }, [])

    if (isError) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400">Failed to load posts</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-white mb-2">Posts</h1>
                <p className="text-gray-400">
                    Submitted posts and their performance
                    {!isLoading && <span className="ml-2">({totalCount} total)</span>}
                </p>
            </header>

            <GuildTabs guildId={guildId} />

            <FilterBar>
                <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Search posts..."
                />
                <PlatformSelect
                    value={platform}
                    onChange={setPlatform}
                />
                <StatusSelect
                    value={status}
                    onChange={setStatus}
                />
                <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                />
                <PageSizeSelect
                    value={pageSize}
                    onChange={setPageSize}
                />
            </FilterBar>

            {/* Loading state */}
            {isLoading && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <PostCardSkeleton count={6} />
                </div>
            )}

            {/* Empty state - no posts at all */}
            {!isLoading && posts.length === 0 && !hasActiveFilters && (
                <EmptyState
                    icon={
                        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                    }
                    title="No posts yet"
                    description="Posts will appear here once accounts start submitting content. Track accounts first to see their posts."
                    action={{
                        label: "Learn how to track posts",
                        href: "/docs/posts"
                    }}
                />
            )}

            {/* No results - filters matched nothing */}
            {!isLoading && posts.length === 0 && hasActiveFilters && (
                <NoResults
                    query={search || platform || status || 'selected dates'}
                    onClear={handleClearFilters}
                />
            )}

            {/* Posts grid */}
            {!isLoading && posts.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {posts.map(post => (
                        <PostCard key={post.url} post={post} />
                    ))}
                </div>
            )}

            {/* Sentinel for infinite scroll */}
            <div ref={ref} className="h-1" />

            {/* Loading more indicator */}
            {isFetchingNextPage && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <PostCardSkeleton count={4} />
                </div>
            )}

            <ScrollToTop />
        </div>
    )
}
