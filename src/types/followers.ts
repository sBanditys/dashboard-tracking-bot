export interface GrowthDelta {
  delta: number;
  percent: number;
  dataQuality?: 'exact' | 'approximate' | 'pending';
  actualDays?: number;
  accountsWithData?: number;
}

// Used for account cards — data comes from existing accounts endpoint (already has follower fields from Phase 54)
export interface AccountFollowerData {
  id: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  username: string;
  brand: string;
  group: string | null;
  followerCount: number | null;
  profilePhotoUrl: string | null;
  followersLastScrapedAt: string | null;
  growth7d: GrowthDelta | null;
  growth30d: GrowthDelta | null;
  trackingSince: string | null;
  created_at: string;
}

export interface GroupFollowerStats {
  groupId: string;
  totalFollowers: number;
  accountCount: number;
  accountsWithData: number;
  growth7d: { delta: number; percent: number; accountsWithData: number } | null;
  growth30d: { delta: number; percent: number; accountsWithData: number } | null;
}

export interface FollowerSnapshot {
  id: string;
  followerCount: number;
  snapshotDate: string;
  collectedAt: string;
}

export interface FollowerSnapshotsResponse {
  items: FollowerSnapshot[];
  nextCursor: string | null;
  hasMore: boolean;
}
