'use client'

import { useParams } from 'next/navigation'
import { useUser } from '@/hooks/use-user'
import { AdminForbidden } from '@/components/manage/admin-guard'
import { ManageNav } from '@/components/manage/manage-nav'

interface ManageLayoutProps {
    children: React.ReactNode
}

export default function ManageLayout({ children }: ManageLayoutProps) {
    const params = useParams()
    const guildId = params.guildId as string

    const { user, isLoading } = useUser()

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                {/* Loading skeleton */}
                <div className="h-8 w-24 bg-surface animate-pulse rounded-sm" />
                <div className="flex gap-2">
                    <div className="h-10 w-20 bg-surface animate-pulse rounded-full" />
                    <div className="h-10 w-20 bg-surface animate-pulse rounded-full" />
                </div>
                <div className="h-64 bg-surface animate-pulse rounded-sm" />
            </div>
        )
    }

    // Check ADMINISTRATOR permission bit (0x8)
    const guild = user?.guilds?.find((g) => g.id === guildId)
    const isAdmin = guild !== undefined && (Number(guild.permissions) & 0x8) !== 0

    if (!isAdmin) {
        return <AdminForbidden guildId={guildId} />
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            <h1 className="text-2xl font-bold text-white">Manage</h1>
            <ManageNav guildId={guildId} />
            {children}
        </div>
    )
}
