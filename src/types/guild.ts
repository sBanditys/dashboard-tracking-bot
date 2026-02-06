/**
 * Guild-related types
 */

export interface GuildListItem {
    id: string
    name: string
    created_at: string
    client_name: string
    brand_count: number
    account_count: number
    has_logs_channel: boolean
}

export interface GuildsResponse {
    guilds: GuildListItem[]
}

export interface GuildBrand {
    id: string
    label: string
    slug: string
    group_count: number
    account_count: number
}

export interface GuildSettings {
    logs_channel_id: string | null
    watch_category_id: string | null
    pause_category_id: string | null
    updates_channel_id: string | null
    updates_role_id: string | null
    allowed_platforms: string[]
}

export interface AutoRefreshConfig {
    enabled: boolean
    lookback_days: number
    schedule_hour: number
    posts_refreshed_today: number
}

export interface GuildDetails {
    id: string
    name: string
    created_at: string
    settings: GuildSettings
    auto_refresh: AutoRefreshConfig | null
    client: {
        id: string
        name: string
    }
    brands: GuildBrand[]
}

export interface BotHealth {
    status: string
    last_heartbeat: string
    heartbeat_age_seconds: number
    shard_count: number
    guild_count: number
    version: string | null
    memory_mb: number | null
    uptime_seconds: number | null
}

export interface GuildStatus {
    bot: BotHealth | null
    bot_healthy: boolean
    pending_jobs: number
}

export interface DailyUsage {
    date: string
    apify_runs: number
    apify_cost_cents: number
    openai_calls: number
    openai_cost_cents: number
    youtube_quota: number
}

export interface UsageTotals {
    apify_runs: number
    apify_cost_cents: number
    openai_calls: number
    openai_cost_cents: number
}

export interface GuildUsage {
    period_days: number
    api_usage: {
        daily: DailyUsage[]
        totals: UsageTotals
    }
    posts: {
        total: number
        by_status: Record<string, number>
    }
    refresh_count: number
}

export interface Channel {
    id: string
    name: string
    type: number  // 0 = text, 2 = voice, 4 = category, 5 = announcement
    bot_has_access: boolean
}

export interface ChannelsResponse {
    channels: Channel[]
}
