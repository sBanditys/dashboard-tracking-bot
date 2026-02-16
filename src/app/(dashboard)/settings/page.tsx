'use client'

import Link from 'next/link'
import { Monitor } from 'lucide-react'

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                <p className="text-gray-400">
                    Account and application settings
                </p>
            </div>

            <Link
                href="/settings/sessions"
                className="block bg-surface border border-border rounded-sm p-6 hover:border-gray-600 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-gray-400" />
                    <div>
                        <h2 className="text-white font-medium">Active Sessions</h2>
                        <p className="text-sm text-gray-400">
                            View and manage your active sessions across devices
                        </p>
                    </div>
                </div>
            </Link>
        </div>
    )
}
