/**
 * Campaign system TypeScript types
 *
 * Derived from backend campaign route response shapes.
 * Field names use camelCase to match the actual backend wire format.
 * This differs from bonus/tracking types which use snake_case --
 * campaigns were built later with camelCase conventions.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Enums / Unions
// ---------------------------------------------------------------------------

export type CampaignStatus =
  | 'Draft'
  | 'Active'
  | 'Paused'
  | 'SubmissionsClosed'
  | 'Completed'

// ---------------------------------------------------------------------------
// Core Campaign
// ---------------------------------------------------------------------------

export interface Campaign {
  id: string
  createdAt: string
  updatedAt: string
  name: string
  status: CampaignStatus
  guildId: string
  brandId: string
  budgetCents: number
  perUserCapCents: number
  instagramRateCents: number | null
  tiktokRateCents: number | null
  youtubeRateCents: number | null
  closeThreshold: number
  rules: string | null
  dailySubmissionLimit: number | null
  paymentMethods: string[]
  reviewChannelId: string | null
  alertsChannelId: string | null
  announcementChannelId: string | null
  version: number
  createdBy: string
  _count: {
    posts: number
    participants: number
  }
}

// ---------------------------------------------------------------------------
// Response Types
// ---------------------------------------------------------------------------

export interface CampaignDetailResponse {
  campaign: Campaign & {
    brand: { id: string; label: string }
  }
  totals: {
    totalEarnedCents: number
    participantCount: number
  }
}

export interface CampaignsResponse {
  campaigns: Campaign[]
  nextCursor: string | null
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface AnalyticsParticipant {
  discordUserId: string
  totalEarnedCents: number
  postCount: number
}

export interface AnalyticsResponse {
  participants: AnalyticsParticipant[]
  nextCursor: string | null
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

export interface PayoutParticipant {
  discordUserId: string
  totalEarnedCents: number
  paymentMethod: string | null
  isPaid: boolean
  paidAt: string | null
  paidAmountCents: number | null
}

export interface PayoutsResponse {
  participants: PayoutParticipant[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
  }
}

export interface PayoutHistoryEntry {
  id: string
  timestamp: string
  actorId: string
  discordUserId: string
  amountCents: number
  paymentMethod: string | null
}

export interface PayoutHistoryResponse {
  entries: PayoutHistoryEntry[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
  }
}

export interface MarkPaidResponse {
  success: true
  amountCents: number
  paymentMethod: string | null
}

export interface BulkMarkPaidResponse {
  success: true
  paidCount: number
  totalCents: number
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export interface ExportTriggerResponse {
  exportId: string
  status: 'queued'
}

export interface ExportStatusResponse {
  exportId: string
  status: string
  downloadUrl?: string
  expiresAt?: string
  error?: string
}

// ---------------------------------------------------------------------------
// Zod Schemas (runtime validation for create/update forms)
// ---------------------------------------------------------------------------

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  brandId: z.string(),
  budgetCents: z.number().int().min(0),
  perUserCapCents: z.number().int().min(0),
  instagramRateCents: z.number().int().min(0).optional(),
  tiktokRateCents: z.number().int().min(0).optional(),
  youtubeRateCents: z.number().int().min(0).optional(),
  closeThreshold: z.number().int().min(0).max(100).optional().default(90),
  rules: z.string().optional(),
  dailySubmissionLimit: z.number().int().min(1).optional(),
  paymentMethods: z.array(z.string()).optional(),
  reviewChannelId: z.string().optional(),
  alertsChannelId: z.string().optional(),
  announcementChannelId: z.string().optional(),
})

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  brandId: z.string().optional(),
  budgetCents: z.number().int().min(0).optional(),
  perUserCapCents: z.number().int().min(0).optional(),
  instagramRateCents: z.number().int().min(0).optional(),
  tiktokRateCents: z.number().int().min(0).optional(),
  youtubeRateCents: z.number().int().min(0).optional(),
  closeThreshold: z.number().int().min(0).max(100).optional(),
  rules: z.string().optional(),
  dailySubmissionLimit: z.number().int().min(1).optional(),
  paymentMethods: z.array(z.string()).optional(),
  reviewChannelId: z.string().optional(),
  alertsChannelId: z.string().optional(),
  announcementChannelId: z.string().optional(),
  version: z.number().int(),
})

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>

// ---------------------------------------------------------------------------
// ConflictError (for 409 optimistic-lock handling in hooks)
// ---------------------------------------------------------------------------

export class ConflictError extends Error {
  public campaign: Campaign

  constructor(message: string, campaign: Campaign) {
    super(message)
    this.name = 'ConflictError'
    this.campaign = campaign
  }
}
