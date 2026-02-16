'use client'

import { use, useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useInView } from 'react-intersection-observer'
import { useAccountsInfinite, useBrands, type AccountFilters } from '@/hooks/use-tracking'
import { useShiftSelection } from '@/hooks/use-selection'
import { useBulkDelete, useBulkReassign } from '@/hooks/use-bulk-operations'
import { usePersistentState } from '@/hooks/use-persistent-state'
import { GuildTabs } from '@/components/guild-tabs'
import { FilterBar, SearchInput, PlatformSelect, GroupSelect, PageSizeSelect } from '@/components/filters'
import { AccountCardSkeleton } from '@/components/tracking'
import { SelectableAccountCard } from '@/components/tracking/selectable-account-card'
import { SelectionBar } from '@/components/bulk/selection-bar'
import { ExportDropdown } from '@/components/export/export-dropdown'
import { TypeToConfirmModal } from '@/components/ui/type-to-confirm-modal'
import { ReassignModal } from '@/components/bulk/reassign-modal'
import { BulkResultsToast } from '@/components/bulk/bulk-results-toast'
import { EmptyState, NoResults } from '@/components/empty-state'
import { ScrollToTop } from '@/components/scroll-to-top'
import { ScrollToBottom } from '@/components/scroll-to-bottom'
import { AddAccountModal } from '@/components/forms/add-account-modal'
import { downloadCsv } from '@/lib/csv-download'
import type { BulkOperationResult } from '@/types/bulk'

interface PageProps {
    params: Promise<{ guildId: string }>
}

function getProfileUrl(platform: string, username: string): string {
    const handle = username.replace(/^@/, '')
    switch (platform.toLowerCase()) {
        case 'instagram':
            return `https://instagram.com/${handle}`
        case 'tiktok':
            return `https://tiktok.com/@${handle}`
        case 'youtube':
            return `https://youtube.com/@${handle}`
        case 'x':
        case 'twitter':
            return `https://x.com/${handle}`
        default:
            return ''
    }
}

export default function AccountsPage({ params }: PageProps) {
    const { guildId } = use(params)
    const searchParams = useSearchParams()

    // Filter state with persistent state (URL takes precedence for group)
    const [search, setSearch] = usePersistentState(`${guildId}-accounts-search`, '')
    const [platform, setPlatform] = usePersistentState(`${guildId}-accounts-platform`, '')
    const [group, setGroup] = usePersistentState(`${guildId}-accounts-group`, searchParams.get('group') ?? '')
    const [pageSize, setPageSize] = usePersistentState(`${guildId}-accounts-pageSize`, 50)
    const [showAddModal, setShowAddModal] = useState(false)

    // Bulk operation state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showReassignModal, setShowReassignModal] = useState(false)
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

    // Calculate loaded count from all pages
    const loadedCount = useMemo(() => {
        return data?.pages.reduce((total, page) => total + page.accounts.length, 0) ?? 0
    }, [data])

    // Selection hook - accounts already have `id` field
    const {
        selectedIds,
        handleSelect,
        clearSelection,
        selectedCount,
    } = useShiftSelection(accounts)

    // Bulk operation mutations
    const bulkDelete = useBulkDelete(guildId)
    const bulkReassign = useBulkReassign(guildId)

    // Check if any filters are active
    const hasActiveFilters = search || platform || group

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
        return record
    }, [platform, group, groups])

    // Clear all filters
    const handleClearFilters = useCallback(() => {
        setSearch('')
        setPlatform('')
        setGroup('')
    }, [setSearch, setPlatform, setGroup])

    // Bulk delete handler
    const handleBulkDelete = useCallback(async () => {
        try {
            const result = await bulkDelete.mutateAsync({
                ids: Array.from(selectedIds),
                dataType: 'accounts',
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

    // Bulk reassign handler
    const handleBulkReassign = useCallback(async (targetBrandId: string, targetGroupId?: string) => {
        try {
            const result = await bulkReassign.mutateAsync({
                ids: Array.from(selectedIds),
                targetBrandId,
                targetGroupId,
            })
            setBulkResultsType('reassigned')
            setBulkResults(result)
            clearSelection()
            setShowReassignModal(false)
        } catch {
            // Error handled by mutation
            setShowReassignModal(false)
        }
    }, [bulkReassign, selectedIds, clearSelection])

    // Bulk export handler (exports selected items as CSV)
    const handleBulkExport = useCallback(async () => {
        const selectedAccounts = accounts.filter((account) => selectedIds.has(account.id))
        if (selectedAccounts.length === 0) {
            return
        }

        const rows = selectedAccounts.map((account) => ({
            accountId: account.id,
            username: account.username,
            profileUrl: getProfileUrl(account.platform, account.username),
            platform: account.platform,
            brandName: account.brand,
            groupName: account.group ?? '',
            profileHandle: account.username,
            profileVerified: account.is_verified,
            createdAt: account.created_at,
        }))

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        downloadCsv(`export_accounts_selected_${timestamp}.csv`, rows)

        setBulkResultsType('exported')
        setBulkResults({
            total: selectedAccounts.length,
            succeeded: selectedAccounts.length,
            failed: 0,
            results: selectedAccounts.map((account) => ({ id: account.id, status: 'success' as const })),
        })
        clearSelection()
    }, [accounts, selectedIds, clearSelection])

    // Auto-dismiss bulk results toast after 8 seconds
    useEffect(() => {
        if (bulkResults) {
            const timer = setTimeout(() => setBulkResults(null), 8000)
            return () => clearTimeout(timer)
        }
    }, [bulkResults])

    if (isError) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400">Failed to load accounts</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <header className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Accounts</h1>
                    <p className="text-gray-400">
                        All tracked social media accounts
                        {!isLoading && data && <span className="ml-2 text-gray-500">({loadedCount} accounts)</span>}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="bg-accent-purple text-white rounded-lg px-4 py-2 hover:bg-accent-purple/90 transition-colors"
                >
                    Add Account
                </button>
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
                <ExportDropdown
                    guildId={guildId}
                    dataType="accounts"
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
                    {accounts.map((account, index) => (
                        <SelectableAccountCard
                            key={account.id}
                            account={account}
                            guildId={guildId}
                            index={index}
                            selected={selectedIds.has(account.id)}
                            onSelect={handleSelect}
                        />
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
            <ScrollToBottom />

            {/* Selection bar */}
            <SelectionBar
                selectedCount={selectedCount}
                dataType="accounts"
                onDelete={() => setShowDeleteConfirm(true)}
                onExport={handleBulkExport}
                onReassign={() => setShowReassignModal(true)}
                onClear={clearSelection}
            />

            {/* Bulk delete confirmation modal */}
            <TypeToConfirmModal
                open={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleBulkDelete}
                title={`Delete ${selectedCount} accounts`}
                description={`This will move ${selectedCount} account${selectedCount !== 1 ? 's' : ''} to trash. They can be restored within 30 days.`}
                confirmText={selectedCount.toString()}
                confirmLabel="Delete"
                isLoading={bulkDelete.isPending}
                variant="danger"
            />

            {/* Reassign modal */}
            <ReassignModal
                open={showReassignModal}
                onClose={() => setShowReassignModal(false)}
                onConfirm={handleBulkReassign}
                selectedCount={selectedCount}
                guildId={guildId}
                isLoading={bulkReassign.isPending}
            />

            <AddAccountModal
                open={showAddModal}
                onClose={() => setShowAddModal(false)}
                guildId={guildId}
            />
        </div>
    )
}
