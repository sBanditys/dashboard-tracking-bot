'use client'

import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
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
    if (filters.sort_by) params.set('sort_by', filters.sort_by)
    if (filters.sort_order) params.set('sort_order', filters.sort_order)

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

/**
 * Account filters for infinite query
 */
export interface AccountFilters {
    search?: string
    platform?: string
    group?: string
}

/**
 * Build query string from account filters
 */
function buildAccountQuery(page: number, limit: number, filters: AccountFilters): string {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('limit', limit.toString())

    if (filters.search) params.set('search', filters.search)
    if (filters.platform) params.set('platform', filters.platform)
    if (filters.group) params.set('group', filters.group)

    return params.toString()
}

/**
 * Fetch paginated accounts with infinite scroll
 */
export function useAccountsInfinite(
    guildId: string,
    limit: number = 50,
    filters: AccountFilters = {}
) {
    return useInfiniteQuery({
        queryKey: ['guild', guildId, 'accounts', 'infinite', limit, filters],
        queryFn: async ({ pageParam }) => {
            const query = buildAccountQuery(pageParam, limit, filters)
            const response = await fetch(`/api/guilds/${guildId}/accounts?${query}`)
            if (!response.ok) {
                throw new Error('Failed to fetch accounts')
            }
            return response.json() as Promise<AccountsResponse>
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            if (lastPage.pagination.page >= lastPage.pagination.total_pages) {
                return undefined
            }
            return lastPage.pagination.page + 1
        },
        staleTime: 2 * 60 * 1000, // 2 minutes per DEV-002
        enabled: !!guildId,
    })
}

/**
 * Extended post filters for infinite query (adds search)
 */
export interface PostFiltersExtended extends PostFilters {
    search?: string
}

/**
 * Build query string from extended post filters
 */
function buildPostQueryExtended(page: number, limit: number, filters: PostFiltersExtended): string {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('limit', limit.toString())

    if (filters.search) params.set('search', filters.search)
    if (filters.platform) params.set('platform', filters.platform)
    if (filters.status) params.set('status', filters.status)
    if (filters.brand_id) params.set('brand_id', filters.brand_id)
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
    if (filters.sort_by) params.set('sort_by', filters.sort_by)
    if (filters.sort_order) params.set('sort_order', filters.sort_order)

    return params.toString()
}

/**
 * Fetch paginated posts with infinite scroll
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'

export function usePostsInfinite(
    guildId: string,
    limit: number = 50,
    filters: PostFiltersExtended = {}
) {
    return useInfiniteQuery({
        queryKey: ['guild', guildId, 'posts', 'infinite', limit, filters],
        queryFn: async ({ pageParam }) => {
            const query = buildPostQueryExtended(pageParam, limit, filters)
            const response = await fetch(`/api/guilds/${guildId}/posts?${query}`)
            if (!response.ok) {
                throw new Error('Failed to fetch posts')
            }
            return response.json() as Promise<PostsResponse>
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            if (lastPage.pagination.page >= lastPage.pagination.total_pages) {
                return undefined
            }
            return lastPage.pagination.page + 1
        },
        staleTime: 60 * 1000, // 1 minute (posts update more frequently)
        enabled: !!guildId,
    })
}

// Source: Pattern combining Headless UI Dialog + React Query mutation
export function useDeleteAccount(guildId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (accountId: string) => {
      const response = await fetch(`/api/guilds/${guildId}/accounts/${accountId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete account')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate accounts list and guild details (account_count)
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'accounts'] })
      queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
    },
  })
}

/**
 * Request types for create mutations
 */
interface AddAccountRequest {
  platform: 'instagram' | 'tiktok' | 'youtube' | 'x'
  username: string
  brand_id: string
  group_id?: string
}

interface AddBrandRequest {
  label: string
  slug?: string
}

export function useAddAccount(guildId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: AddAccountRequest) => {
            const response = await fetch(`/api/guilds/${guildId}/accounts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to add account');
            }

            return response.json();
        },
        onSuccess: () => {
            // Invalidate accounts list, guild details, and brands (account_count updates)
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'accounts'] });
            queryClient.invalidateQueries({ queryKey: ['guild', guildId] });
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'brands'] });
        },
    });
}

export function useAddBrand(guildId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: AddBrandRequest) => {
            const response = await fetch(`/api/guilds/${guildId}/brands`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to add brand');
            }

            return response.json();
        },
        onSuccess: () => {
            // Invalidate brands list and guild details (brand_count updates)
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'brands'] });
            queryClient.invalidateQueries({ queryKey: ['guild', guildId] });
        },
    });
}
