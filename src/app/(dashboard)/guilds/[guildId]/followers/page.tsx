'use client'

import { useState, useRef, useLayoutEffect } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useQueries } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { useBrands } from '@/hooks/use-tracking'
import { useAccountsInfinite } from '@/hooks/use-tracking'
import { useFollowerScrape } from '@/hooks/use-followers'
import { GroupCard } from '@/components/followers/group-card'
import { GroupCardSkeleton } from '@/components/followers/group-card-skeleton'
import { AccountCardSkeleton } from '@/components/followers/account-card-skeleton'
import type { AccountFollowerData, GroupFollowerStats, FollowerSnapshotsResponse } from '@/types/followers'
import type { Brand, AccountGroup } from '@/types/tracking'

// Dynamically import AccountCard to avoid SSR issues with Recharts (used inside sparkline)
const AccountCard = dynamic(
  () => import('@/components/followers/account-card').then((mod) => mod.AccountCard),
  { ssr: false, loading: () => <AccountCardSkeleton count={1} /> }
)

interface FlatGroup {
  id: string
  label: string
  brandLabel: string
  brandId: string
  isMain: boolean
}

function extractGroups(brands: Brand[]): FlatGroup[] {
  const groups: FlatGroup[] = []
  for (const brand of brands) {
    for (const group of brand.groups ?? []) {
      groups.push({
        id: group.id,
        label: group.label,
        brandLabel: brand.label,
        brandId: brand.id,
        isMain: group.isMain ?? false,
      })
    }
  }
  return groups
}

// Sort accounts: data accounts by follower count desc, then pending by created_at asc
function sortAccounts(accounts: AccountFollowerData[]): AccountFollowerData[] {
  const withData = accounts
    .filter((a) => a.followerCount !== null)
    .sort((a, b) => (b.followerCount ?? 0) - (a.followerCount ?? 0))
  const pending = accounts
    .filter((a) => a.followerCount === null)
    .sort((a, b) => {
      const dateA = a.trackingSince ?? a.created_at
      const dateB = b.trackingSince ?? b.created_at
      return dateA.localeCompare(dateB)
    })
  return [...withData, ...pending]
}

export default function FollowersPage() {
  const params = useParams()
  const guildId = params.guildId as string

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const scrollPositionRef = useRef<number>(0)

  // Restore scroll position when returning to group overview, scroll to top when entering detail
  // The scrollable container is <main> (overflow-auto in dashboard layout), not the window
  useLayoutEffect(() => {
    const main = document.querySelector('main')
    if (!main) return
    if (selectedGroupId === null && scrollPositionRef.current > 0) {
      main.scrollTo(0, scrollPositionRef.current)
    } else if (selectedGroupId !== null) {
      main.scrollTo(0, 0)
    }
  }, [selectedGroupId])

  // Fetch brands (for group metadata)
  const { data: brandsData, isLoading: brandsLoading } = useBrands(guildId)

  // Fetch all accounts (includes follower fields from Phase 54)
  const { data: accountsData, isLoading: accountsLoading } = useAccountsInfinite(guildId, 100)

  // Flatten all pages of accounts — cast to AccountFollowerData since Phase 54 added follower fields
  const allAccounts: AccountFollowerData[] = (accountsData?.pages ?? []).flatMap(
    (page) => page.accounts as AccountFollowerData[]
  )

  // Flatten groups from all brands
  const groups: FlatGroup[] = extractGroups(brandsData?.brands ?? [])

  // Find selected group metadata
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null

  // Fetch group follower stats for all groups in parallel
  const groupStatsQueries = useQueries({
    queries: groups.map((group) => ({
      queryKey: ['guild', guildId, 'followers', 'group', group.id],
      queryFn: async () => {
        const response = await fetchWithRetry(
          `/api/guilds/${guildId}/followers?groupId=${group.id}`
        )
        if (!response.ok) throw new Error('Failed to fetch group stats')
        return response.json() as Promise<GroupFollowerStats>
      },
      staleTime: 2 * 60 * 1000,
      enabled: !!guildId && !!group.id,
    })),
  })

  // Build a map: groupId -> stats
  const groupStatsMap = new Map<string, GroupFollowerStats | null>(
    groups.map((group, i) => [group.id, groupStatsQueries[i]?.data ?? null])
  )

  // Get accounts for selected group
  const selectedGroupAccounts: AccountFollowerData[] = selectedGroup
    ? sortAccounts(
        allAccounts.filter(
          (a) =>
            a.group === selectedGroup.label &&
            // brand match — account brand label should match group's brand label
            a.brand === selectedGroup.brandLabel
        )
      )
    : []

  // Fetch snapshots for all accounts in selected group (7 per account)
  const snapshotQueries = useQueries({
    queries: selectedGroupAccounts.map((account) => ({
      queryKey: ['guild', guildId, 'followers', 'snapshots', account.id, 7],
      queryFn: async () => {
        const response = await fetchWithRetry(
          `/api/guilds/${guildId}/followers/${account.id}/snapshots?limit=7`
        )
        if (!response.ok) throw new Error('Failed to fetch snapshots')
        return response.json() as Promise<FollowerSnapshotsResponse>
      },
      staleTime: 5 * 60 * 1000,
      enabled: !!guildId && !!account.id && selectedGroupId !== null,
    })),
  })

  // Build a map: accountId -> snapshots
  const snapshotsMap = new Map(
    selectedGroupAccounts.map((account, i) => [
      account.id,
      snapshotQueries[i]?.data?.items ?? [],
    ])
  )

  // Scrape mutation
  const { mutate: scrapeAccount, isPending: isScraping, variables: scrapingAccountId } =
    useFollowerScrape(guildId)

  const isLoading = brandsLoading || accountsLoading

  // --- Compute overall totals from account-level data ---
  const totalFollowers = allAccounts.reduce((sum, a) => sum + (a.followerCount ?? 0), 0)
  const totalGrowth7d = allAccounts.reduce((sum, a) => sum + (a.growth7d?.delta ?? 0), 0)
  const totalGrowth7dPercent = totalFollowers > 0
    ? (totalGrowth7d / (totalFollowers - totalGrowth7d)) * 100
    : 0
  const totalPostsTracked = allAccounts.reduce((sum, a) => sum + (a.postStats?.total ?? 0), 0)
  const totalPlatformPosts = allAccounts.reduce((sum, a) => sum + (a.platformPostCount ?? 0), 0)
  const accountsWithData = allAccounts.filter((a) => a.followerCount !== null).length

  // --- Group overview view ---
  if (selectedGroupId === null) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Followers</h1>

        {/* Overall summary banner */}
        {!isLoading && allAccounts.length > 0 && (
          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div>
                <p className="text-2xl font-bold text-white">{totalFollowers.toLocaleString('en-US')}</p>
                <p className="text-xs text-gray-400 mt-0.5">total followers</p>
              </div>
              <div>
                <p
                  className="text-2xl font-bold"
                  style={{ color: totalGrowth7d > 0 ? '#22c55e' : totalGrowth7d < 0 ? '#ef4444' : 'var(--text-primary)' }}
                >
                  {totalGrowth7d > 0 ? '+' : ''}{totalGrowth7d.toLocaleString('en-US')}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  7d growth{totalGrowth7dPercent !== 0 && ` (${totalGrowth7d > 0 ? '+' : ''}${totalGrowth7dPercent.toFixed(1)}%)`}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalPlatformPosts.toLocaleString('en-US')}</p>
                <p className="text-xs text-gray-400 mt-0.5">platform posts</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalPostsTracked.toLocaleString('en-US')}</p>
                <p className="text-xs text-gray-400 mt-0.5">posts tracked</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{allAccounts.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  accounts ({accountsWithData} with data)
                </p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <GroupCardSkeleton count={6} />
          </div>
        ) : groups.length === 0 ? (
          <p className="text-gray-400">No groups found. Create account groups to track followers.</p>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[...groups].sort((a, b) => {
              if (a.isMain && !b.isMain) return -1
              if (!a.isMain && b.isMain) return 1
              return 0
            }).map((group) => {
              const stats = groupStatsMap.get(group.id) ?? null
              const groupAccounts = allAccounts.filter(
                (a) => a.group === group.label && a.brand === group.brandLabel
              )
              return (
                <GroupCard
                  key={group.id}
                  group={group}
                  stats={stats}
                  accounts={groupAccounts}
                  onClick={() => {
                    const main = document.querySelector('main')
                    scrollPositionRef.current = main?.scrollTop ?? 0
                    setSelectedGroupId(group.id)
                  }}
                />
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // --- Group detail view ---
  const selectedStats = groupStatsMap.get(selectedGroupId) ?? null

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => setSelectedGroupId(null)}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to groups
      </button>

      {/* Group summary header */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{selectedGroup?.label}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{selectedGroup?.brandLabel}</p>
          </div>
          {selectedStats && (
            <div className="text-right">
              <p className="text-2xl font-bold text-white">
                {selectedStats.totalFollowers.toLocaleString('en-US')}
              </p>
              <p className="text-xs text-gray-400">total followers</p>
            </div>
          )}
        </div>

        {selectedStats && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {selectedStats.growth7d && (
              <div>
                <span className="text-gray-400 mr-1">7d:</span>
                <span
                  style={{
                    color:
                      selectedStats.growth7d.delta > 0
                        ? '#22c55e'
                        : selectedStats.growth7d.delta < 0
                        ? '#ef4444'
                        : '#6b7280',
                  }}
                >
                  {selectedStats.growth7d.delta > 0 ? '+' : ''}
                  {selectedStats.growth7d.delta.toLocaleString('en-US')} (
                  {selectedStats.growth7d.delta > 0 ? '+' : ''}
                  {selectedStats.growth7d.percent.toFixed(1)}%)
                </span>
              </div>
            )}
            {selectedStats.growth30d && (
              <div>
                <span className="text-gray-400 mr-1">30d:</span>
                <span
                  style={{
                    color:
                      selectedStats.growth30d.delta > 0
                        ? '#22c55e'
                        : selectedStats.growth30d.delta < 0
                        ? '#ef4444'
                        : '#6b7280',
                  }}
                >
                  {selectedStats.growth30d.delta > 0 ? '+' : ''}
                  {selectedStats.growth30d.delta.toLocaleString('en-US')} (
                  {selectedStats.growth30d.delta > 0 ? '+' : ''}
                  {selectedStats.growth30d.percent.toFixed(1)}%)
                </span>
              </div>
            )}
            <span className="text-gray-400">
              {selectedStats.accountsWithData} of {selectedStats.accountCount} accounts with data
            </span>
          </div>
        )}
      </div>

      {/* Account cards */}
      {accountsLoading ? (
        <AccountCardSkeleton count={4} />
      ) : selectedGroupAccounts.length === 0 ? (
        <p className="text-gray-400">No accounts in this group.</p>
      ) : (() => {
        const mainAccounts = selectedGroupAccounts.filter((a) => a.isMain ?? false)
        const sideAccounts = selectedGroupAccounts.filter((a) => !(a.isMain ?? false))

        if (mainAccounts.length === 0) {
          // No main accounts — render flat grid (unchanged layout)
          return (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {selectedGroupAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  snapshots={snapshotsMap.get(account.id)}
                  onRefresh={(accountId) => scrapeAccount(accountId)}
                  isRefreshing={isScraping && scrapingAccountId === account.id}
                />
              ))}
            </div>
          )
        }

        return (
          <div className="space-y-4">
            {/* Main accounts section */}
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">⭐ Main Accounts</p>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {mainAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  snapshots={snapshotsMap.get(account.id)}
                  onRefresh={(accountId) => scrapeAccount(accountId)}
                  isRefreshing={isScraping && scrapingAccountId === account.id}
                />
              ))}
            </div>

            {/* Divider (only if both sections exist) */}
            {sideAccounts.length > 0 && <hr className="border-border" />}

            {/* Side accounts section */}
            {sideAccounts.length > 0 && (
              <>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Side Accounts</p>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {sideAccounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      snapshots={snapshotsMap.get(account.id)}
                      onRefresh={(accountId) => scrapeAccount(accountId)}
                      isRefreshing={isScraping && scrapingAccountId === account.id}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )
      })()}
    </div>
  )
}
