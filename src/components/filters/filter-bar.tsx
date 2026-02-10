'use client'

import { cn } from '@/lib/utils'

interface FilterBarProps {
  children: React.ReactNode
  className?: string
}

/**
 * Sticky filter bar container with backdrop blur.
 * Stays visible at the top of the viewport when scrolling through content.
 */
export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-20 py-4 -mx-4 px-4 border-b border-border',
        'bg-background/60 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      <div className="flex flex-wrap gap-3 items-center relative z-10">
        {children}
      </div>
    </div>
  )
}
