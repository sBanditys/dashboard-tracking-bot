'use client'

import { useState } from 'react'
import { useBrands } from '@/hooks/use-tracking'
import { GuildTabs } from '@/components/guild-tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { ScrollToTop } from '@/components/scroll-to-top'
import { AddBrandModal } from '@/components/forms/add-brand-modal'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { useDeleteBrand } from '@/hooks/use-guilds'
import { cn } from '@/lib/utils'

interface PageProps {
    params: { guildId: string }
}

// Tag icon for empty state
function TagIcon() {
    return (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
        </svg>
    )
}

export default function BrandsPage({ params }: PageProps) {
    const { guildId } = params
    const { data, isLoading, isError } = useBrands(guildId)
    const [expandedBrand, setExpandedBrand] = useState<string | null>(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [brandToDelete, setBrandToDelete] = useState<{ id: string, label: string } | null>(null)
    const deleteMutation = useDeleteBrand(guildId)

    const handleDelete = async () => {
        if (!brandToDelete) return
        try {
            await deleteMutation.mutateAsync(brandToDelete.id)
            setBrandToDelete(null)
        } catch {
            // Error is handled by the mutation
        }
    }

    if (isError) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400">Failed to load brands</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <header className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Brands</h1>
                    <p className="text-gray-400">
                        Manage brands and their account groups
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="bg-accent-purple text-white rounded-lg px-4 py-2 hover:bg-accent-purple/90 transition-colors"
                >
                    Add Brand
                </button>
            </header>

            <GuildTabs guildId={guildId} />

            {isLoading && !data ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20" />
                    ))}
                </div>
            ) : data?.brands.length === 0 ? (
                <EmptyState
                    icon={<TagIcon />}
                    title="No brands yet"
                    description="Brands help organize your tracked accounts into groups. They'll appear here once configured through the Discord bot."
                    action={{
                        label: "Learn about brands",
                        href: "/docs/brands"
                    }}
                />
            ) : (
                <div className="space-y-4">
                    {data?.brands.map((brand) => (
                        <div
                            key={brand.id}
                            className="bg-surface border border-border rounded-lg overflow-hidden"
                        >
                            <button
                                onClick={() => setExpandedBrand(expandedBrand === brand.id ? null : brand.id)}
                                className="w-full p-4 flex items-center justify-between hover:bg-background/30 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        {brand.is_paused ? (
                                            <span className="text-yellow-500">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                                </svg>
                                            </span>
                                        ) : (
                                            <span className="text-green-500">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                            </span>
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
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setBrandToDelete({ id: brand.id, label: brand.label })
                                        }}
                                        className="text-red-500 hover:text-red-400 transition-colors"
                                        aria-label="Delete brand"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                    <svg
                                        className={cn(
                                            'w-4 h-4 text-gray-400 transition-transform',
                                            expandedBrand === brand.id && 'rotate-180'
                                        )}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>

                            {/* Expandable content with animation */}
                            <div
                                className={cn(
                                    'grid transition-all duration-200',
                                    expandedBrand === brand.id
                                        ? 'grid-rows-[1fr] opacity-100'
                                        : 'grid-rows-[0fr] opacity-0'
                                )}
                            >
                                <div className="overflow-hidden">
                                    {brand.groups.length > 0 && (
                                        <div className="border-t border-border bg-background/20">
                                            <div className="p-4 space-y-2">
                                                <p className="text-xs font-medium text-gray-500 uppercase mb-3">
                                                    Account Groups
                                                </p>
                                                {brand.groups.map((group) => (
                                                    <div
                                                        key={group.id}
                                                        className="flex items-center justify-between py-2 px-3 bg-surface rounded-lg"
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
                                    {brand.groups.length === 0 && (
                                        <div className="border-t border-border bg-background/20 p-4">
                                            <p className="text-sm text-gray-400 text-center">
                                                No groups configured for this brand
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ScrollToTop />

            <AddBrandModal
                open={showAddModal}
                onClose={() => setShowAddModal(false)}
                guildId={guildId}
            />

            <ConfirmationModal
                open={brandToDelete !== null}
                onClose={() => setBrandToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Brand"
                itemName={brandToDelete?.label ?? ''}
                isLoading={deleteMutation.isPending}
                confirmLabel="Delete"
            />
        </div>
    )
}
