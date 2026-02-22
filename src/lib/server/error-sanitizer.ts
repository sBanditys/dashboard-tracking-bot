/**
 * Error sanitization utility for preventing information leakage
 *
 * Ensures backend error responses never contain:
 * - Stack traces
 * - File paths
 * - Internal implementation details
 * - Database schema information
 *
 * Returns contextual error messages describing WHAT failed, while
 * preserving error codes needed for client-side logic.
 */

// New envelope shape from backend (Stripe-inspired)
// TODO(v1.3): Remove old envelope support after backend fully migrates
interface NewBackendErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

// Old envelope shape (flat) — existing BackendError interface covers this
interface BackendError {
  message?: string;
  error?: string;
  code?: string;
  stack?: string;
  details?: unknown;
  statusCode?: number;
}

/**
 * Type guard: returns true if body matches the new nested error envelope shape.
 */
function isNewEnvelope(body: unknown): body is NewBackendErrorEnvelope {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as Record<string, unknown>).error === 'object' &&
    (body as Record<string, unknown>).error !== null
  );
}

/**
 * Extract error code and message from either backend envelope shape.
 * New shape: { error: { code, message } }
 * Old shape: { error: string, code? }
 * TODO(v1.3): Remove old envelope support
 */
function extractBackendError(body: unknown): { code?: string; message?: string } {
  if (isNewEnvelope(body)) {
    return { code: body.error.code, message: body.error.message };
  }
  // Old flat shape
  const old = (typeof body === 'object' && body !== null ? body : {}) as BackendError;
  return {
    code: old.code,
    message: old.message || (typeof old.error === 'string' ? old.error : undefined),
  };
}

export interface SanitizedError {
  error: string;  // Use "error" key to match existing codebase convention (routes use { error: '...' })
  code?: string;
}

/**
 * Map of known backend error codes to user-friendly messages
 */
const FRIENDLY_MESSAGES: Record<string, string> = {
  'GUILD_NOT_FOUND': 'Server not found',
  'ACCOUNT_NOT_FOUND': 'Account not found',
  'BRAND_NOT_FOUND': 'Brand not found',
  'INSUFFICIENT_PERMISSIONS': "You don't have permission to perform this action",
  'VALIDATION_ERROR': 'Invalid input provided',
  'RATE_LIMIT_EXCEEDED': 'Too many requests. Please try again later',
  'DUPLICATE_ENTRY': 'This item already exists',
  'NOT_FOUND': 'Resource not found',
  'UNAUTHORIZED': 'Authentication required',
  'FORBIDDEN': 'Access denied',
  'unverified_email': 'Email verification required',
};

/**
 * Detects if a message is safe to forward to the client
 *
 * Blocks:
 * - Stack traces
 * - File paths
 * - Internal error class names
 * - Network/connection errors
 * - Database schema information
 */
function isMessageSafe(message: string): boolean {
  if (!message || message.length > 200) return false;

  // Block stack traces, file paths, internal errors
  const unsafePatterns = [
    /at\s+\w+\s*\(/,        // Stack trace lines: "at Function ("
    /\/[\w.-]+\/[\w.-]+/,    // File paths: /src/lib/...
    /Error:\s/,              // Error class names: "PrismaClientKnownRequestError: ..."
    /ECONNREFUSED/,          // Network errors
    /ETIMEDOUT/,             // Timeout errors
    /prisma/i,               // Prisma internals
    /\\n\s+at\s/,            // Multi-line stack traces
    /column\s+"?\w+"?\s/i,   // Database column references
    /relation\s+"?\w+"?\s/i, // Database relation references
    /constraint\s+"?\w+"?\s/i, // Database constraint references
  ];

  return !unsafePatterns.some(pattern => pattern.test(message));
}

/**
 * Sanitizes backend error responses to prevent information leakage
 *
 * @param statusCode - HTTP status code from backend
 * @param backendResponse - Raw backend response data
 * @param context - Contextual action description (e.g., "load accounts", "update settings")
 * @returns Sanitized error object safe to return to client
 */
export function sanitizeError(
  statusCode: number,
  backendResponse: unknown,
  context: string
): SanitizedError {
  // Extract error code and message from either old or new backend envelope shape
  const { code, message } = extractBackendError(backendResponse);

  // Preserve known error codes for client-side logic
  // (e.g., 'unverified_email' triggers redirect in fetchWithRetry)
  if (code && FRIENDLY_MESSAGES[code]) {
    return { error: FRIENDLY_MESSAGES[code], code };
  }

  // Check if the backend message is safe to forward
  const backendMsg = message || '';
  if (backendMsg && isMessageSafe(backendMsg)) {
    return { error: backendMsg, ...(code && { code }) };
  }

  // Fallback to contextual generic messages per user decision:
  // "Contextual error messages that describe WHAT failed"
  const contextualMessages: Record<number, (ctx: string) => string> = {
    400: (ctx) => `Invalid ${ctx} data`,
    403: (ctx) => `You don't have permission to ${ctx}`,
    404: (ctx) => `${ctx} not found`,
    409: (ctx) => `Conflict while trying to ${ctx}`,
    422: (ctx) => `Invalid ${ctx} data`,
    429: () => 'Too many requests. Please try again later',
    500: (ctx) => `Failed to ${ctx}`,
    502: (ctx) => `${ctx} service unavailable`,
    503: (ctx) => `${ctx} service temporarily unavailable`,
  };

  const getMessage = contextualMessages[statusCode] || contextualMessages[500];
  return { error: getMessage(context), ...(code && { code }) };
}

/**
 * Helper for catch blocks - returns safe internal error message
 *
 * Use this for errors caught during internal operations that should
 * NEVER leak implementation details to the client.
 *
 * @param context - Contextual action description (e.g., "load accounts")
 * @returns Sanitized error object
 */
export function internalError(context: string): SanitizedError {
  return { error: `Failed to ${context}` };
}
