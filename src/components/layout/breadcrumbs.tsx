'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Breadcrumbs() {
  const pathname = usePathname()

  const segments = pathname.split('/').filter(Boolean)

  // Don't show breadcrumbs on home page
  if (segments.length === 0) {
    return null
  }

  const breadcrumbs = [
    { name: 'Home', href: '/' },
    ...segments.map((segment, index) => ({
      name: segment.charAt(0).toUpperCase() + segment.slice(1),
      href: '/' + segments.slice(0, index + 1).join('/'),
    })),
  ]

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-400 mb-4 overflow-x-auto">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1

        return (
          <div key={crumb.href} className="flex items-center">
            {index > 0 && (
              <span className="mx-2 text-gray-600">/</span>
            )}
            {isLast ? (
              <span className="text-white font-medium">{crumb.name}</span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-white transition-colors"
              >
                {crumb.name}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
