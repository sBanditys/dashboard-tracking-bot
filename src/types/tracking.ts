/**
 * Tracking-related types (brands, accounts, posts)
 */

export interface Pagination {
    page: number
    limit: number
    total: number
    total_pages: number
}

export interface AccountGroup {
    id: string
    label: string
    slug: string
    discord_channel_id: string | null
    account_count: number
    post_count: number
}

export interface Brand {
    id: string
    label: string
    slug: string
    is_paused: boolean
    pause_reason: string | null
    account_count: number
    post_count: number
    groups: AccountGroup[]
}

export interface BrandsResponse {
    brands: Brand[]
}

export interface Account {
    id: string
    platform: 'instagram' | 'tiktok' | 'youtube' | 'x'
    username: string
    brand: string
    group: string | null
    is_verified: boolean
    verified_at: string | null
    refresh: {
        enabled: boolean
        last_refresh: string | null
        next_refresh: string | null
    } | null
    created_at: string
}

export interface AccountsResponse {
    accounts: Account[]
    pagination: Pagination
}

export interface PostMetrics {
    views: number | null
    likes: number | null
    comments: number | null
    shares: number | null
    collected_at: string
}

export interface Post {
    url: string
    platform: 'instagram' | 'tiktok' | 'youtube' | 'x'
    status: string
    status_reason: string | null
    submitted_at: string | null
    posted_at: string | null
    author_handle: string | null
    brand: string | null
    group: string | null
    last_checked_at: string | null
    metrics: PostMetrics | null
}

export interface PostsResponse {
    posts: Post[]
    pagination: Pagination
}

export interface PostFilters {
    platform?: 'instagram' | 'tiktok' | 'youtube' | 'x'
    status?: string
    brand_id?: string
    from?: string
    to?: string
}
