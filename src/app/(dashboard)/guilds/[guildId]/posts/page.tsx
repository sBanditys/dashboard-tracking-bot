'use client'

import { use, useState, useEffect, useCallback, useMemo } from 'react'
import { useInView } from 'react-intersection-observer'
import type { DateRange } from 'react-day-picker'
import { usePostsInfinite, useBrands, type PostFiltersExtended } from '@/hooks/use-tracking'
import { useShiftSelection } from '@/hooks/use-selection'
import { useBulkDelete } from '@/hooks/use-bulk-operations'
import { usePersistentState } from '@/hooks/use-persistent-state'
import { GuildTabs } from '@/components/guild-tabs'
import {
    FilterBar,
    SearchInput,
    PlatformSelect,
    GroupSelect,
    StatusSelect,
    DateRangePicker,
    PageSizeSelect
} from '@/components/filters'
import { PostCardSkeleton } from '@/components/tracking'
import { SelectablePostCard } from '@/components/tracking/selectable-post-card'
import { SelectionBar } from '@/components/bulk/selection-bar'
import { ExportDropdown } from '@/components/export/export-dropdown'
import { TypeToConfirmModal } from '@/components/ui/type-to-confirm-modal'
import { BulkResultsToast } from '@/components/bulk/bulk-results-toast'
import { EmptyState, NoResults } from '@/components/empty-state'
import { ScrollToTop } from '@/components/scroll-to-top'
import { ScrollToBottom } from '@/components/scroll-to-bottom'
import { downloadCsv } from '@/lib/csv-download'
import type { BulkOperationResult } from '@/types/bulk'

interface PageProps {
    params: Promise<{ guildId: string }>
}

export default function PostsPage({ params }: PageProps) {
    const { guildId } = use(params)

    // Filter state with persistent state
    const [search, setSearch] = usePersistentState(`${guildId}-posts-search`, '')
    const [platform, setPlatform] = usePersistentState(`${guildId}-posts-platform`, '')
    const [group, setGroup] = usePersistentState(`${guildId}-posts-group`, '')
    const [status, setStatus] = usePersistentState(`${guildId}-posts-status`, '')
    const [dateRange, setDateRange] = usePersistentState<DateRange | undefined>(`${guildId}-posts-dateRange`, undefined)
    const [pageSize, setPageSize] = usePersistentState(`${guildId}-posts-pageSize`, 50)

    // Bulk operation state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [bulkResults, setBulkResults] = useState<BulkOperationResult | null>(null)
    const [bulkResultsType, setBulkResultsType] = useState<'deleted' | 'reassigned' | 'exported'>('deleted')

    // Fetch brands to get groups for the filter
    const { data: brandsData, isLoading: brandsLoading } = useBrands(guildId)

    // Extract all groups from brands
    const groups = useMemo(() => {
        if (!brandsData?.brands) return []
        return brandsData.brands.flatMap(brand => brand.groups)
    }, [brandsData])

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
        error,
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

    // Client-side filtering (backend may not support all filters)
    const posts = useMemo(() => {
        const allPosts = data?.pages.flatMap(page => page.posts) ?? []
        return allPosts.filter(post => {
            // Search filter - match author handle, brand, or group
            if (search) {
                const searchLower = search.toLowerCase()
                const matchesAuthor = post.author_handle?.toLowerCase().includes(searchLower)
                const matchesBrand = post.brand?.toLowerCase().includes(searchLower)
                const matchesGroup = post.group?.toLowerCase().includes(searchLower)
                if (!matchesAuthor && !matchesBrand && !matchesGroup) return false
            }
            // Platform filter
            if (platform && post.platform !== platform) return false
            // Group filter
            if (group && post.group !== group) return false
            // Status filter
            if (status && post.status.toLowerCase() !== status.toLowerCase()) return false
            // Date range filter
            if (dateRange?.from) {
                const postDate = new Date(post.posted_at || post.submitted_at || '')
                if (postDate < dateRange.from) return false
                if (dateRange.to && postDate > dateRange.to) return false
            }
            return true
        })
    }, [data, search, platform, group, status, dateRange])

    // Map posts to have `id` field for useShiftSelection (posts use `url` as identifier)
    const postsWithId = useMemo(() => posts.map(p => ({ ...p, id: p.url })), [posts])

    // Calculate loaded count from all pages
    const loadedCount = useMemo(() => {
        return data?.pages.reduce((total, page) => total + page.posts.length, 0) ?? 0
    }, [data])

    // Selection hook
    const {
        selectedIds,
        handleSelect,
        clearSelection,
        selectedCount,
    } = useShiftSelection(postsWithId)

    // Bulk operation mutations
    const bulkDelete = useBulkDelete(guildId)

    // Check if any filters are active
    const hasActiveFilters = search || platform || group || status || dateRange?.from

    // Build active filters record using backend export filter keys
    const activeFiltersRecord = useMemo(() => {
        const record: Record<string, string> = {}
        if (platform) record.platform = platform
        if (group) {
            const matchedGroup = groups.find((g) => g.slug === group)
            if (matchedGroup?.id) {
                record.accountGroupId = matchedGroup.id
            }
        }
        if (dateRange?.from) record.startDate = dateRange.from.toISOString()
        if (dateRange?.to) record.endDate = dateRange.to.toISOString()
        return record
    }, [platform, group, dateRange, groups])

    // Clear all filters
    const handleClearFilters = useCallback(() => {
        setSearch('')
        setPlatform('')
        setGroup('')
        setStatus('')
        setDateRange(undefined)
    }, [setSearch, setPlatform, setGroup, setStatus, setDateRange])

    // Bulk delete handler
    const handleBulkDelete = useCallback(async () => {
        try {
            const result = await bulkDelete.mutateAsync({
                ids: Array.from(selectedIds),
                dataType: 'posts',
            })
            setBulkResultsType('deleted')
            setBulkResults(result)
            clearSelection()
            setShowDeleteConfirm(false)
        } catch {
            // Error handled by mutation
            setShowDeleteConfirm(false)
        }
    }, [bulkDelete, selectedIds, clearSelection])

    // Bulk export handler (exports selected items as CSV matching metrics export columns)
    const handleBulkExport = useCallback(async () => {
        const selectedPosts = posts.filter((post) => selectedIds.has(post.url))
        if (selectedPosts.length === 0) {
            return
        }

        const sortedPosts = [...selectedPosts].sort((a, b) => {
            const aViews = typeof a.metrics?.views === 'number' ? a.metrics.views : -1
            const bViews = typeof b.metrics?.views === 'number' ? b.metrics.views : -1
            return bViews - aViews
        })

        const rows = sortedPosts.map((post) => ({
            Link: post.url,
            Views: post.metrics?.views ?? '',
            'Posted At': post.posted_at ?? post.submitted_at ?? '',
            Likes: post.metrics?.likes ?? '',
            Comments: post.metrics?.comments ?? '',
            Shares: post.metrics?.shares ?? '',
        }))

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        downloadCsv(`export_metrics_selected_${timestamp}.csv`, rows)

        setBulkResultsType('exported')
        setBulkResults({
            total: sortedPosts.length,
            succeeded: sortedPosts.length,
            failed: 0,
            results: sortedPosts.map((post) => ({ id: post.url, status: 'success' as const })),
        })
        clearSelection()
    }, [posts, selectedIds, clearSelection])

    // Auto-dismiss bulk results toast after 8 seconds
    useEffect(() => {
        if (bulkResults) {
            const timer = setTimeout(() => setBulkResults(null), 8000)
            return () => clearTimeout(timer)
        }
    }, [bulkResults])

    if (isError) {
        const errorMessage = error instanceof Error
            ? error.message
            : 'Failed to load posts'
        return (
            <div className="text-center py-12">
                <p className="text-red-400">{errorMessage}</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-white mb-2">Posts</h1>
                <p className="text-gray-400">
                    Submitted posts and their performance
                    {!isLoading && data && <span className="ml-2 text-gray-500">({loadedCount} posts)</span>}
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
                <GroupSelect
                    value={group}
                    onChange={setGroup}
                    groups={groups}
                    isLoading={brandsLoading}
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
                <ExportDropdown
                    guildId={guildId}
                    dataType="posts"
                    activeFilters={activeFiltersRecord}
                />
            </FilterBar>

            {/* Bulk results toast */}
            {bulkResults && (
                <BulkResultsToast
                    results={bulkResults}
                    operationType={bulkResultsType}
                    onDismiss={() => setBulkResults(null)}
                />
            )}

            {/* Loading state - only show skeleton on initial load, not when data exists */}
            {isLoading && !data && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    {posts.map((post, index) => (
                        <SelectablePostCard
                            key={post.url}
                            post={post}
                            index={index}
                            selected={selectedIds.has(post.url)}
                            onSelect={handleSelect}
                        />
                    ))}
                </div>
            )}

            {/* Sentinel for infinite scroll */}
            <div ref={ref} className="h-1" />

            {/* Loading more indicator */}
            {isFetchingNextPage && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    <PostCardSkeleton count={4} />
                </div>
            )}

            <ScrollToTop />
            <ScrollToBottom />

            {/* Selection bar - no reassign for posts */}
            <SelectionBar
                selectedCount={selectedCount}
                dataType="posts"
                onDelete={() => setShowDeleteConfirm(true)}
                onExport={handleBulkExport}
                onClear={clearSelection}
            />

            {/* Bulk delete confirmation modal */}
            <TypeToConfirmModal
                open={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleBulkDelete}
                title={`Delete ${selectedCount} posts`}
                description={`This will move ${selectedCount} post${selectedCount !== 1 ? 's' : ''} to trash. They can be restored within 30 days.`}
                confirmText={selectedCount.toString()}
                confirmLabel="Delete"
                isLoading={bulkDelete.isPending}
                variant="danger"
            />
        </div>
    )
}
