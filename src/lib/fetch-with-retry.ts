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
const RETRYABLE_SERVER_STATUSES = new Set([500, 502, 503, 504]);
let refreshPromise: Promise<boolean> | null = null;

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
    return Math.min(seconds * 1000, MAX_BACKOFF_MS);
  }

  // Try parsing as HTTP date (e.g., "Wed, 21 Oct 2026 07:28:00 GMT")
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    const delay = date.getTime() - Date.now();
    return delay > 0 ? Math.min(delay, MAX_BACKOFF_MS) : 0;
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

function isAuthEndpoint(url: string): boolean {
  return url.includes('/api/auth/');
}

async function refreshSession(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
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
      }

      // Handle 429 Too Many Requests — retry with backoff
      if (response.status === 429) {
        if (attempt >= maxRetries) {
          throw new Error(
            `Rate limited after ${maxRetries} retries. Please try again later.`
          );
        }

        // Get retry delay from header or use exponential backoff
        const retryAfter = response.headers.get('Retry-After');
        const delay = parseRetryAfter(retryAfter) ?? calculateBackoff(attempt);

        console.warn(
          `Rate limited (429). Retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${maxRetries})...`
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
