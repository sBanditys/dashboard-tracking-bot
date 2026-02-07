/**
 * useShiftSelection - Generic hook for handling multi-select with shift-click range selection
 */

import { useState, useCallback, useMemo } from 'react'

export function useShiftSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

  const handleSelect = useCallback(
    (id: string, index: number, event: React.MouseEvent) => {
      if (event.shiftKey && lastSelectedId !== null) {
        // Find current index of lastSelectedId in items array
        const lastIndex = items.findIndex((item) => item.id === lastSelectedId)

        // If lastSelectedId is no longer in items (filtered out), treat as regular click
        if (lastIndex === -1) {
          setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
              next.delete(id)
            } else {
              next.add(id)
            }
            return next
          })
          setLastSelectedId(id)
          return
        }

        // Select range between lastIndex and clicked index
        const start = Math.min(lastIndex, index)
        const end = Math.max(lastIndex, index)
        const rangeIds = items.slice(start, end + 1).map((item) => item.id)

        setSelectedIds((prev) => {
          const next = new Set(prev)
          rangeIds.forEach((rangeId) => next.add(rangeId))
          return next
        })
      } else {
        // Regular click: toggle single item
        setSelectedIds((prev) => {
          const next = new Set(prev)
          if (next.has(id)) {
            next.delete(id)
          } else {
            next.add(id)
          }
          return next
        })
        setLastSelectedId(id)
      }
    },
    [items, lastSelectedId]
  )

  const selectAllVisible = useCallback(() => {
    setSelectedIds(new Set(items.map((item) => item.id)))
  }, [items])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }, [])

  const isAllVisibleSelected = useMemo(() => {
    if (items.length === 0) return false
    return items.every((item) => selectedIds.has(item.id))
  }, [items, selectedIds])

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds])

  return {
    selectedIds,
    handleSelect,
    selectAllVisible,
    clearSelection,
    isAllVisibleSelected,
    selectedCount,
  }
}
