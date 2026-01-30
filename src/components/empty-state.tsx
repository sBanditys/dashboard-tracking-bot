import Link from 'next/link'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
}

/**
 * Full empty state component for when a list has no data at all.
 * Displays a large icon, title, description, and optional CTA button.
 *
 * @example
 * <EmptyState
 *   icon={<UsersIcon className="w-16 h-16" />}
 *   title="No accounts yet"
 *   description="Start tracking social media accounts to see them here."
 *   action={{ label: 'Learn how to add accounts', href: '/docs/accounts' }}
 * />
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 mb-4 text-gray-500 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-gray-400 max-w-md mb-6">{description}</p>
      {action && (
        <Link
          href={action.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/90 transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}

interface NoResultsProps {
  query: string
  onClear: () => void
}

/**
 * Compact empty state for when a filter/search returns no matches.
 * Shows the search query and a button to clear filters.
 *
 * @example
 * <NoResults
 *   query={searchQuery}
 *   onClear={() => setSearchQuery('')}
 * />
 */
export function NoResults({ query, onClear }: NoResultsProps) {
  return (
    <div className="text-center py-8">
      <p className="text-gray-400">
        No results for &quot;{query}&quot;
      </p>
      <button
        onClick={onClear}
        className="text-accent-purple hover:underline mt-2 text-sm"
      >
        Clear filters
      </button>
    </div>
  )
}
