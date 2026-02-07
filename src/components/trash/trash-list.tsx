'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { TypeToConfirmModal } from '@/components/ui/type-to-confirm-modal'
import { TrashItemCard } from '@/components/trash/trash-item-card'
import { useTrashItems, useRestoreItem, usePermanentDelete } from '@/hooks/use-trash'

interface TrashListProps {
  guildId: string
}

type TabType = 'accounts' | 'posts'

const tabs: { label: string; value: TabType }[] = [
  { label: 'Accounts', value: 'accounts' },
  { label: 'Posts', value: 'posts' },
]

function TrashItemSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-surface border border-border rounded-lg p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="w-5 h-5 rounded" shape="rect" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-14 rounded" shape="rect" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20 rounded-md" shape="rect" />
              <Skeleton className="h-8 w-32 rounded-md" shape="rect" />
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

export function TrashList({ guildId }: TrashListProps) {
  const [activeTab, setActiveTab] = useState<TabType>('accounts')
  const [itemToDelete, setItemToDelete] = useState<{
    id: string
    name: string
    dataType: 'accounts' | 'posts'
  } | null>(null)

  const { data, isLoading } = useTrashItems(guildId, activeTab)
  const restoreMutation = useRestoreItem(guildId)
  const permanentDeleteMutation = usePermanentDelete(guildId)

  const [restoringId, setRestoringId] = useState<string | null>(null)

  const handleRestore = async (itemId: string, dataType: 'accounts' | 'posts') => {
    setRestoringId(itemId)
    try {
      await restoreMutation.mutateAsync({ itemId, dataType })
    } finally {
      setRestoringId(null)
    }
  }

  const handlePermanentDelete = (itemId: string, dataType: 'accounts' | 'posts') => {
    const item = data?.items.find((i) => i.id === itemId)
    if (item) {
      setItemToDelete({ id: itemId, name: item.name, dataType })
    }
  }

  const confirmPermanentDelete = async () => {
    if (!itemToDelete) return
    try {
      await permanentDeleteMutation.mutateAsync({
        itemId: itemToDelete.id,
        dataType: itemToDelete.dataType,
      })
      setItemToDelete(null)
    } catch {
      // Error handled by mutation
    }
  }

  const items = data?.items ?? []
  const isEmpty = !isLoading && items.length === 0

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="bg-surface border border-border rounded-lg p-1 inline-flex">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              activeTab === tab.value
                ? 'bg-accent-purple text-white'
                : 'text-gray-400 hover:text-white'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Items list */}
      <div className="space-y-2">
        {isLoading && <TrashItemSkeleton count={3} />}

        {isEmpty && (
          <div className="bg-surface border border-border rounded-lg p-8 text-center">
            <p className="text-gray-400">
              No deleted {activeTab === 'accounts' ? 'accounts' : 'posts'}. Items you delete will appear here for 30 days before being permanently removed.
            </p>
          </div>
        )}

        {!isLoading &&
          items.map((item) => (
            <TrashItemCard
              key={item.id}
              item={item}
              onRestore={handleRestore}
              onPermanentDelete={handlePermanentDelete}
              isRestoring={restoringId === item.id}
              isDeleting={permanentDeleteMutation.isPending && itemToDelete?.id === item.id}
            />
          ))}
      </div>

      {/* Permanent delete confirmation modal */}
      <TypeToConfirmModal
        open={itemToDelete !== null}
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmPermanentDelete}
        title={`Permanently delete ${itemToDelete?.name ?? 'item'}?`}
        description="This action cannot be undone. The item will be permanently removed."
        confirmText="DELETE"
        confirmLabel="Delete permanently"
        isLoading={permanentDeleteMutation.isPending}
        variant="danger"
      />
    </div>
  )
}
