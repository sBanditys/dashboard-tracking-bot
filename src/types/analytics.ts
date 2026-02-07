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
    total_brands: number
    by_platform: Record<string, number>
  }
  previous_period: {
    total_accounts: number
    total_posts: number
    total_brands: number
  }
  time_series: Array<{ period: string; count: number }>
  granularity: 'day' | 'week'
}

// Leaderboard entry
export interface LeaderboardEntry {
  account_id: string
  username: string
  platform: string
  total_views: number
  total_likes: number
  post_count: number
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[]
}

// Activity timeline event
export interface ActivityEvent {
  id: string
  type: 'post_captured' | 'settings_changed' | 'account_added' | 'account_removed' | 'brand_added' | 'brand_removed'
  created_at: string
  actor: string
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
