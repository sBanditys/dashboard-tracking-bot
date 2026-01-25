import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  shape?: 'line' | 'circle' | 'rect'
}

export function Skeleton({ className, shape = 'line', ...props }: SkeletonProps) {
  const baseStyles = 'animate-pulse bg-surface/50 dark:bg-surface/50'

  const shapes = {
    line: 'h-4 w-full rounded-sm',
    circle: 'rounded-full',
    rect: 'rounded-sm',
  }

  return (
    <div
      className={cn(baseStyles, shapes[shape], className)}
      {...props}
    />
  )
}
