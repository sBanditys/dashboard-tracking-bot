'use client'

import { Skeleton } from '@/components/ui/skeleton'

interface CounterCardSkeletonProps {
  count?: number
}

export function CounterCardSkeleton({ count = 1 }: CounterCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-surface border border-border rounded-sm p-4"
        >
          {/* Label skeleton */}
          <Skeleton className="h-4 w-32 mb-2" />

          {/* Value skeleton */}
          <Skeleton className="h-8 w-24 mb-1" />

          {/* Trend skeleton */}
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </>
  )
}
