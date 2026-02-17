import { backendFetch } from '@/lib/server/backend-fetch';
import { BACKEND_API_URL } from '@/lib/server/api-url';
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { UAParser } from 'ua-parser-js';
import { BackendSession, ParsedSession, DeviceType } from '@/types/session';

const API_URL = BACKEND_API_URL;

/**
 * GET /api/auth/sessions
 *
 * Fetches active sessions from backend and parses user-agent data server-side.
 * Detects current session via user-agent + IP prefix matching.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch sessions from backend
    const response = await backendFetch(`${API_URL}/api/v1/auth/sessions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch sessions' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json() as { sessions: BackendSession[] };

    // Get current request headers for session detection
    const headerStore = await headers();
    const requestUserAgent = headerStore.get('user-agent') || '';
    const requestIp = headerStore.get('x-forwarded-for')?.split(',')[0].trim() || '';

    // Parse each session's user-agent
    const parsedSessions: ParsedSession[] = data.sessions.map((session) => {
      const parser = new UAParser(session.user_agent || undefined);
      const result = parser.getResult();

      // Determine device type
      let deviceType: DeviceType = 'unknown';
      let deviceName = 'Unknown Device';

      if (result.device.type === 'mobile') {
        deviceType = 'mobile';
        deviceName = 'Mobile';
      } else if (result.device.type === 'tablet') {
        deviceType = 'tablet';
        deviceName = 'Tablet';
      } else if (session.user_agent) {
        // If we have a user agent but device type is empty, assume desktop
        deviceType = 'desktop';
        deviceName = 'Desktop';
      }

      // Extract browser info
      const browserName = result.browser.name || 'Unknown';
      const browserVersion = result.browser.version || '';

      // Extract OS info
      const osName = result.os.name || 'Unknown';
      const osVersion = result.os.version || '';

      // Mask IP address (show partial)
      const maskedIp = maskIpAddress(session.ip_address || 'Unknown');

      return {
        id: session.id,
        device: {
          type: deviceType,
          name: deviceName,
        },
        browser: {
          name: browserName,
          version: browserVersion,
        },
        os: {
          name: osName,
          version: osVersion,
        },
        ipAddress: maskedIp,
        createdAt: session.created_at,
        expiresAt: session.expires_at,
        isCurrent: false, // Will be set below
      };
    });

    // Detect current session via UA + IP prefix matching
    let currentSessionDetected = false;
    for (const session of parsedSessions) {
      const backendSession = data.sessions.find(s => s.id === session.id);
      if (!backendSession) continue;

      const sessionUserAgent = backendSession.user_agent || '';
      const sessionIp = backendSession.ip_address || '';

      // Match user-agent and IP prefix
      const uaMatch = sessionUserAgent === requestUserAgent;
      const ipMatch = compareIpPrefix(sessionIp, requestIp);

      if (uaMatch && ipMatch) {
        session.isCurrent = true;
        currentSessionDetected = true;
        break;
      }
    }

    // If no match found, mark the most recent session (first in list) as current
    if (!currentSessionDetected && parsedSessions.length > 0) {
      parsedSessions[0].isCurrent = true;
    }

    return NextResponse.json({ sessions: parsedSessions });
  } catch (error) {
    console.error('Sessions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

/**
 * Mask IP address for privacy (show first 2 octets for IPv4, first 4 groups for IPv6)
 */
function maskIpAddress(ip: string): string {
  if (ip === 'Unknown') return ip;

  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
  }

  // IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 4) {
      return `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}:xxxx:xxxx:xxxx:xxxx`;
    }
  }

  return ip;
}

/**
 * Compare IP address prefixes for session matching
 * Returns true if first 2 octets (IPv4) or first 4 groups (IPv6) match
 */
function compareIpPrefix(ip1: string, ip2: string): boolean {
  if (!ip1 || !ip2) return false;

  // IPv4
  if (ip1.includes('.') && ip2.includes('.')) {
    const parts1 = ip1.split('.');
    const parts2 = ip2.split('.');
    if (parts1.length >= 2 && parts2.length >= 2) {
      return parts1[0] === parts2[0] && parts1[1] === parts2[1];
    }
  }

  // IPv6
  if (ip1.includes(':') && ip2.includes(':')) {
    const parts1 = ip1.split(':');
    const parts2 = ip2.split(':');
    if (parts1.length >= 4 && parts2.length >= 4) {
      return (
        parts1[0] === parts2[0] &&
        parts1[1] === parts2[1] &&
        parts1[2] === parts2[2] &&
        parts1[3] === parts2[3]
      );
    }
  }

  return false;
}
