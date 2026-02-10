/**
 * Fetch with automatic retry logic for rate limiting and network errors.
 *
 * Handles 429 responses with exponential backoff based on Retry-After header
 * or falls back to exponential backoff (1s, 2s, 4s...) capped at 30s.
 *
 * Adds jitter (0-50% randomization) to prevent thundering herd.
 */

const DEFAULT_MAX_RETRIES = 3;
const MAX_BACKOFF_MS = 30000; // 30 seconds
const BASE_BACKOFF_MS = 1000; // 1 second
const MAX_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_RATE_LIMIT_RETRIES = 1;
const RATE_LIMIT_FALLBACK_MS = 15000; // 15 seconds if backend does not send Retry-After
const LONG_RATE_LIMIT_THRESHOLD_MS = 10000; // fail fast when cooldown is clearly not transient
const RETRYABLE_SERVER_STATUSES = new Set([500, 502, 503, 504]);
let refreshPromise: Promise<boolean> | null = null;
let sessionRecoveryInProgress = false;
let globalRateLimitUntil = 0;

export class RateLimitError extends Error {
  status: number;
  retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(`Too many requests. Try again in ${formatDuration(retryAfterMs)}.`);
    this.name = 'RateLimitError';
    this.status = 429;
    this.retryAfterMs = Math.max(0, Math.floor(retryAfterMs));
  }
}

/**
 * Calculate exponential backoff delay with jitter
 * @param attempt - Current retry attempt (0-indexed)
 * @returns Delay in milliseconds
 */
function calculateBackoff(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s...
  const exponentialDelay = BASE_BACKOFF_MS * Math.pow(2, attempt);

  // Cap at 30 seconds
  const cappedDelay = Math.min(exponentialDelay, MAX_BACKOFF_MS);

  // Add jitter: randomize 0-50% of the delay
  const jitter = cappedDelay * Math.random() * 0.5;

  return cappedDelay + jitter;
}

/**
 * Parse Retry-After header value
 * @param retryAfter - Header value (seconds as string, or HTTP date)
 * @returns Delay in milliseconds, or null if invalid
 */
function parseRetryAfter(retryAfter: string | null): number | null {
  if (!retryAfter) return null;

  // Try parsing as seconds (e.g., "120")
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return Math.min(seconds * 1000, MAX_RATE_LIMIT_WINDOW_MS);
  }

  // Try parsing as HTTP date (e.g., "Wed, 21 Oct 2026 07:28:00 GMT")
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    const delay = date.getTime() - Date.now();
    return delay > 0 ? Math.min(delay, MAX_RATE_LIMIT_WINDOW_MS) : 0;
  }

  return null;
}

/**
 * Sleep for specified duration
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(1, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function isAuthEndpoint(url: string): boolean {
  return url.includes('/api/auth/');
}

function getRateLimitRemainingMs(): number {
  return Math.max(0, globalRateLimitUntil - Date.now());
}

function setRateLimitCooldown(ms: number): void {
  if (ms <= 0) return;
  const boundedMs = Math.min(ms, MAX_RATE_LIMIT_WINDOW_MS);
  globalRateLimitUntil = Math.max(globalRateLimitUntil, Date.now() + boundedMs);
}

async function refreshSession(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function recoverExpiredSession(): Promise<void> {
  if (sessionRecoveryInProgress) {
    return;
  }

  sessionRecoveryInProgress = true;

  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    }).catch(() => undefined);

    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.replace('/login?error=session_expired');
    }
  } finally {
    sessionRecoveryInProgress = false;
  }
}

/**
 * Fetch with automatic retry logic for rate limiting and network errors.
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param maxRetries - Maximum number of retries (default: 3)
 * @returns Response object
 * @throws Error if all retries exhausted
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries: number = DEFAULT_MAX_RETRIES
): Promise<Response> {
  if (!isAuthEndpoint(url)) {
    const cooldownMs = getRateLimitRemainingMs();
    if (cooldownMs > 0) {
      throw new RateLimitError(cooldownMs);
    }
  }

  let lastError: Error | null = null;
  let didRetryAfterRefresh = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 401 && !didRetryAfterRefresh && !isAuthEndpoint(url)) {
        const refreshed = await refreshSession();
        if (refreshed) {
          didRetryAfterRefresh = true;
          continue;
        }

        await recoverExpiredSession();
        return response;
      }

      if (response.status === 401 && didRetryAfterRefresh && !isAuthEndpoint(url)) {
        await recoverExpiredSession();
      }

      // Handle 429 Too Many Requests — retry with backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = parseRetryAfter(retryAfter) ?? RATE_LIMIT_FALLBACK_MS;
        setRateLimitCooldown(delay);

        const rateLimitRetryCap = Math.min(MAX_RATE_LIMIT_RETRIES, maxRetries);
        const shouldFailFast =
          delay >= LONG_RATE_LIMIT_THRESHOLD_MS || attempt >= rateLimitRetryCap;

        if (shouldFailFast) {
          throw new RateLimitError(delay);
        }

        console.warn(
          `Rate limited (429). Retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${rateLimitRetryCap})...`
        );

        await sleep(delay);
        continue;
      }

      // Handle transient server errors with backoff.
      // Skip non-transient statuses like 501 (Not Implemented) to fail fast.
      if (RETRYABLE_SERVER_STATUSES.has(response.status) && attempt < maxRetries) {
        const delay = calculateBackoff(attempt);
        console.warn(
          `Server error (${response.status}). Retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${maxRetries})...`
        );
        await sleep(delay);
        continue;
      }

      // All other responses (2xx, 3xx, 4xx) — return immediately, don't retry
      return response;
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }

      // Network error or fetch failure
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt >= maxRetries) {
        throw new Error(
          `Request failed after ${maxRetries} retries: ${lastError.message}`
        );
      }

      const delay = calculateBackoff(attempt);
      console.warn(
        `Network error: ${lastError.message}. Retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${maxRetries})...`
      );

      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError ?? new Error('Fetch failed for unknown reason');
}
