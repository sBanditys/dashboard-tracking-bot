'use client'

import { use, useState, useEffect, useMemo } from 'react'
import { useInView } from 'react-intersection-observer'
import { Bell, RefreshCw } from 'lucide-react'
import {
  useAlertThresholds,
  useDeleteThreshold,
  useBulkToggleThresholds,
  useBulkDeleteThresholds,
} from '@/hooks/use-alerts'
import { useBrands } from '@/hooks/use-tracking'
import { usePersistentState } from '@/hooks/use-persistent-state'
import { useShiftSelection } from '@/hooks/use-selection'
import { ThresholdCard } from '@/components/alerts/threshold-card'
import { ThresholdCardSkeleton } from '@/components/alerts/threshold-card-skeleton'
import { ThresholdFilters } from '@/components/alerts/threshold-filters'
import { ThresholdCreateModal } from '@/components/alerts/threshold-create-modal'
import { ThresholdBulkBar } from '@/components/alerts/threshold-bulk-bar'
import { EmailConfigSection } from '@/components/alerts/email-config-section'
import { AlertSettingsPanel } from '@/components/alerts/alert-settings-panel'
import { TypeToConfirmModal } from '@/components/ui/type-to-confirm-modal'
import { EmptyState } from '@/components/empty-state'
import { cn } from '@/lib/utils'
import type { AlertThreshold, ThresholdFilters as ThresholdFiltersType } from '@/types/alert'

interface PageProps {
  params: Promise<{ guildId: string }>
}

const DEFAULT_FILTERS: ThresholdFiltersType = {}

export default function AlertsPage({ params }: PageProps) {
  const { guildId } = use(params)

  // State
  const [filters, setFilters] = usePersistentState<ThresholdFiltersType>(
    `${guildId}-alerts-filters`,
    DEFAULT_FILTERS
  )
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deletingThreshold, setDeletingThreshold] = useState<AlertThreshold | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [newThresholdId, setNewThresholdId] = useState<string | null>(null)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [bulkActiveAction, setBulkActiveAction] = useState<'enable' | 'disable' | 'delete' | null>(null)

  // Data fetching
  const {
    data,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useAlertThresholds(guildId, filters)

  const deleteMutation = useDeleteThreshold(guildId)
  const bulkToggleMutation = useBulkToggleThresholds(guildId)
  const bulkDeleteMutation = useBulkDeleteThresholds(guildId)

  // Infinite scroll sentinel
  const { ref, inView } = useInView({ threshold: 0, rootMargin: '100px' })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Flatten all thresholds across pages
  const allThresholds = useMemo(
    () => data?.pages.flatMap((p) => p.thresholds) ?? [],
    [data]
  )

  // Multi-select
  const {
    selectedIds,
    handleSelect,
    selectAllVisible,
    clearSelection,
    isAllVisibleSelected,
    selectedCount,
  } = useShiftSelection(allThresholds)

  // Loaded count
  const loadedCount = allThresholds.length
  const totalCount = data?.pages[0]?.pagination.total ?? 0

  // Fetch all account groups from brands (independent of thresholds)
  const { data: brandsData } = useBrands(guildId)

  const groups = useMemo(() => {
    if (!brandsData?.brands) return []
    return brandsData.brands.flatMap((brand) =>
      brand.groups.map((g) => ({ id: g.id, label: g.label }))
    )
  }, [brandsData])

  // Discord channel info (from first threshold)
  const discordChannelId = allThresholds[0]?.accountGroup?.discordChannelId

  // Alert settings for the selected group (when filtering by group)
  const selectedGroupSettings = useMemo(() => {
    if (!filters.groupId) return null
    const threshold = allThresholds.find((t) => t.accountGroupId === filters.groupId)
    return threshold?.accountGroup?.alertSettings ?? null
  }, [allThresholds, filters.groupId])

  // Delete handler (single threshold)
  const handleDeleteConfirm = async () => {
    if (!deletingThreshold) return

    // Start removal animation
    setRemovingId(deletingThreshold.id)
    setDeletingThreshold(null)

    try {
      await deleteMutation.mutateAsync({
        groupId: deletingThreshold.accountGroupId,
        thresholdId: deletingThreshold.id,
      })
    } catch {
      // Error handled by mutation. Reset animation if it fails.
      setRemovingId(null)
    }

    // Clean up animation state after transition
    setTimeout(() => {
      setRemovingId(null)
    }, 300)
  }

  // Bulk enable handler
  const handleBulkEnable = async () => {
    const items = allThresholds
      .filter((t) => selectedIds.has(t.id))
      .map((t) => ({ groupId: t.accountGroupId, thresholdId: t.id, enabled: true }))

    setBulkActiveAction('enable')
    try {
      await bulkToggleMutation.mutateAsync(items)
      clearSelection()
    } finally {
      setBulkActiveAction(null)
    }
  }

  // Bulk disable handler
  const handleBulkDisable = async () => {
    const items = allThresholds
      .filter((t) => selectedIds.has(t.id))
      .map((t) => ({ groupId: t.accountGroupId, thresholdId: t.id, enabled: false }))

    setBulkActiveAction('disable')
    try {
      await bulkToggleMutation.mutateAsync(items)
      clearSelection()
    } finally {
      setBulkActiveAction(null)
    }
  }

  // Bulk delete handler (opens confirmation modal)
  const handleBulkDeleteRequest = () => {
    setShowBulkDeleteModal(true)
  }

  // Bulk delete confirmed
  const handleBulkDeleteConfirm = async () => {
    const items = allThresholds
      .filter((t) => selectedIds.has(t.id))
      .map((t) => ({ groupId: t.accountGroupId, thresholdId: t.id }))

    setBulkActiveAction('delete')
    setShowBulkDeleteModal(false)
    try {
      await bulkDeleteMutation.mutateAsync(items)
      clearSelection()
    } finally {
      setBulkActiveAction(null)
    }
  }

  // Clear new threshold animation after it fires
  useEffect(() => {
    if (newThresholdId) {
      const timer = setTimeout(() => setNewThresholdId(null), 500)
      return () => clearTimeout(timer)
    }
  }, [newThresholdId])

  // Clear selection when filters change
  useEffect(() => {
    clearSelection()
  }, [filters, clearSelection])

  const isBulkLoading = bulkToggleMutation.isPending || bulkDeleteMutation.isPending

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-sm text-red-400">Failed to load alert thresholds</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-surface border border-border text-gray-300 hover:bg-surface-hover transition-colors"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Alert Thresholds</h2>
          {discordChannelId ? (
            <p className="text-sm text-gray-400 mt-1">
              Sending alerts to channel{' '}
              <span className="font-mono text-gray-300">#{discordChannelId}</span>
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">
              No Discord channel configured for alerts.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className={cn(
            'flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            'bg-accent-purple text-white'
          )}
        >
          Create threshold
        </button>
      </header>

      {/* Filters */}
      <ThresholdFilters
        filters={filters}
        onFiltersChange={setFilters}
        groups={groups}
      />

      {/* Alert settings panel — only when filtering by group */}
      {filters.groupId && (
        <AlertSettingsPanel
          guildId={guildId}
          groupId={filters.groupId}
          settings={selectedGroupSettings}
        />
      )}

      {/* Select all visible checkbox */}
      {allThresholds.length > 0 && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="select-all-thresholds"
            checked={isAllVisibleSelected}
            onChange={isAllVisibleSelected ? clearSelection : selectAllVisible}
            className="h-4 w-4 rounded border-border text-accent-purple focus:ring-accent-purple"
            aria-label="Select all visible thresholds"
          />
          <label
            htmlFor="select-all-thresholds"
            className="text-sm text-gray-400 cursor-pointer select-none"
          >
            Select all visible
          </label>
        </div>
      )}

      {/* Loaded count */}
      {!isLoading && data && (
        <p className="text-sm text-gray-500">
          Showing{' '}
          <span className="text-gray-400 font-medium">{loadedCount}</span>
          {totalCount > loadedCount && (
            <> of <span className="text-gray-400 font-medium">{totalCount}</span></>
          )}{' '}
          threshold{totalCount !== 1 ? 's' : ''}
        </p>
      )}

      {/* Loading skeleton — only on initial load */}
      {isLoading && !data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ThresholdCardSkeleton count={6} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && allThresholds.length === 0 && (
        <EmptyState
          icon={<Bell className="w-16 h-16" />}
          title="No alert thresholds yet"
          description="Create your first alert threshold to get notified when metrics exceed a target value."
          action={undefined}
        />
      )}

      {/* Threshold grid */}
      {allThresholds.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {allThresholds.map((threshold, index) => (
            <ThresholdCard
              key={threshold.id}
              threshold={threshold}
              guildId={guildId}
              onDelete={setDeletingThreshold}
              isNew={threshold.id === newThresholdId}
              isRemoving={threshold.id === removingId}
              isSelected={selectedIds.has(threshold.id)}
              onSelect={(id) => handleSelect(id, index, { shiftKey: false } as React.MouseEvent)}
            />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={ref} className="h-1" />

      {/* Loading more */}
      {isFetchingNextPage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ThresholdCardSkeleton count={3} />
        </div>
      )}

      {/* Email config section */}
      <EmailConfigSection guildId={guildId} />

      {/* Bulk action bar (sticky) */}
      <ThresholdBulkBar
        selectedCount={selectedCount}
        onEnableAll={handleBulkEnable}
        onDisableAll={handleBulkDisable}
        onDelete={handleBulkDeleteRequest}
        onSelectAll={selectAllVisible}
        onDeselectAll={clearSelection}
        isAllSelected={isAllVisibleSelected}
        isLoading={isBulkLoading}
        activeAction={bulkActiveAction}
      />

      {/* Delete confirmation modal (single threshold) */}
      <TypeToConfirmModal
        open={deletingThreshold !== null}
        onClose={() => setDeletingThreshold(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Alert Threshold"
        description={
          deletingThreshold ? (
            <>
              This will permanently delete the{' '}
              <strong className="text-white">
                {deletingThreshold.metricType} &gt; {deletingThreshold.thresholdValue.toLocaleString()}
              </strong>{' '}
              threshold for{' '}
              <strong className="text-white">{deletingThreshold.accountGroup.label}</strong>.
              This action cannot be undone.
            </>
          ) : null
        }
        confirmText="delete"
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        variant="danger"
      />

      {/* Bulk delete confirmation modal */}
      <TypeToConfirmModal
        open={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDeleteConfirm}
        title="Delete Selected Thresholds"
        description={
          <>
            This will permanently delete{' '}
            <strong className="text-white">{selectedCount} threshold{selectedCount !== 1 ? 's' : ''}</strong>.
            This action cannot be undone.
          </>
        }
        confirmText="delete"
        confirmLabel="Delete All"
        isLoading={bulkDeleteMutation.isPending}
        variant="danger"
      />

      {/* Create threshold modal */}
      <ThresholdCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        guildId={guildId}
        groups={groups}
        existingThresholds={allThresholds}
      />
    </div>
  )
}
