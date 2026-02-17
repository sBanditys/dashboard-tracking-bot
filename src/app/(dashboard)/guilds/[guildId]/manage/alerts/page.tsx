'use client'

import { use, useState, useEffect, useMemo } from 'react'
import { useInView } from 'react-intersection-observer'
import { Bell } from 'lucide-react'
import { useAlertThresholds, useDeleteThreshold } from '@/hooks/use-alerts'
import { usePersistentState } from '@/hooks/use-persistent-state'
import { ThresholdCard } from '@/components/alerts/threshold-card'
import { ThresholdCardSkeleton } from '@/components/alerts/threshold-card-skeleton'
import { ThresholdFilters } from '@/components/alerts/threshold-filters'
import { ThresholdCreateModal } from '@/components/alerts/threshold-create-modal'
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

  // Data fetching
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useAlertThresholds(guildId, filters)

  const deleteMutation = useDeleteThreshold(guildId)

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

  // Loaded count
  const loadedCount = allThresholds.length
  const totalCount = data?.pages[0]?.pagination.total ?? 0

  // Unique groups across all loaded pages (for filter dropdown and create modal)
  const groups = useMemo(() => {
    const seen = new Set<string>()
    const result: { id: string; label: string }[] = []
    for (const threshold of allThresholds) {
      if (!seen.has(threshold.accountGroupId)) {
        seen.add(threshold.accountGroupId)
        result.push({
          id: threshold.accountGroupId,
          label: threshold.accountGroup.label,
        })
      }
    }
    return result
  }, [allThresholds])

  // Discord channel info (from first threshold)
  const discordChannelId = allThresholds[0]?.accountGroup?.discordChannelId

  // Delete handler
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

  // Clear new threshold animation after it fires
  useEffect(() => {
    if (newThresholdId) {
      const timer = setTimeout(() => setNewThresholdId(null), 500)
      return () => clearTimeout(timer)
    }
  }, [newThresholdId])

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Failed to load alert thresholds</p>
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
          {allThresholds.map((threshold) => (
            <ThresholdCard
              key={threshold.id}
              threshold={threshold}
              guildId={guildId}
              onDelete={setDeletingThreshold}
              isNew={threshold.id === newThresholdId}
              isRemoving={threshold.id === removingId}
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

      {/* Delete confirmation modal */}
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
