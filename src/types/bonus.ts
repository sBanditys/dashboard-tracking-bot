/**
 * Bonus system TypeScript types
 *
 * Derived from backend bonusRoutes.ts response shapes.
 * Week boundaries use Sunday start (matching backend weekBoundary.ts).
 * Leaderboard max weeks: 52 (from leaderboardQuerySchema).
 */

export type RoundFilter = 'all' | 'evaluated' | 'pending'

export interface BonusTarget {
  id: string
  account_group_id: string
  account_group_label: string
  target_views: number
  actual_views: number | null
  achieved: boolean | null
  delta: number | null
}

export interface BonusPayment {
  id: string
  account_group_id: string
  account_group_label: string
  amount_cents: number
  paid: boolean
  paid_at: string | null
  paid_by: string | null
  notes: string | null
  created_at: string
}

export interface BonusRound {
  id: string
  week_start: string
  week_end: string
  bonus_amount_cents: number
  evaluated: boolean
  evaluated_at: string | null
  created_by: string
  created_at: string
  targets: BonusTarget[]
}

export interface BonusRoundDetail extends BonusRound {
  evaluated_by: string | null
  payments: BonusPayment[]
}

export interface BonusRoundsResponse {
  rounds: BonusRound[]
  next_cursor: string | null
  has_more: boolean
}

export interface BonusRoundDetailResponse {
  round: BonusRoundDetail
}

export interface BonusResultTarget {
  account_group_id: string
  account_group_label: string
  brand_label: string
  target_views: number
  actual_views: number
  achieved: boolean | null
  delta: number
  delta_percent: number
  near_miss: boolean
  payment: {
    id: string
    amount_cents: number
    paid: boolean
    paid_at: string | null
    paid_by: string | null
  } | null
}

export interface BonusResultsResponse {
  round: {
    id: string
    week_start: string
    week_end: string
    bonus_amount_cents: number
    evaluated_at: string | null
    evaluated_by: string | null
  }
  summary: {
    total_groups: number
    achieved_count: number
    missed_count: number
    near_miss_count: number
    total_bonus_cents: number
    total_paid_cents: number
    total_unpaid_cents: number
  }
  results: BonusResultTarget[]
}

export interface BonusLeaderboardEntry {
  account_group_id: string
  group_label: string
  brand_label: string
  total_rounds: number
  rounds_achieved: number
  hit_rate_percent: number
  total_bonus_cents: number
  total_paid_cents: number
}

export interface BonusLeaderboardResponse {
  leaderboard: BonusLeaderboardEntry[]
  meta: {
    weeks: number
    since: string
    total_groups: number
    total_rounds_evaluated: number
  }
}

export interface CreateBonusRoundRequest {
  week_start: string           // ISO datetime string (offset required by backend)
  bonus_amount_cents: number
  targets: {
    account_group_id: string
    target_views: number
  }[]
}
