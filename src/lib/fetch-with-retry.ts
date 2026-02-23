/**
 * Fetch with automatic retry logic for rate limiting and network errors.
 *
 * Handles 429 responses with exponential backoff based on Retry-After header
 * or falls back to exponential backoff (1s, 2s, 4s...) capped at 30s.
 *
 * Adds jitter (0-50% randomization) to prevent thundering herd.
 *
 * Session Refresh Flow:
 * 1. Client makes API request via fetchWithRetry
 * 2. If 401 received, call refreshSession() -> POST /api/auth/refresh
 * 3. Next.js refresh route reads refresh_token from its cookie store
 * 4. Next.js forwards refresh_token as Cookie header to backend API
 * 5. Backend validates refresh token, issues new token pair
 * 6. Next.js stores new tokens in its cookie store
 * 7. fetchWithRetry retries original request with new auth_token cookie
 * 8. If retry also returns 401, session is unrecoverable -> redirect to login
 */

import { toast } from 'sonner';

const DEFAULT_MAX_RETRIES = 3;
const MAX_BACKOFF_MS = 30000; // 30 seconds
const BASE_BACKOFF_MS = 1000; // 1 second
const MAX_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_RATE_LIMIT_RETRIES = 1;
const RATE_LIMIT_FALLBACK_MS = 15000; // 15 seconds if backend does not send Retry-After
const LONG_RATE_LIMIT_THRESHOLD_MS = 10000; // fail fast when cooldown is clearly not transient
const RETRYABLE_SERVER_STATUSES = new Set([500, 502, 503, 504]);
const RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const MUTATION_MAX_RETRIES = 5;
let refreshPromise: Promise<boolean> | null = null;
let sessionRecoveryInProgress = false;
let pollingRateLimitUntil = 0;    // for GET/HEAD/OPTIONS
let mutationRateLimitUntil = 0;   // for POST/PUT/PATCH/DELETE

// On module load, restore pollingRateLimitUntil from sessionStorage
try {
  const stored = sessionStorage.getItem('polling_rate_limit_until');
  if (stored) {
    const expiry = parseInt(stored, 10);
    if (expiry > Date.now()) {
      pollingRateLimitUntil = expiry;
    } else {
      sessionStorage.removeItem('polling_rate_limit_until');
    }
  }
} catch { /* SSR or private browsing */ }

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

/**
 * Extract error code from either backend envelope shape.
 * New shape: { error: { code } }, Old shape: { code }
 * TODO(v1.3): Remove old envelope support (body?.code path)
 */
function extractErrorCode(body: unknown): string | undefined {
  if (body === null || typeof body !== 'object') return undefined;
  const b = body as Record<string, unknown>;
  // New shape: { error: { code } }
  if (typeof b.error === 'object' && b.error !== null) {
    return (b.error as Record<string, unknown>).code as string | undefined;
  }
  // Old shape: { code }
  return b.code as string | undefined;
}

function getCsrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf_token='))
    ?.split('=')[1];
}

function getRateLimitRemainingMs(isMutation: boolean): number {
  const until = isMutation ? mutationRateLimitUntil : pollingRateLimitUntil;
  return Math.max(0, until - Date.now());
}

function setRateLimitCooldown(ms: number, isMutation: boolean): void {
  if (ms <= 0) return;
  const boundedMs = Math.min(ms, MAX_RATE_LIMIT_WINDOW_MS);
  const expiryTime = Date.now() + boundedMs;
  if (isMutation) {
    mutationRateLimitUntil = Math.max(mutationRateLimitUntil, expiryTime);
  } else {
    pollingRateLimitUntil = Math.max(pollingRateLimitUntil, expiryTime);
    try {
      sessionStorage.setItem('polling_rate_limit_until', String(pollingRateLimitUntil));
    } catch { /* SSR or private browsing — ignore */ }
    try {
      window.dispatchEvent(new CustomEvent('rate-limit-updated'));
    } catch { /* SSR */ }
  }
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
      // Show toast notification before redirect
      toast.error('Session expired, please log in again');

      // Save current URL as return URL for post-login redirect
      const returnUrl = window.location.pathname + window.location.search;
      const loginUrl = `/login?callbackUrl=${encodeURIComponent(returnUrl)}`;

      // Wait 2.5 seconds for user to see the toast
      await new Promise(r => setTimeout(r, 2500));

      window.location.replace(loginUrl);
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
 * @param config - Max retries (number) or config object with maxRetries, skipGlobalCooldown, onRetry, onRetrySettled
 * @returns Response object
 * @throws Error if all retries exhausted
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  config?: number | {
    maxRetries?: number;
    skipGlobalCooldown?: boolean;
    onRetry?: (attempt: number, maxAttempts: number) => void;
    onRetrySettled?: () => void;
  }
): Promise<Response> {
  const maxRetries = typeof config === 'number' ? config : config?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const skipGlobalCooldown = typeof config === 'number' ? false : config?.skipGlobalCooldown ?? false;
  const onRetry = typeof config === 'number' ? undefined : config?.onRetry;
  const onRetrySettled = typeof config === 'number' ? undefined : config?.onRetrySettled;
  const requestMethod = (options?.method || 'GET').toUpperCase();
  const canRetryRequest = RETRYABLE_METHODS.has(requestMethod);
  const isMutation = !RETRYABLE_METHODS.has(requestMethod);

  if (!skipGlobalCooldown && !isAuthEndpoint(url)) {
    const cooldownMs = getRateLimitRemainingMs(isMutation);
    if (cooldownMs > 0) {
      throw new RateLimitError(cooldownMs);
    }
  }

  let lastError: Error | null = null;
  let didRetryAfterRefresh = false;
  let didRetryAfterCsrf = false;

  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Inject CSRF token for mutation requests (not auth endpoints)
        let requestOptions = options;
        if (CSRF_METHODS.has(requestMethod) && !isAuthEndpoint(url)) {
          const csrfToken = getCsrfToken();
          if (csrfToken) {
            const headers = new Headers(options?.headers);
            headers.set('X-CSRF-Token', csrfToken);
            requestOptions = { ...options, headers };
          }
        }

        const response = await fetch(url, requestOptions);

        if (response.status === 401 && !didRetryAfterRefresh && !isAuthEndpoint(url)) {
          const refreshed = await refreshSession();
          if (refreshed) {
            didRetryAfterRefresh = true;
            // After successful token refresh, retry the original request.
            // The refreshed auth_token cookie is sent automatically if
            // the caller includes credentials: 'include' in the options.
            continue;
          }

          await recoverExpiredSession();
          return response;
        }

        if (response.status === 401 && didRetryAfterRefresh && !isAuthEndpoint(url)) {
          await recoverExpiredSession();
        }

        // Handle 403 CSRF token errors — silent retry with fresh token
        if (response.status === 403 && !didRetryAfterCsrf && !isAuthEndpoint(url)) {
          try {
            const clonedResponse = response.clone();
            const body = await clonedResponse.json().catch(() => null);

            if (extractErrorCode(body) === 'EBADCSRFTOKEN') {
              // Trigger middleware to refresh CSRF cookie via lightweight GET request
              await fetch('/api/auth/session', { method: 'GET', credentials: 'include' });

              // Wait briefly for cookie to propagate
              await sleep(100);

              didRetryAfterCsrf = true;
              continue; // Retry with fresh token
            }
          } catch {
            // If CSRF retry setup fails, continue with normal 403 handling
          }
        }

        // If CSRF retry also failed, show persistent error
        if (response.status === 403 && didRetryAfterCsrf && !isAuthEndpoint(url)) {
          try {
            const clonedResponse = response.clone();
            const body = await clonedResponse.json().catch(() => null);

            if (extractErrorCode(body) === 'EBADCSRFTOKEN') {
              toast.error('Session error, please refresh the page');
              return response;
            }
          } catch {
            // Continue with normal 403 handling
          }
        }

        // Handle 403 unverified_email errors — redirect to dedicated error page
        if (response.status === 403 && !isAuthEndpoint(url)) {
          try {
            // Clone response to read body without consuming original
            const clonedResponse = response.clone();
            const body = await clonedResponse.json().catch(() => null);

            if (extractErrorCode(body) === 'unverified_email') {
              if (typeof window !== 'undefined') {
                window.location.replace('/auth/unverified-email');
              }
              return response;
            }
          } catch {
            // If parsing fails, continue with normal response handling
          }
        }

        // Handle 429 Too Many Requests — retry with backoff
        if (response.status === 429) {
          // When skipGlobalCooldown is set, return the raw response so the
          // caller can read the body and show a domain-specific error message
          // instead of the generic RateLimitError.
          if (skipGlobalCooldown) return response;

          const retryAfterHeader = response.headers.get('Retry-After');
          const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : NaN;
          const cooldownMs = !isNaN(retryAfterSeconds) && retryAfterSeconds > 0
            ? retryAfterSeconds * 1000
            : MAX_RATE_LIMIT_WINDOW_MS;
          setRateLimitCooldown(cooldownMs, isMutation);

          const rateLimitRetryCap = Math.min(MAX_RATE_LIMIT_RETRIES, maxRetries);
          const shouldFailFast =
            !canRetryRequest ||
            cooldownMs >= LONG_RATE_LIMIT_THRESHOLD_MS || attempt >= rateLimitRetryCap;

          if (shouldFailFast) {
            throw new RateLimitError(cooldownMs);
          }

          console.warn(
            `Rate limited (429). Retrying in ${Math.round(cooldownMs / 1000)}s (attempt ${attempt + 1}/${rateLimitRetryCap})...`
          );

          await sleep(cooldownMs);
          continue;
        }

        // Handle transient server errors with backoff.
        // Skip non-transient statuses like 501 (Not Implemented) to fail fast.
        if (canRetryRequest && RETRYABLE_SERVER_STATUSES.has(response.status) && attempt < maxRetries) {
          const delay = calculateBackoff(attempt);
          console.warn(
            `Server error (${response.status}). Retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${maxRetries})...`
          );
          await sleep(delay);
          continue;
        }

        // Mutation 503 retry with dedicated counter (independent of outer loop maxRetries)
        if (!canRetryRequest && response.status === 503) {
          for (let mutationAttempt = 1; mutationAttempt <= MUTATION_MAX_RETRIES; mutationAttempt++) {
            const delay = calculateBackoff(mutationAttempt - 1);
            onRetry?.(mutationAttempt, MUTATION_MAX_RETRIES);
            console.warn(`Mutation 503 — retrying (attempt ${mutationAttempt}/${MUTATION_MAX_RETRIES})...`);
            await sleep(delay);

            try {
              // Re-inject CSRF token for retry
              let retryOptions = options;
              if (CSRF_METHODS.has(requestMethod) && !isAuthEndpoint(url)) {
                const csrfToken = getCsrfToken();
                if (csrfToken) {
                  const headers = new Headers(options?.headers);
                  headers.set('X-CSRF-Token', csrfToken);
                  retryOptions = { ...options, headers };
                }
              }

              const retryResponse = await fetch(url, retryOptions);
              if (retryResponse.status !== 503) {
                return retryResponse;
              }
            } catch (retryError) {
              // Network error during retry — continue trying
              if (mutationAttempt >= MUTATION_MAX_RETRIES) {
                throw retryError instanceof Error ? retryError : new Error(String(retryError));
              }
            }
          }
          // All 5 retries exhausted — return the original 503 response
          return response;
        }

        // All other responses (2xx, 3xx, 4xx) — return immediately, don't retry
        return response;
      } catch (error) {
        if (error instanceof RateLimitError) {
          throw error;
        }

        // Network error or fetch failure
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!canRetryRequest || attempt >= maxRetries) {
          // Fire onRetry for mutation network errors so overlay/toast appears
          if (!canRetryRequest) {
            onRetry?.(attempt + 1, MUTATION_MAX_RETRIES);
          }
          throw new Error(
            canRetryRequest
              ? `Request failed after ${maxRetries} retries: ${lastError.message}`
              : `Request failed: ${lastError.message}`
          );
        }

        const delay = calculateBackoff(attempt);
        console.warn(
          `Network error: ${lastError.message}. Retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${maxRetries})...`
        );

        await sleep(delay);
      }
    }
  } finally {
    onRetrySettled?.();
  }

  // Should never reach here, but TypeScript needs this
  throw lastError ?? new Error('Fetch failed for unknown reason');
}
