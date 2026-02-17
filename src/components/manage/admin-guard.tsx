'use client'

import Link from 'next/link'
import { ShieldX } from 'lucide-react'

interface AdminForbiddenProps {
    guildId: string
}

/**
 * 403 forbidden page rendered for non-admin users accessing /manage routes
 */
export function AdminForbidden({ guildId }: AdminForbiddenProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-6 py-12 text-center">
            <ShieldX className="w-16 h-16 text-gray-500 mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400 mb-8 max-w-md">
                You don&apos;t have permission to access this page. Administrator privileges are
                required to manage alerts and data settings.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
                <Link
                    href={`/guilds/${guildId}`}
                    className="px-4 py-2 rounded-sm bg-accent-purple text-white text-sm font-medium hover:bg-accent-purple/80 transition-colors"
                >
                    Go back to guild
                </Link>
                <Link
                    href="/guilds"
                    className="px-4 py-2 rounded-sm border border-border text-gray-300 text-sm font-medium hover:bg-surface/50 hover:text-white transition-colors"
                >
                    Go to guilds list
                </Link>
            </div>
        </div>
    )
}
