# Phase 24: Tech Debt & Shared Utilities - Research

**Researched:** 2026-03-09
**Domain:** Code cleanup, security fix (open redirect), component wiring, utility extraction
**Confidence:** HIGH

## Summary

This phase is pure cleanup with no new dependencies or complex patterns. All four requirements involve modifying existing files in well-understood ways: removing dead code paths, adding a URL validation check, wiring an existing component, and extracting a function to a shared module.

Every target file has been read and analyzed. The changes are surgical, low-risk, and fully specified by the CONTEXT.md decisions. No external research was needed -- all work is internal to the existing codebase.

**Primary recommendation:** Execute all four DEBT items in a single plan (two waves max). The changes are independent and small enough that splitting into multiple plans adds overhead without benefit.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **validators.ts (DEBT-04):** Delete the entire file -- all 6 exports are dead code with 0 imports
- **formatCents extraction:** Move `centsToDisplay` from `src/hooks/use-bonus.ts` to new `src/lib/format.ts`. Keep name `centsToDisplay`. Update all 5 bonus component imports to `@/lib/format` directly -- no re-export. Only `centsToDisplay` in format.ts.
- **Error envelope cleanup (DEBT-01):** Strip old flat envelope paths only. Remove `b.code` fallback in `extractErrorCode()` (fetch-with-retry.ts lines 129-143). Remove `BackendError` interface and flat-shape fallback in `extractBackendError()` (error-sanitizer.ts). Remove all `TODO(v1.3)` comments and update JSDoc.
- **Callback redirect fix (DEBT-02):** Relative paths only -- callbackUrl must start with `/`. If validation fails, silently redirect to `/`. No same-origin check needed.
- **ConnectionIssuesBanner (DEBT-03):** Straightforward wiring to posts page, same pattern as accounts page.

### Claude's Discretion
- ConnectionIssuesBanner placement on posts page -- straightforward wiring
- Exact ordering of cleanup tasks within plans
- Whether to split into one or multiple plans

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEBT-01 | Old error envelope support removed from fetch-with-retry.ts and error-sanitizer.ts | Exact lines identified: extractErrorCode lines 129-143 (remove old `b.code` path), error-sanitizer.ts lines 26-33 (remove `BackendError` interface) and lines 58-63 (remove old flat-shape fallback in `extractBackendError`). Three call sites of extractErrorCode confirmed at lines 308, 329, 345 -- all use new envelope path already. |
| DEBT-02 | callbackUrl open redirect fixed with same-origin validation | Target: `src/app/auth/callback/page.tsx` lines 124-130. Currently reads `auth_callback_url` from sessionStorage with no validation. Fix: check `callbackUrl.startsWith('/')` before using it. |
| DEBT-03 | ConnectionIssuesBanner wired to posts page | Component exists at `src/components/connection-issues-banner.tsx`. Accounts page pattern confirmed: import component, place after `<GuildTabs>`, pass `isError` and `!!data` props. Posts page already has `isError` and `data` from `usePostsInfinite`. |
| DEBT-04 | validators.ts dead code removed | File at `src/lib/validators.ts` (60 lines). Confirmed zero imports across entire `src/` directory. Safe to delete entirely. |
</phase_requirements>

## Standard Stack

No new libraries needed. All changes use existing project dependencies.

### Core (already installed)
| Library | Purpose | Relevance |
|---------|---------|-----------|
| Next.js | App router, pages | callback/page.tsx and posts/page.tsx modifications |
| React | Components | ConnectionIssuesBanner wiring |
| TypeScript | Type safety | Interface removal, JSDoc updates |

## Architecture Patterns

### Pattern 1: ConnectionIssuesBanner Wiring (DEBT-03)

**What:** Import and place banner after GuildTabs, passing query state props
**Reference:** Accounts page (`src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx` line 279)

```tsx
// Import
import { ConnectionIssuesBanner } from '@/components/connection-issues-banner'

// Place after GuildTabs (posts/page.tsx, after line 260)
<GuildTabs guildId={guildId} />
<ConnectionIssuesBanner isError={isError} hasData={!!data} />
```

Posts page already destructures `isError` and `data` from `usePostsInfinite` (line 78 and 76).

### Pattern 2: Utility Extraction (formatCents)

**What:** Move function to shared module, update imports
**Source:** `src/hooks/use-bonus.ts` line 40-42
**Target:** New file `src/lib/format.ts`

```typescript
// src/lib/format.ts
/**
 * Convert cents to dollar display string: e.g. 5000 -> "$50.00"
 */
export function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
```

5 files need import updates (all change `from '@/hooks/use-bonus'` to `from '@/lib/format'`):
1. `src/components/bonus/round-card.tsx` (line 7)
2. `src/components/bonus/create-round-modal.tsx` (line 11)
3. `src/components/bonus/payments-tab.tsx` (line 7)
4. `src/components/bonus/results-tab.tsx` (line 5)
5. `src/components/bonus/leaderboard-tab.tsx` (line 7)

Each file imports other things from `use-bonus` too, so the `centsToDisplay` import just gets split out.

### Pattern 3: Open Redirect Fix (DEBT-02)

**What:** Validate callbackUrl starts with `/` before using it
**Location:** `src/app/auth/callback/page.tsx` lines 128-130

```typescript
// Before (vulnerable):
if (callbackUrl) {
  sessionStorage.removeItem('auth_callback_url')
  router.replace(callbackUrl)
}

// After (fixed):
if (callbackUrl && callbackUrl.startsWith('/')) {
  sessionStorage.removeItem('auth_callback_url')
  router.replace(callbackUrl)
} else if (callbackUrl) {
  // Invalid callback URL (potential open redirect), clean up and go home
  sessionStorage.removeItem('auth_callback_url')
  router.replace('/')
}
```

### Pattern 4: Error Envelope Cleanup (DEBT-01)

**fetch-with-retry.ts changes:**
- `extractErrorCode` (lines 129-143): Remove old `b.code` path (line 142), keep only new envelope path. Update JSDoc to remove "Old shape" reference and TODO.

```typescript
// After cleanup:
/**
 * Extract error code from the backend error envelope.
 * Shape: { error: { code } }
 */
function extractErrorCode(body: unknown): string | undefined {
  if (body === null || typeof body !== 'object') return undefined;
  const b = body as Record<string, unknown>;
  if (typeof b.error === 'object' && b.error !== null) {
    return (b.error as Record<string, unknown>).code as string | undefined;
  }
  return undefined;
}
```

**error-sanitizer.ts changes:**
- Remove `BackendError` interface (lines 26-33)
- Simplify `extractBackendError` to only handle new envelope (remove old flat-shape fallback lines 58-63)
- Remove `isNewEnvelope` guard (no longer needed when only one shape exists) -- inline the check
- Remove all `TODO(v1.3)` comments (lines 15, 52)
- Update JSDoc on file header and `extractBackendError`

```typescript
// After cleanup:
/**
 * Extract error code and message from the backend error envelope.
 * Shape: { error: { code, message } }
 */
function extractBackendError(body: unknown): { code?: string; message?: string } {
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as Record<string, unknown>).error === 'object' &&
    (body as Record<string, unknown>).error !== null
  ) {
    const envelope = body as { error: { code: string; message: string } };
    return { code: envelope.error.code, message: envelope.error.message };
  }
  return {};
}
```

Note: `isNewEnvelope` type guard can either be kept (renamed, JSDoc updated) or inlined into `extractBackendError`. Since it's only used in one place, inlining is cleaner but either approach works.

### Anti-Patterns to Avoid
- **Do not simplify/inline the remaining new-envelope logic** in fetch-with-retry.ts beyond removing the old path -- user decision is explicit about this
- **Do not add speculative helpers** to format.ts -- only `centsToDisplay`
- **Do not re-export centsToDisplay from use-bonus.ts** -- direct imports only

## Don't Hand-Roll

Not applicable -- this phase removes code rather than adding it. No new libraries or patterns needed.

## Common Pitfalls

### Pitfall 1: Forgetting an import update for centsToDisplay
**What goes wrong:** TypeScript compilation fails if any of the 5 bonus components still imports from `@/hooks/use-bonus`
**How to avoid:** Run `npx tsc --noEmit` after extraction. Also grep for `centsToDisplay` to ensure no references to old location remain.

### Pitfall 2: Breaking the use-bonus.ts barrel export
**What goes wrong:** Other imports from `use-bonus.ts` break when removing centsToDisplay
**How to avoid:** Only remove the `centsToDisplay` export from use-bonus.ts. The 5 components import other things from use-bonus too (hooks, types) -- those imports must remain, just without centsToDisplay.

### Pitfall 3: Over-simplifying extractBackendError
**What goes wrong:** If you remove too much, the sanitizer returns empty `{}` for valid new-envelope errors
**How to avoid:** Test the new-envelope path still works. The key behavior: `{ error: { code: 'X', message: 'Y' } }` must still return `{ code: 'X', message: 'Y' }`.

### Pitfall 4: Callback URL edge case -- protocol-relative URLs
**What goes wrong:** A URL like `//evil.com/path` starts with `/` but redirects externally
**How to avoid:** The user decision says "must start with `/`" for relative paths. To be safe, check `callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')` to block protocol-relative URLs.

## Code Examples

All code examples are provided in the Architecture Patterns section above, directly from reading the source files.

## Validation Architecture

> `workflow.nyquist_validation` is not set in config.json -- treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | TypeScript compiler (no test runner detected) |
| Config file | `tsconfig.json` |
| Quick run command | `npx tsc --noEmit` |
| Full suite command | `npx tsc --noEmit && npm run build` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEBT-01 | Old envelope paths removed, new paths still work | manual + type-check | `npx tsc --noEmit` | N/A |
| DEBT-02 | Malicious callbackUrl redirects to `/` | manual-only | Manual browser test: set `auth_callback_url` to `https://evil.com` in sessionStorage | N/A |
| DEBT-03 | ConnectionIssuesBanner shows on posts page | manual-only | Visual check: disconnect backend while on posts page | N/A |
| DEBT-04 | validators.ts no longer exists | smoke | `test ! -f src/lib/validators.ts && echo PASS` | N/A |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit`
- **Per wave merge:** `npx tsc --noEmit && npm run build`
- **Phase gate:** Full build green + manual verification of DEBT-02 redirect behavior

### Wave 0 Gaps
None -- no test framework to set up. TypeScript compiler serves as the automated verification for all refactoring changes.

## Open Questions

None. All requirements are fully specified with exact file locations and line numbers. The CONTEXT.md decisions resolve all ambiguity.

## Sources

### Primary (HIGH confidence)
- Direct source file reads of all 7 target files (fetch-with-retry.ts, error-sanitizer.ts, callback/page.tsx, posts/page.tsx, accounts/page.tsx, connection-issues-banner.tsx, validators.ts, use-bonus.ts)
- Grep results confirming zero imports of validators.ts and all 5 centsToDisplay import locations
- CONTEXT.md locked decisions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies
- Architecture: HIGH - all patterns copied from existing codebase (accounts page pattern)
- Pitfalls: HIGH - straightforward refactoring with well-known risks

**Research date:** 2026-03-09
**Valid until:** indefinite (internal codebase cleanup, no external dependency concerns)
