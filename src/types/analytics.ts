/**
 * Analytics-related types
 */

// Time range type used across all analytics
export type TimeRange = 7 | 30 | 90

// Main analytics response (counters + time-series)
export interface AnalyticsData {
  counters: {
    total_accounts: number
    total_posts: number
    total_views: number
    total_brands: number
    by_platform: Record<string, number>
  }
  previous_period: {
    total_accounts: number
    total_posts: number
    total_views: number
    total_brands: number
  }
  time_series: Array<{ period: string; count: number }>
  granularity: 'day' | 'week'
}

// Leaderboard entry (account group)
export interface LeaderboardEntry {
  group_id: string
  group_label: string
  total_views: number
  instagram_views: number
  tiktok_views: number
  youtube_views: number
  week_count: number
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[]
}

// Top accounts (individual accounts by post metrics)
export interface TopAccountEntry {
  account_id: string
  username: string
  platform: string
  total_views: number
  total_likes: number
  post_count: number
}

export interface TopAccountsResponse {
  accounts: TopAccountEntry[]
}

// Weekly submissions
export interface WeeklySubmissionWeek {
  week_start: string
  total_views: number
  instagram_views: number
  tiktok_views: number
  youtube_views: number
  x_views: number
  facebook_views: number
  groups: Array<{
    group_label: string
    total_views: number
    instagram_views: number | null
    tiktok_views: number | null
    youtube_views: number | null
  }>
}

export interface WeeklySubmissionsResponse {
  weeks: WeeklySubmissionWeek[]
}

// Activity timeline event
export interface ActivityEvent {
  id: string
  type: 'post_captured' | 'post_submitted' | 'settings_changed' | 'account_added' | 'account_removed' | 'brand_added' | 'brand_removed'
  created_at: string
  actor: string | null
  description: string
  link: string | null
}

export interface ActivityResponse {
  events: ActivityEvent[]
  next_page: number | null
}

// Chart data point (formatted for Recharts)
export interface ChartDataPoint {
  date: string
  count: number
  rawDate: string  // ISO date for click navigation
}
