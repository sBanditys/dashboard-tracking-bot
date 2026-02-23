'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

function getPollingRateLimitExpiry(): number {
  try {
    const stored = sessionStorage.getItem('polling_rate_limit_until');
    if (stored) {
      return parseInt(stored, 10);
    }
  } catch { /* SSR or private browsing */ }
  return 0;
}

/**
 * RateLimitBanner — shows a countdown when background polling is rate-limited (429).
 *
 * Reads polling_rate_limit_until from sessionStorage on mount and reactively
 * when the 'rate-limit-updated' custom event fires (dispatched by fetchWithRetry).
 * Auto-dismisses when the cooldown expires.
 */
export function RateLimitBanner() {
  const [expiryMs, setExpiryMs] = useState<number>(0);
  const [remainingMs, setRemainingMs] = useState<number>(0);

  // Read from sessionStorage on mount
  useEffect(() => {
    const expiry = getPollingRateLimitExpiry();
    if (expiry > Date.now()) {
      setExpiryMs(expiry);
      setRemainingMs(expiry - Date.now());
    }

    // Listen for rate-limit-updated events dispatched by fetchWithRetry
    const handleRateLimitUpdated = () => {
      const newExpiry = getPollingRateLimitExpiry();
      if (newExpiry > Date.now()) {
        setExpiryMs(newExpiry);
        setRemainingMs(newExpiry - Date.now());
      }
    };

    window.addEventListener('rate-limit-updated', handleRateLimitUpdated);
    return () => {
      window.removeEventListener('rate-limit-updated', handleRateLimitUpdated);
    };
  }, []);

  // Tick countdown every second
  useEffect(() => {
    if (expiryMs === 0) return;

    const interval = setInterval(() => {
      const remaining = expiryMs - Date.now();
      if (remaining <= 0) {
        setExpiryMs(0);
        setRemainingMs(0);
        try {
          sessionStorage.removeItem('polling_rate_limit_until');
        } catch { /* SSR or private browsing */ }
        clearInterval(interval);
      } else {
        setRemainingMs(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiryMs]);

  if (expiryMs === 0 || remainingMs <= 0) {
    return null;
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const countdownText = minutes >= 1
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`;

  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-sm text-yellow-300">
      <AlertTriangle className="h-4 w-4 flex-shrink-0 text-yellow-400" />
      <span>
        Data updates paused &mdash; resuming in {countdownText}
      </span>
    </div>
  );
}
