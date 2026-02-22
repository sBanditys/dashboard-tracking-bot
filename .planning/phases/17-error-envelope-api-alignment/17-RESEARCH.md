# Phase 17: Error Envelope & API Alignment - Research

**Researched:** 2026-02-22
**Domain:** Error handling infrastructure, CSRF cookie alignment, Zod v4 migration
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Error Message Display
- **Display location:** Toasts for mutation errors, inline for data-loading errors
- **Detail level:** Show backend's human-readable message when available, fall back to generic "An unexpected error occurred. Please try again later." for unparseable responses
- **Unverified email redirect:** Brief toast ("Please verify your email") then redirect after 1-2 seconds
- **Toast behavior:** Dismissible + auto-dismiss after 5s (user can click X or wait)
- **Inline errors:** Always show a "Try again" retry button in error state
- **Rate limit (429):** Show countdown with specific timing (e.g., "Too many requests. Please wait 30 seconds.")
- **Auth errors (401/403):** Toast "Session expired" then redirect to login
- **Network errors:** Distinct message — "Unable to connect. Check your internet connection."
- **HTML safety:** Strip HTML tags from error messages before displaying
- **Validation errors:** Show all field errors at once (not one at a time)
- **Error styling:** Same style for all error types (no visual distinction between client/server errors)
- **Console logging:** Log full error details in development only, silent in production

#### Backward Compatibility Window
- **Dual-parse lifespan:** Transitional — support both envelope shapes now, add TODO comments for old-shape removal in v1.3
- **CSRF cookie name:** Hard switch to `csrf_token` — no fallback to old `_csrf_token` name
- **TypeScript approach:** Typed discriminated union (`OldErrorEnvelope | NewErrorEnvelope`) with type guards
- **TODO tracking:** Code comments (`// TODO(v1.3): Remove old envelope support`) AND deferred requirement in REQUIREMENTS.md
- **Testing:** Dedicated unit tests for both envelope shapes; tests removed when old shape support is removed in v1.3

#### Zod v4 Audit
- **Scope:** Full codebase sweep — find and replace every deprecated Zod v3 pattern
- **Organization:** Extract common validators (email, UUID, etc.) to a shared validation utils file with user-friendly custom error messages
- **Edge cases:** Fix everything now, including complex cases — no TODOs for later
- **v4 adoption:** Use Zod v4's `.check()` and other new patterns where they improve readability, not just minimal replacements
- **Verification:** Runtime tests to verify key schemas still parse correctly after migration
- **Reporting:** Brief changelog of what patterns were replaced and where, documented in the commit/PR
- **Shared file location:** Claude's discretion based on project structure conventions

### Claude's Discretion
- Toast stacking behavior (stack vs replace)
- Error message max length / truncation
- Mutation retry button inclusion (case-by-case)
- Dual-parse priority order (new vs old shape first)
- Code organization of parse logic (centralized vs per-site)
- Shared validators file path

### Deferred Ideas (OUT OF SCOPE)
- Remove old error envelope shape support — v1.3 (after backend fully migrates to new shape)
- Full Zod v4 rewrite beyond pattern replacement — already noted as out of scope in REQUIREMENTS.md
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ERR-01 | Dashboard error sanitizer detects both old `{ error: string }` and new `{ error: { code, message } }` envelope shapes from backend, extracting error code and message correctly from either | error-sanitizer.ts currently only handles old shape; new shape needs type guard and extraction logic |
| ERR-02 | `fetchWithRetry` `unverified_email` code lookup works with both old (`body?.code`) and new (`body?.error?.code`) envelope shapes without breaking email-verification redirect | fetch-with-retry.ts line 293 reads `body?.code` — misses `body?.error?.code` in new shape |
| ERR-03 | CSRF cookie name aligned from `_csrf_token` to `csrf_token` in proxy.ts and fetch-with-retry.ts to match backend convention | proxy.ts uses `_csrf_token` in 3 places; fetch-with-retry.ts uses `_csrf_token` in 1 place; backend uses `csrf_token` |
| ERR-04 | Zod v4 patterns audited — deprecated v3 methods (`z.string().email()`, `z.string().uuid()`, `error.errors`) replaced with v4 equivalents | No Zod usage found in src/ — audit confirms no replacements needed; shared validators file still useful for future |
</phase_requirements>

---

## Summary

Phase 17 is a surgical infrastructure fix with four discrete sub-problems, none of which require new libraries or major architectural changes. Three of the four requirements (ERR-01, ERR-02, ERR-03) are straightforward code changes to existing files. ERR-04 (Zod v4 audit) resulted in a finding: the dashboard codebase has **zero direct Zod usage in `src/`** — it is installed as a dependency but not imported anywhere in application code. The requirement is satisfied by confirming this and creating a shared validators file for future use.

The core technical problem is a **dual-envelope mismatch**: the backend now sends `{ error: { code, message, requestId } }` (new Stripe-inspired shape from `shared/src/lib/apiResponse.ts`), but the dashboard's error sanitizer (`error-sanitizer.ts`) and `fetchWithRetry` were written against the old shape `{ error: string, code?: string }`. The old shape is still generated by some proxy routes (`{ error: 'Unauthorized' }`) and will persist until v1.3.

The CSRF cookie name mismatch (`_csrf_token` in dashboard vs `csrf_token` in backend) is a hard rename — the user decision is a clean switch with no fallback. The proxy generates the cookie; the client reads it. Both must be updated atomically.

**Primary recommendation:** Update `error-sanitizer.ts` first (ERR-01) since it is the centralized error extraction point, then update `fetchWithRetry` (ERR-02), then rename the CSRF cookie (ERR-03). ERR-04 is a confirm-and-document task.

---

## Standard Stack

### Core (already installed, no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | ^4.3.6 | Schema validation | Already installed in package.json |
| sonner | ^2.0.7 | Toast notifications | Already in use throughout codebase |
| TypeScript | ^5 | Type safety for discriminated unions | Project standard |

### No New Installations Required

This phase is purely a code modification phase. All tools are already present.

**Installation:**
```bash
# Nothing to install
```

---

## Architecture Patterns

### Current Error Flow (what exists today)

```
Backend response
  └─ old shape: { error: "string message", code?: "string" }
  └─ new shape: { error: { code: "string", message: "string", requestId: "string" } }

Proxy route (e.g. /api/guilds/[guildId]/accounts/route.ts)
  └─ calls sanitizeError(status, data, context) from error-sanitizer.ts
  └─ returns NextResponse.json(sanitized, { status })
  └─ sanitized shape: { error: "string", code?: "string" }   ← always old shape out

Client hook (e.g. use-guilds.ts, use-alerts.ts)
  └─ const error = await response.json()
  └─ throw new Error(error.message || 'fallback')           ← error.message not error.error!
  └─ onError: toast.error('title', { description: error.message })
```

**Critical finding:** The proxy routes ALWAYS output old shape `{ error: string }` via `sanitizeError`. However, `error-sanitizer.ts` itself only handles old-shape inputs from the backend. When the backend sends new-shape `{ error: { code, message } }`, the sanitizer currently looks at `parsed.code` (top-level) and `parsed.message || parsed.error` — both missing in new shape. This means new-shape backend errors fall through to generic contextual messages, losing the backend's human-readable message.

**Also critical:** Client hooks read `error.message` from the response — but the proxy outputs `{ error: string }`, not `{ message: string }`. This is a pre-existing mismatch. The field is `error.error`, not `error.message`. The hooks currently lose the error message on the floor and display the fallback.

### Recommended Fix Architecture

```
Backend response (either shape)
  └─ error-sanitizer.ts: parseBackendError(body) → extracts { code, message } from either shape
  └─ proxy routes: unchanged (still call sanitizeError, still output { error: string, code? })
  └─ client hooks: read error.error (not error.message) from response

fetchWithRetry.ts:
  └─ unverified_email check: body?.code || body?.error?.code
  └─ CSRF cookie: startsWith('csrf_token=')  (was '_csrf_token=')

proxy.ts:
  └─ setCsrfCookie: name 'csrf_token' (was '_csrf_token')
  └─ CSRF validation: cookies.get('csrf_token') (was '_csrf_token')
  └─ token forward in refreshTokensFromMiddleware: already uses 'csrf_token' in cookieParts (line 73)
    but reads from '_csrf_token' (line 70) — fix the read
```

### Pattern 1: Dual-Envelope Type Guard in error-sanitizer.ts

**What:** Add type guards to detect new vs old backend shape, extract `code` and `message` from either.
**When to use:** Always — the sanitizer is the single extraction point for all proxy routes.

```typescript
// Source: Derived from shared/src/lib/apiResponse.ts ApiErrorBody shape + existing BackendError shape

// New envelope shape from backend (Stripe-inspired)
interface NewBackendErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

// Old envelope shape (flat)
interface OldBackendErrorEnvelope {
  error?: string;
  code?: string;
  message?: string;
}

type BackendErrorEnvelope = NewBackendErrorEnvelope | OldBackendErrorEnvelope;

function isNewEnvelope(body: unknown): body is NewBackendErrorEnvelope {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as Record<string, unknown>).error === 'object' &&
    (body as Record<string, unknown>).error !== null
  );
}

// TODO(v1.3): Remove old envelope support after backend fully migrates
function extractBackendError(body: unknown): { code?: string; message?: string } {
  if (isNewEnvelope(body)) {
    // New shape: { error: { code, message, requestId } }
    return {
      code: body.error.code,
      message: body.error.message,
    };
  }
  // Old shape: { error: string, code?: string, message?: string }
  const old = body as OldBackendErrorEnvelope;
  return {
    code: old.code,
    message: old.message || (typeof old.error === 'string' ? old.error : undefined),
  };
}
```

### Pattern 2: Dual-Code Lookup in fetchWithRetry

**What:** Check both `body?.code` (old shape) and `body?.error?.code` (new shape) for special codes like `unverified_email` and `EBADCSRFTOKEN`.
**When to use:** Anywhere `fetchWithRetry` reads a code from response body.

```typescript
// Source: fetch-with-retry.ts existing pattern + new envelope shape

// Helper to extract error code from either envelope shape
// TODO(v1.3): Remove old envelope support (body?.code path)
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
```

### Pattern 3: CSRF Cookie Name Rename (Hard Switch)

**What:** Rename `_csrf_token` to `csrf_token` everywhere in proxy.ts and fetch-with-retry.ts.
**When to use:** All references atomically — the user decision is no fallback.

```typescript
// proxy.ts — setCsrfCookie function
response.cookies.set('csrf_token', token, {   // was '_csrf_token'
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  httpOnly: false,
  path: '/',
});

// proxy.ts — CSRF validation
const cookieToken = request.cookies.get('csrf_token')?.value;  // was '_csrf_token'

// proxy.ts — refreshTokensFromMiddleware (line 70-73)
const csrfToken = request.cookies.get('csrf_token')?.value;    // was '_csrf_token'
// line 73 already pushes `csrf_token=${...}` — no change needed there

// fetch-with-retry.ts — getCsrfToken()
.find(row => row.startsWith('csrf_token='))    // was '_csrf_token='
```

### Pattern 4: Client-Side Error Message Extraction Fix

**What:** Client hooks read `error.error` not `error.message` from proxy responses. The proxy always outputs `{ error: string, code?: string }`.
**When to use:** All hooks that do `const error = await response.json(); throw new Error(error.message || ...)`.

```typescript
// Current (broken — reads non-existent .message field):
const error = await response.json()
throw new Error(error.message || 'Failed to create threshold')

// Fixed (reads correct .error field from proxy's { error: string } shape):
const body = await response.json()
throw new Error(body.error || 'Failed to create threshold')
```

**Scope:** This pattern appears in ~15 hooks across the codebase. A shared helper is the right approach:

```typescript
// src/lib/parse-api-error.ts (new shared utility)
/**
 * Extracts a human-readable error message from a dashboard API response body.
 * Dashboard API routes always output { error: string, code?: string }.
 */
export function parseApiError(body: unknown, fallback: string): string {
  if (body === null || typeof body !== 'object') return fallback;
  const b = body as Record<string, unknown>;
  return typeof b.error === 'string' ? b.error : fallback;
}
```

### Pattern 5: HTML Stripping Before Display

**User decision:** Strip HTML tags from error messages before displaying.
**Implementation:** Lightweight regex strip — no DOMParser (server-side unsafe) or external library needed.

```typescript
// Simple, safe HTML tag stripper for error messages
function stripHtml(message: string): string {
  return message.replace(/<[^>]*>/g, '').trim();
}
```

**Note:** This should be applied as close to display as possible (inside toast calls), not at the extraction layer, so raw codes remain intact for programmatic use.

### Anti-Patterns to Avoid

- **Reading `error.message` from proxy responses:** Proxy always outputs `{ error: string }`. The field is `.error`, not `.message`. This is the most common current bug.
- **Assuming a single envelope shape:** The backend transition is live. Both shapes will exist simultaneously through v1.3.
- **Falling back to old `_csrf_token` after renaming:** The user decided hard switch — no fallback. If old cookies exist they will simply be ignored (the browser will send `_csrf_token` which the middleware won't find as `csrf_token`). Users with stale sessions will get a fresh CSRF token on next page load since the proxy always sets it on every response.
- **DOMParser for HTML stripping:** Not available in server contexts. Use regex.
- **Logging sensitive error details in production:** `console.log` / `console.error` in production. Gate on `process.env.NODE_ENV === 'development'`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast component | `sonner` (already in use) | Already configured in providers.tsx with theme support |
| Schema validation | Custom validators | `zod` (already installed) | Type inference, composable schemas, v4 already installed |
| Error type narrowing | Complex instanceof chains | TypeScript discriminated unions + type guards | Compile-time safety, zero runtime cost |

**Key insight:** Everything needed is already in the project. This phase is entirely about fixing existing code, not adding infrastructure.

---

## Common Pitfalls

### Pitfall 1: Wrong Field Name on Proxy Output
**What goes wrong:** Hooks read `error.message` from the proxy response, but the proxy always outputs `{ error: string }` — field is `.error`, not `.message`. The error message is silently lost, and the fallback string displays.
**Why it happens:** The `BackendError` interface in `error-sanitizer.ts` has both `.message` and `.error` fields, making it look like `.message` is the right field. But the `SanitizedError` interface (what the proxy actually outputs) only has `.error`.
**How to avoid:** Fix all hooks to read `.error` not `.message` from response body. A shared `parseApiError()` helper enforces this.
**Warning signs:** Mutations always show "Failed to [action]" instead of the actual backend message.

### Pitfall 2: CSRF Cookie Transition — Stale Browser State
**What goes wrong:** After renaming `_csrf_token` to `csrf_token`, users with existing sessions have no `csrf_token` cookie. Their next mutation will fail CSRF validation until the middleware sets the new cookie.
**Why it happens:** The proxy sets the cookie on every request, but only if the user visits a page first. If a user has an existing session and immediately makes a mutation (e.g., after a hot-reload), they may have zero `csrf_token` cookies.
**How to avoid:** The proxy already sets a fresh CSRF cookie on EVERY response (line 203: `setCsrfCookie(response, crypto.randomUUID())`). So the user simply needs one page navigation before mutations work. This is acceptable behavior — the CSRF check already has this property.
**Warning signs:** 403 CSRF errors immediately after deployment. Solved by user refreshing page once.

### Pitfall 3: New Envelope Shape Breaks EBADCSRFTOKEN Detection
**What goes wrong:** `fetchWithRetry` checks `body?.code === 'EBADCSRFTOKEN'` (lines 256, 277). If the CSRF error comes via the new envelope shape (`body.error.code === 'EBADCSRFTOKEN'`), the check fails and the CSRF retry loop doesn't trigger.
**Why it happens:** The proxy itself generates `EBADCSRFTOKEN` in old shape (line 136 of proxy.ts: `{ error: 'Invalid CSRF token', code: 'EBADCSRFTOKEN' }`). But the backend also validates CSRF in some cases. If the backend switches to new shape for CSRF errors, the check fails.
**How to avoid:** Use the `extractErrorCode()` helper for ALL code lookups in `fetchWithRetry`, not just `unverified_email`. Apply it to EBADCSRFTOKEN checks too.
**Warning signs:** CSRF retry loop stops working; users see persistent CSRF errors instead of silent retry.

### Pitfall 4: isNewEnvelope False Positive
**What goes wrong:** The type guard `isNewEnvelope` might match an old-shape response where `error` is accidentally an object (unlikely but defensive).
**Why it happens:** In old shape, `error` is always a string. The guard checks `typeof .error === 'object'` which is robust. But `null` check is also needed since `typeof null === 'object'`.
**How to avoid:** The guard shown above already includes `!== null` check. Include both checks.
**Warning signs:** None in practice — the old shape always has `error` as a string.

### Pitfall 5: Zod "Audit" Finds Nothing — Still Need Deliverable
**What goes wrong:** ERR-04 says "audit Zod v3 patterns" but there are zero Zod imports in `src/`. If the planner creates tasks that search for and replace patterns that don't exist, the tasks will trivially pass or create noise.
**Why it happens:** Zod is installed in `package.json` (v4.3.6) but not yet imported in application code.
**How to avoid:** Plan ERR-04 as: (1) confirm audit finding with grep, (2) create shared validators file (`src/lib/validators.ts`) with v4-native patterns ready for future use, (3) document what was checked and why no replacements were needed.
**Warning signs:** Task says "replace deprecated patterns" but grep finds nothing — that is the correct outcome for this codebase.

---

## Code Examples

Verified patterns from official sources and codebase inspection:

### Existing Backend New Envelope Shape (confirmed from shared/src/lib/apiResponse.ts)
```typescript
// Source: /Users/gabrielleal/Desktop/Tracking Data Bot/shared/src/lib/apiResponse.ts

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

// What sendError() outputs:
res.status(status).json({ error: { code, message, requestId, details? } });
```

### Existing Backend Old Envelope Shape (from proxy routes and some auth routes)
```typescript
// Source: Various proxy routes in dashboard (e.g., route.ts files)
// Also: some auth error paths still using old shape

{ error: 'Unauthorized' }                    // no code, error is string
{ error: 'string message', code: 'CODE' }   // with code, flat
```

### Existing SanitizedError Shape (proxy output, never changes)
```typescript
// Source: src/lib/server/error-sanitizer.ts
export interface SanitizedError {
  error: string;      // always string — the message
  code?: string;      // optional error code
}
```

### Current getCsrfToken() in fetch-with-retry.ts (to be fixed)
```typescript
// Source: src/lib/fetch-with-retry.ts line 114-120
function getCsrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('_csrf_token='))  // ← change to 'csrf_token='
    ?.split('=')[1];
}
```

### Current setCsrfCookie() in proxy.ts (to be fixed)
```typescript
// Source: src/proxy.ts line 104-111
function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set('_csrf_token', token, {  // ← change to 'csrf_token'
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    httpOnly: false,
    path: '/',
  });
}
```

### Zod v4 Native Patterns (for shared validators file)
```typescript
// Source: https://zod.dev/v4/ (Context7: /websites/zod_dev_v4)
// v4-native string format validators — top-level functions

import { z } from 'zod';

// Preferred v4 top-level forms:
export const emailSchema = z.email();           // not z.string().email()
export const uuidSchema = z.uuid();             // not z.string().uuid()
export const urlSchema = z.url();               // not z.string().url()

// Error handling in v4:
const result = schema.safeParse(data);
if (!result.success) {
  // result.error.issues  ← use .issues (v3 had .errors as alias, v4 keeps .issues)
  // z.treeifyError(result.error)  ← replaces deprecated .format() and .flatten()
  result.error.issues.forEach(issue => console.log(issue.message));
}

// .check() for custom refinements (v4 preferred):
const positiveNumber = z.number().check(
  (val) => val > 0,
  'Must be positive'
);
```

### Sonner Toast Duration (confirmed from providers.tsx — no explicit duration set)
```typescript
// Source: src/app/providers.tsx — Toaster is configured without duration
// Default sonner duration is 4000ms. User wants 5s auto-dismiss.
// Add duration to toastOptions in providers.tsx:

<Toaster
  position="top-right"
  visibleToasts={3}
  theme={isLight ? 'light' : 'dark'}
  toastOptions={{
    duration: 5000,   // ← add this (user decision: 5s auto-dismiss)
    style: { ... }
  }}
/>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `z.string().email()` | `z.email()` | Zod v4 (current) | Old form deprecated, still works but removed next major |
| `z.string().uuid()` | `z.uuid()` | Zod v4 (current) | Old form deprecated, still works |
| `error.flatten()` / `error.format()` | `z.treeifyError(error)` | Zod v4 (current) | Old methods deprecated |
| `error.errors` | `error.issues` | Zod v4 (`.errors` was alias) | `.issues` is the canonical name in v4 |
| `{ error: string }` backend shape | `{ error: { code, message } }` | Backend Phase 37 migration | Dashboard must handle both during transition |
| `_csrf_token` cookie | `csrf_token` cookie | Phase 17 (this phase) | Hard switch, no fallback |

**Deprecated/outdated:**
- `z.string().email()`: Deprecated in Zod v4 — works but will be removed in v5
- `z.string().uuid()`: Same as above
- `error.flatten()` / `error.format()`: Deprecated in Zod v4 in favor of `z.treeifyError()`
- `_csrf_token` cookie name: Being renamed to `csrf_token` in this phase to match backend

---

## Open Questions

1. **Does the proxy CSRF check in proxy.ts need updating for the middleware's own validation?**
   - What we know: The proxy generates AND validates CSRF tokens itself (lines 131-138). After rename, it will read `csrf_token` and set `csrf_token`. Since the proxy both reads and writes the same name, and the rename is atomic, this is self-consistent.
   - What's unclear: Are there any other places in the codebase (e.g., test fixtures, e2e tests) that reference `_csrf_token`?
   - Recommendation: Grep for `_csrf_token` across the entire project before committing. Check `.planning/`, `playwright/`, and any config files.

2. **Should the `parseApiError()` helper live in `lib/` or alongside hooks?**
   - What we know: It is consumed by ~15 hooks and potentially by `fetchWithRetry`. Convention in this project is `src/lib/` for shared utilities (api-client.ts, fetch-with-retry.ts, etc.).
   - What's unclear: Claude's discretion per CONTEXT.md.
   - Recommendation: `src/lib/api-error.ts` — consistent with lib pattern, clearly named.

3. **Is `error.errors` (Zod v3 alias) actually present anywhere in src/?**
   - What we know: Grep of `src/` for `\.errors\b` returns only non-Zod matches (`.errors` on a `preview` object in import-validation-display.tsx). No Zod imports exist in src/.
   - What's unclear: Nothing — the audit is clean.
   - Recommendation: Document audit result in commit message. Create `src/lib/validators.ts` with v4-native patterns for future use.

---

## File Map: What Changes Where

### ERR-01: error-sanitizer.ts
**File:** `src/lib/server/error-sanitizer.ts`
**Change:** Add `isNewEnvelope()` type guard and `extractBackendError()` helper. Update `sanitizeError()` to call `extractBackendError()` instead of reading `parsed.code` / `parsed.message` directly.
**Size:** ~30 lines added, 5 lines modified.

### ERR-02: fetch-with-retry.ts
**File:** `src/lib/fetch-with-retry.ts`
**Change:** Add `extractErrorCode()` helper. Update all `body?.code ===` checks to use `extractErrorCode(body) ===`. Add TODO(v1.3) comments.
**Affected lines:** 256 (`EBADCSRFTOKEN`), 277 (`EBADCSRFTOKEN`), 293 (`unverified_email`)
**Size:** ~15 lines added, 3 lines modified.

### ERR-03: CSRF Cookie Rename
**File:** `src/proxy.ts`
**Change:** 3 references from `_csrf_token` to `csrf_token`: setCsrfCookie (line 105), CSRF validation (line 131), refreshTokensFromMiddleware read (line 70).
**File:** `src/lib/fetch-with-retry.ts`
**Change:** 1 reference in getCsrfToken() (line 118).
**Size:** 4 one-line changes total.

### ERR-04: Zod Audit
**Finding:** Zero Zod imports in src/. Audit is clean.
**Deliverable:** Create `src/lib/validators.ts` with v4-native common validators.
**Size:** ~30 lines new file.

### Bonus Fix: Hook Error Message Field
**Files:** All hooks that do `throw new Error(error.message || ...)` — approximately 15 locations across use-alerts.ts, use-tracking.ts, use-guilds.ts, use-email-alerts.ts, use-bulk-operations.ts, use-import.ts, use-trash.ts.
**Change:** `error.message` → `body.error` (reading correct field from `{ error: string }` proxy output).
**Note:** This is a prerequisite for ERR-01 to have any visible effect on the UI — even with correct sanitizer output, hooks reading the wrong field won't show the message.

### Bonus Fix: Toast Duration
**File:** `src/app/providers.tsx`
**Change:** Add `duration: 5000` to `toastOptions` in ThemedToaster.
**Size:** 1 line.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/lib/server/error-sanitizer.ts` — confirmed current SanitizedError shape, BackendError interface, FRIENDLY_MESSAGES
- Codebase: `src/lib/fetch-with-retry.ts` — confirmed exact lines for CSRF cookie read (118), unverified_email check (293), EBADCSRFTOKEN checks (256, 277)
- Codebase: `src/proxy.ts` — confirmed `_csrf_token` at lines 70, 105, 131; `csrf_token` already used in cookieParts push (73)
- Codebase: `/Users/gabrielleal/Desktop/Tracking Data Bot/shared/src/lib/apiResponse.ts` — confirmed `ApiErrorBody` new envelope shape
- Codebase: `/Users/gabrielleal/Desktop/Tracking Data Bot/api/src/middleware/csrf.ts` — confirmed `CSRF_COOKIE_NAME = "csrf_token"` (line 24)
- Context7 `/websites/zod_dev_v4` — confirmed v4 deprecated patterns: `z.string().email()` → `z.email()`, `.flatten()` → `z.treeifyError()`, `.errors` → `.issues`
- Codebase: `package.json` — confirmed zod `^4.3.6` installed; no Zod imports in `src/`

### Secondary (MEDIUM confidence)
- Context7 `/websites/zod_dev_v4` — Zod v4 `.check()` method for custom refinements (verified via Context7, not tested against this specific version)

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- ERR-01 (envelope dual-parse): HIGH — both shapes confirmed from source files, fix pattern is clear
- ERR-02 (unverified_email dual-lookup): HIGH — exact lines identified, fix is a 3-line change
- ERR-03 (CSRF rename): HIGH — exact lines identified, backend constant confirmed
- ERR-04 (Zod audit): HIGH — grep confirmed zero Zod usage in src/; v4 patterns confirmed via Context7
- Hook error message field bug: HIGH — confirmed by reading field names in both interfaces

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stable codebase; no external dependencies changing)
