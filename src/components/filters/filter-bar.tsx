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
        'sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 py-4 -mx-4 px-4 border-b border-border',
        className
      )}
    >
      <div className="flex flex-wrap gap-3 items-center">
        {children}
      </div>
    </div>
  )
}
