/**
 * Session management types
 */

/**
 * Raw backend session response shape
 */
export interface BackendSession {
  id: string;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  expires_at: string;
}

/**
 * Device type classification
 */
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

/**
 * Parsed session with enriched device/browser/OS information
 */
export interface ParsedSession {
  id: string;
  device: {
    type: DeviceType;
    name: string;
  };
  browser: {
    name: string;
    version: string;
  };
  os: {
    name: string;
    version: string;
  };
  ipAddress: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

/**
 * Sessions API response
 */
export interface SessionsResponse {
  sessions: ParsedSession[];
}
