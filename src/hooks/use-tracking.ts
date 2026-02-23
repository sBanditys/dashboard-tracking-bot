'use client'

import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { parseApiError } from '@/lib/api-error'
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
            const response = await fetchWithRetry(`/api/guilds/${guildId}/brands`)
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
 * Account filters for infinite query
 */
export interface AccountFilters {
    search?: string
    platform?: string
    group?: string
}

/**
 * Build query string from account filters (cursor-based)
 */
function buildAccountQuery(cursor: string | null, limit: number, filters: AccountFilters): string {
    const params = new URLSearchParams()
    params.set('limit', limit.toString())
    if (cursor) params.set('cursor', cursor)
    if (filters.search) params.set('search', filters.search)
    if (filters.platform) params.set('platform', filters.platform)
    if (filters.group) params.set('group', filters.group)
    return params.toString()
}

/**
 * Fetch paginated accounts with infinite scroll (cursor-based)
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
            const response = await fetchWithRetry(`/api/guilds/${guildId}/accounts?${query}`)
            if (response.status === 400 || response.status === 422) {
                const err = new Error('Cursor expired or invalid')
                ;(err as Error & { code: string }).code = 'CURSOR_INVALID'
                throw err
            }
            if (!response.ok) {
                throw new Error('Failed to fetch accounts')
            }
            return response.json() as Promise<AccountsResponse>
        },
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) =>
            lastPage.has_more ? lastPage.next_cursor : undefined,
        staleTime: 2 * 60 * 1000, // 2 minutes per DEV-002
        enabled: !!guildId,
        retry: 2,
    })
}

/**
 * Extended post filters for infinite query (adds search)
 */
export interface PostFiltersExtended extends PostFilters {
    search?: string
}

/**
 * Build query string from extended post filters (cursor-based)
 */
function buildPostQueryExtended(cursor: string | null, limit: number, filters: PostFiltersExtended): string {
    const params = new URLSearchParams()
    params.set('limit', limit.toString())
    if (cursor) params.set('cursor', cursor)

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
 * Fetch paginated posts with infinite scroll (cursor-based)
 */
export function usePostsInfinite(
    guildId: string,
    limit: number = 50,
    filters: PostFiltersExtended = {}
) {
    return useInfiniteQuery({
        queryKey: ['guild', guildId, 'posts', 'infinite', limit, filters],
        queryFn: async ({ pageParam }) => {
            const query = buildPostQueryExtended(pageParam, limit, filters)
            const response = await fetchWithRetry(`/api/guilds/${guildId}/posts?${query}`)
            if (response.status === 400 || response.status === 422) {
                const err = new Error('Cursor expired or invalid')
                ;(err as Error & { code: string }).code = 'CURSOR_INVALID'
                throw err
            }
            if (!response.ok) {
                throw new Error('Failed to fetch posts')
            }
            return response.json() as Promise<PostsResponse>
        },
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) =>
            lastPage.has_more ? lastPage.next_cursor : undefined,
        staleTime: 60 * 1000, // 1 minute (posts update more frequently)
        enabled: !!guildId,
        retry: 2,
    })
}

// Source: Pattern combining Headless UI Dialog + React Query mutation
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { toast } from 'sonner'

export function useDeleteAccount(guildId: string) {
  const queryClient = useQueryClient()
  const [isRetrying, setIsRetrying] = useState(false)
  const didRetryRef = useRef(false)

  const mutation = useMutation({
    mutationFn: async (accountId: string) => {
      const response = await fetchWithRetry(`/api/guilds/${guildId}/accounts/${accountId}`, {
        method: 'DELETE',
      }, {
        onRetry: (attempt) => {
          setIsRetrying(true)
          didRetryRef.current = true
          if (attempt === 1) {
            toast.loading('Retrying...', { id: 'mutation-retry', duration: Infinity })
          }
        },
        onRetrySettled: () => {
          setIsRetrying(false)
        },
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(parseApiError(body, 'Failed to delete account'))
      }

      return response.json()
    },
    onSuccess: () => {
      if (didRetryRef.current) {
        toast.dismiss('mutation-retry')
        toast.success('Changes saved')
      } else {
        toast.success('Account deleted successfully')
      }
      didRetryRef.current = false
      // Invalidate accounts list and guild details (account_count)
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'accounts'] })
      queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
    },
    onError: (error) => {
      if (didRetryRef.current) {
        toast.dismiss('mutation-retry')
        toast.error('Failed to save changes. Please try again later.')
      } else {
        toast.error('Failed to delete account', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
      didRetryRef.current = false
    },
  })

  return { ...mutation, isRetrying }
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
    const [isRetrying, setIsRetrying] = useState(false)
    const didRetryRef = useRef(false)

    const mutation = useMutation({
        mutationFn: async (data: AddAccountRequest) => {
            const response = await fetchWithRetry(`/api/guilds/${guildId}/accounts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            }, {
                onRetry: (attempt) => {
                    setIsRetrying(true)
                    didRetryRef.current = true
                    if (attempt === 1) {
                        toast.loading('Retrying...', { id: 'mutation-retry', duration: Infinity })
                    }
                },
                onRetrySettled: () => {
                    setIsRetrying(false)
                },
            });

            if (!response.ok) {
                const body = await response.json();
                throw new Error(parseApiError(body, 'Failed to add account'));
            }

            return response.json();
        },
        onSuccess: () => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.success('Changes saved')
            } else {
                toast.success('Account added successfully')
            }
            didRetryRef.current = false
            // Invalidate accounts list, guild details, and brands (account_count updates)
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'accounts'] });
            queryClient.invalidateQueries({ queryKey: ['guild', guildId] });
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'brands'] });
        },
        onError: (error) => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.error('Failed to save changes. Please try again later.')
            } else {
                toast.error('Failed to add account', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                })
            }
            didRetryRef.current = false
        },
    });

    return { ...mutation, isRetrying }
}

export function useAddBrand(guildId: string) {
    const queryClient = useQueryClient();
    const [isRetrying, setIsRetrying] = useState(false)
    const didRetryRef = useRef(false)

    const mutation = useMutation({
        mutationFn: async (data: AddBrandRequest) => {
            const response = await fetchWithRetry(`/api/guilds/${guildId}/brands`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            }, {
                onRetry: (attempt) => {
                    setIsRetrying(true)
                    didRetryRef.current = true
                    if (attempt === 1) {
                        toast.loading('Retrying...', { id: 'mutation-retry', duration: Infinity })
                    }
                },
                onRetrySettled: () => {
                    setIsRetrying(false)
                },
            });

            if (!response.ok) {
                const body = await response.json();
                throw new Error(parseApiError(body, 'Failed to add brand'));
            }

            return response.json();
        },
        onSuccess: () => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.success('Changes saved')
            } else {
                toast.success('Brand added successfully')
            }
            didRetryRef.current = false
            // Invalidate brands list and guild details (brand_count updates)
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'brands'] });
            queryClient.invalidateQueries({ queryKey: ['guild', guildId] });
        },
        onError: (error) => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.error('Failed to save changes. Please try again later.')
            } else {
                toast.error('Failed to add brand', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                })
            }
            didRetryRef.current = false
        },
    });

    return { ...mutation, isRetrying }
}
