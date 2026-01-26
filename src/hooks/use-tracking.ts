'use client'

import { useQuery } from '@tanstack/react-query'
import type {
    BrandsResponse,
    AccountsResponse,
    PostsResponse,
    PostFilters,
} from '@/types/tracking'

/**
 * Fetch brands for a guild
 */
export function useBrands(guildId: string) {
    return useQuery<BrandsResponse>({
        queryKey: ['guild', guildId, 'brands'],
        queryFn: async () => {
            const response = await fetch(`/api/guilds/${guildId}/brands`)
            if (!response.ok) {
                throw new Error('Failed to fetch brands')
            }
            return response.json()
        },
        staleTime: 2 * 60 * 1000,
        enabled: !!guildId,
    })
}

/**
 * Fetch paginated accounts for a guild
 */
export function useAccounts(guildId: string, page: number = 1, limit: number = 25) {
    return useQuery<AccountsResponse>({
        queryKey: ['guild', guildId, 'accounts', page, limit],
        queryFn: async () => {
            const response = await fetch(`/api/guilds/${guildId}/accounts?page=${page}&limit=${limit}`)
            if (!response.ok) {
                throw new Error('Failed to fetch accounts')
            }
            return response.json()
        },
        staleTime: 2 * 60 * 1000,
        enabled: !!guildId,
    })
}

/**
 * Build query string from filters
 */
function buildPostQuery(page: number, limit: number, filters: PostFilters): string {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('limit', limit.toString())

    if (filters.platform) params.set('platform', filters.platform)
    if (filters.status) params.set('status', filters.status)
    if (filters.brand_id) params.set('brand_id', filters.brand_id)
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)

    return params.toString()
}

/**
 * Fetch paginated posts for a guild with filters
 */
export function usePosts(
    guildId: string,
    page: number = 1,
    limit: number = 25,
    filters: PostFilters = {}
) {
    return useQuery<PostsResponse>({
        queryKey: ['guild', guildId, 'posts', page, limit, filters],
        queryFn: async () => {
            const query = buildPostQuery(page, limit, filters)
            const response = await fetch(`/api/guilds/${guildId}/posts?${query}`)
            if (!response.ok) {
                throw new Error('Failed to fetch posts')
            }
            return response.json()
        },
        staleTime: 60 * 1000, // 1 minute
        enabled: !!guildId,
    })
}
