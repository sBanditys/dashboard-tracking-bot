'use client'

import { useState } from 'react'
import { useBrands } from '@/hooks/use-tracking'
import { GuildTabs } from '@/components/guild-tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface PageProps {
    params: { guildId: string }
}

export default function BrandsPage({ params }: PageProps) {
    const { guildId } = params
    const { data, isLoading, isError } = useBrands(guildId)
    const [expandedBrand, setExpandedBrand] = useState<string | null>(null)

    if (isError) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400">Failed to load brands</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Brands</h1>
                <p className="text-gray-400">
                    Manage brands and their account groups
                </p>
            </div>

            <GuildTabs guildId={guildId} />

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20" />
                    ))}
                </div>
            ) : data?.brands.length === 0 ? (
                <div className="bg-surface border border-border rounded-sm p-8 text-center">
                    <p className="text-gray-400">No brands found for this guild</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {data?.brands.map((brand) => (
                        <div
                            key={brand.id}
                            className="bg-surface border border-border rounded-sm overflow-hidden"
                        >
                            <button
                                onClick={() => setExpandedBrand(expandedBrand === brand.id ? null : brand.id)}
                                className="w-full p-4 flex items-center justify-between hover:bg-background/30 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        {brand.is_paused ? (
                                            <span className="text-yellow-500">⏸️</span>
                                        ) : (
                                            <span className="text-green-500">▶️</span>
                                        )}
                                        <div className="text-left">
                                            <h3 className="font-semibold text-white">{brand.label}</h3>
                                            <p className="text-xs text-gray-500">{brand.slug}</p>
                                        </div>
                                    </div>
                                    {brand.is_paused && brand.pause_reason && (
                                        <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded">
                                            {brand.pause_reason}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                    <div className="text-right">
                                        <p className="text-gray-400">{brand.groups.length} groups</p>
                                        <p className="text-gray-400">{brand.account_count} accounts</p>
                                    </div>
                                    <span
                                        className={cn(
                                            'text-gray-400 transition-transform',
                                            expandedBrand === brand.id && 'rotate-180'
                                        )}
                                    >
                                        ▼
                                    </span>
                                </div>
                            </button>

                            {expandedBrand === brand.id && brand.groups.length > 0 && (
                                <div className="border-t border-border bg-background/20">
                                    <div className="p-4 space-y-2">
                                        <p className="text-xs font-medium text-gray-500 uppercase mb-3">
                                            Account Groups
                                        </p>
                                        {brand.groups.map((group) => (
                                            <div
                                                key={group.id}
                                                className="flex items-center justify-between py-2 px-3 bg-surface rounded-sm"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-white">{group.label}</p>
                                                    <p className="text-xs text-gray-500">{group.slug}</p>
                                                </div>
                                                <div className="text-right text-xs text-gray-400">
                                                    <p>{group.account_count} accounts</p>
                                                    <p>{group.post_count} posts</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
