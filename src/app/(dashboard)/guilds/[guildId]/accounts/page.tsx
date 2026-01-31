'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useInView } from 'react-intersection-observer'
import { useAccountsInfinite, useBrands, type AccountFilters } from '@/hooks/use-tracking'
import { GuildTabs } from '@/components/guild-tabs'
import { FilterBar, SearchInput, PlatformSelect, GroupSelect, PageSizeSelect } from '@/components/filters'
import { AccountCard, AccountCardSkeleton } from '@/components/tracking'
import { EmptyState, NoResults } from '@/components/empty-state'
import { ScrollToTop } from '@/components/scroll-to-top'

interface PageProps {
    params: { guildId: string }
}

export default function AccountsPage({ params }: PageProps) {
    const { guildId } = params

    // Filter state
    const [search, setSearch] = useState('')
    const [platform, setPlatform] = useState('')
    const [group, setGroup] = useState('')
    const [pageSize, setPageSize] = useState(50)

    // Fetch brands to get groups for the filter
    const { data: brandsData, isLoading: brandsLoading } = useBrands(guildId)

    // Extract all groups from brands
    const groups = useMemo(() => {
        if (!brandsData?.brands) return []
        return brandsData.brands.flatMap(brand => brand.groups)
    }, [brandsData])

    // Build filters object
    const filters: AccountFilters = {
        search: search || undefined,
        platform: platform || undefined,
        group: group || undefined,
    }

    // Infinite query
    const {
        data,
        isLoading,
        isError,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
    } = useAccountsInfinite(guildId, pageSize, filters)

    // Intersection observer for infinite scroll
    const { ref, inView } = useInView({ threshold: 0, rootMargin: '100px' })

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

    // Client-side filtering (backend may not support all filters)
    const accounts = useMemo(() => {
        const allAccounts = data?.pages.flatMap(page => page.accounts) ?? []
        return allAccounts.filter(account => {
            // Search filter - match username or brand
            if (search) {
                const searchLower = search.toLowerCase()
                const matchesUsername = account.username.toLowerCase().includes(searchLower)
                const matchesBrand = account.brand?.toLowerCase().includes(searchLower)
                if (!matchesUsername && !matchesBrand) return false
            }
            // Platform filter
            if (platform && account.platform !== platform) return false
            // Group filter
            if (group && account.group !== group) return false
            return true
        })
    }, [data, search, platform, group])

    const totalCount = data?.pages[0]?.pagination.total ?? 0

    // Check if any filters are active
    const hasActiveFilters = search || platform || group

    // Clear all filters
    const handleClearFilters = useCallback(() => {
        setSearch('')
        setPlatform('')
        setGroup('')
    }, [])

    if (isError) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400">Failed to load accounts</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-white mb-2">Accounts</h1>
                <p className="text-gray-400">
                    All tracked social media accounts
                    {!isLoading && <span className="ml-2">({totalCount} total)</span>}
                </p>
            </header>

            <GuildTabs guildId={guildId} />

            <FilterBar>
                <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Search accounts..."
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
                <PageSizeSelect
                    value={pageSize}
                    onChange={setPageSize}
                />
            </FilterBar>

            {/* Loading state */}
            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                    <AccountCardSkeleton count={6} />
                </div>
            )}

            {/* Empty state - no accounts at all */}
            {!isLoading && accounts.length === 0 && !hasActiveFilters && (
                <EmptyState
                    icon={
                        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    }
                    title="No accounts yet"
                    description="Start tracking social media accounts to see them here. Accounts are added through the Discord bot."
                    action={{
                        label: "Learn how to add accounts",
                        href: "/docs/accounts"
                    }}
                />
            )}

            {/* No results - filters matched nothing */}
            {!isLoading && accounts.length === 0 && hasActiveFilters && (
                <NoResults
                    query={search || platform}
                    onClear={handleClearFilters}
                />
            )}

            {/* Accounts grid */}
            {!isLoading && accounts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                    {accounts.map(account => (
                        <AccountCard key={account.id} account={account} />
                    ))}
                </div>
            )}

            {/* Sentinel for infinite scroll */}
            <div ref={ref} className="h-1" />

            {/* Loading more indicator */}
            {isFetchingNextPage && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                    <AccountCardSkeleton count={3} />
                </div>
            )}

            <ScrollToTop />
        </div>
    )
}
