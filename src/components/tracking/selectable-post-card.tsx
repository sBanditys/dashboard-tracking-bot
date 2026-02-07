'use client'

import { PostCard } from './post-card'
import { cn } from '@/lib/utils'
import type { Post } from '@/types/tracking'

interface SelectablePostCardProps {
  post: Post
  index: number
  selected: boolean
  onSelect: (id: string, index: number, event: React.MouseEvent) => void
}

export function SelectablePostCard({
  post,
  index,
  selected,
  onSelect,
}: SelectablePostCardProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 transition-all',
        selected && 'border-l-2 border-l-accent-purple bg-accent-purple/5 pl-3 -ml-3 rounded-l'
      )}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0 pt-4">
        <label className="relative block cursor-pointer">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(post.url, index, e as unknown as React.MouseEvent)}
            onClick={(e) => onSelect(post.url, index, e)}
            className={cn(
              'appearance-none w-5 h-5 border-2 border-border rounded bg-surface cursor-pointer',
              'checked:bg-accent-purple checked:border-accent-purple',
              'focus:outline-none focus:ring-2 focus:ring-accent-purple focus:ring-offset-2 focus:ring-offset-background',
              'transition-colors'
            )}
          />
          {/* Check icon overlay */}
          {selected && (
            <svg
              className="absolute top-0.5 left-0.5 w-4 h-4 text-white pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </label>
      </div>

      {/* Post Card */}
      <div className="flex-1 min-w-0">
        <PostCard post={post} />
      </div>
    </div>
  )
}
