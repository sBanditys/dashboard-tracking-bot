/**
 * Alert threshold and email alert types
 */

// Alert threshold types
export type MetricType = 'views' | 'likes' | 'comments' | 'shares' | 'followers'
export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'x' | 'facebook'

export interface AlertThreshold {
  id: string
  guildId: string
  accountGroupId: string
  metricType: MetricType
  platform: Platform | null  // null = all platforms
  thresholdValue: number
  enabled: boolean
  lastTriggered: string | null
  createdAt: string
  updatedAt: string
  accountGroup: {
    id: string
    label: string
    discordChannelId: string | null
    alertSettings: AlertSettings | null
  }
}

export interface AlertSettings {
  id: string
  accountGroupId: string
  streakAlerts: boolean
  thresholdAlerts: boolean
  statusAlerts: boolean
  updatedAt: string
}

export interface ThresholdFilters {
  groupId?: string
  platform?: string
  metricType?: string
  search?: string
}

export interface ThresholdPage {
  thresholds: AlertThreshold[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  active_count: number
}

export interface CreateThresholdRequest {
  metricType: MetricType
  platform: Platform | null
  thresholdValue: number
  accountGroupId: string
}

// Email alert types
export interface EmailConfig {
  id: string
  guildId: string
  deliveryMode: 'immediate' | 'digest'
  digestHour: number | null  // UTC hour 0-23
  rateLimit: number  // emails per hour per recipient
  updatedAt: string
}

export interface EmailRecipient {
  id: string
  email: string  // masked: "abc***@domain.com"
  verified: boolean
  verificationExpired: boolean
  createdAt: string
}

export interface EmailConfigResponse {
  config: EmailConfig
  recipients: EmailRecipient[]
  maxRecipients: number
}
