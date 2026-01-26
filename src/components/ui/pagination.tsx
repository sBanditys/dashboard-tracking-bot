'use client'

import { cn } from '@/lib/utils'
import { Button } from './button'

interface PaginationProps {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
    className?: string
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
    if (totalPages <= 1) return null

    const pages = []
    const showEllipsisStart = page > 3
    const showEllipsisEnd = page < totalPages - 2

    // Always show first page
    pages.push(1)

    if (showEllipsisStart) {
        pages.push('...')
    }

    // Show pages around current
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        if (!pages.includes(i)) {
            pages.push(i)
        }
    }

    if (showEllipsisEnd) {
        pages.push('...')
    }

    // Always show last page
    if (totalPages > 1) {
        pages.push(totalPages)
    }

    return (
        <div className={cn('flex items-center gap-1', className)}>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
            >
                ←
            </Button>

            {pages.map((p, i) =>
                typeof p === 'string' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-gray-500">
                        {p}
                    </span>
                ) : (
                    <Button
                        key={p}
                        variant={p === page ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => onPageChange(p)}
                    >
                        {p}
                    </Button>
                )
            )}

            <Button
                variant="ghost"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
            >
                →
            </Button>
        </div>
    )
}
