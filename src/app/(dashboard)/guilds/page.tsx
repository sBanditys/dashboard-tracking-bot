'use client'

import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import { useGuilds } from '@/hooks/use-guilds'
import { Skeleton } from '@/components/ui/skeleton'

export default function GuildsPage() {
    const { data, isLoading, isError, refetch } = useGuilds()

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
                <p className="text-sm text-red-400">Failed to load guilds</p>
                <button
                    type="button"
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-surface border border-border text-gray-300 hover:bg-surface-hover transition-colors"
                >
                    <RefreshCw size={14} />
                    Try again
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Your Guilds</h1>
                <p className="text-gray-400">
                    Select a guild to view tracking data and manage settings
                </p>
            </div>

            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-40 rounded-sm" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {data?.guilds.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 px-4">
                            <svg
                                className="w-16 h-16 text-gray-600 mb-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                            </svg>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                You don&apos;t have access to any servers
                            </h3>
                            <p className="text-gray-400 text-center max-w-md">
                                Ask a server admin to grant you access, or make sure you have the correct permissions on Discord.
                            </p>
                        </div>
                    ) : (
                        data?.guilds.map((guild) => (
                            <Link
                                key={guild.id}
                                href={`/guilds/${guild.id}`}
                                className="bg-surface border border-border rounded-sm p-6 hover:border-accent-purple/50 transition-colors group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white group-hover:text-accent-purple transition-colors">
                                            {guild.name}
                                        </h3>
                                        <p className="text-sm text-gray-400">{guild.client_name}</p>
                                    </div>
                                    <span className="text-2xl">🛡️</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500">Brands</p>
                                        <p className="text-white font-medium">{guild.brand_count}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Accounts</p>
                                        <p className="text-white font-medium">{guild.account_count}</p>
                                    </div>
                                </div>

                                {guild.has_logs_channel && (
                                    <div className="mt-4 flex items-center gap-1.5 text-xs text-green-400">
                                        <span className="h-2 w-2 rounded-full bg-green-500" />
                                        Logs configured
                                    </div>
                                )}
                            </Link>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
