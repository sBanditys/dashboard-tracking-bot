---
phase: 10-frontend-security-hardening
plan: 02
subsystem: dashboard-proxy
tags: [security, error-handling, information-disclosure]
dependency_graph:
  requires: [backend-fetch]
  provides: [error-sanitizer]
  affects: [all-guild-api-routes]
tech_stack:
  added: [error-sanitizer-utility]
  patterns: [contextual-error-messages, unsafe-pattern-detection]
key_files:
  created:
    - src/lib/server/error-sanitizer.ts
  modified:
    - src/app/api/guilds/route.ts
    - src/app/api/guilds/[guildId]/route.ts
    - src/app/api/guilds/[guildId]/settings/route.ts
    - src/app/api/guilds/[guildId]/accounts/route.ts
    - src/app/api/guilds/[guildId]/accounts/[accountId]/route.ts
    - src/app/api/guilds/[guildId]/brands/route.ts
    - src/app/api/guilds/[guildId]/brands/[brandId]/route.ts
    - src/app/api/guilds/[guildId]/posts/route.ts
    - src/app/api/guilds/[guildId]/channels/route.ts
    - src/app/api/guilds/[guildId]/usage/route.ts
    - src/app/api/guilds/[guildId]/audit-log/route.ts
    - src/app/api/guilds/[guildId]/analytics/route.ts
    - src/app/api/guilds/[guildId]/analytics/activity/route.ts
    - src/app/api/guilds/[guildId]/analytics/leaderboard/route.ts
    - src/app/api/guilds/[guildId]/analytics/top-accounts/route.ts
    - src/app/api/guilds/[guildId]/analytics/weekly-submissions/route.ts
    - src/app/api/guilds/[guildId]/status/route.ts
    - src/app/api/guilds/[guildId]/exports/route.ts
    - src/app/api/guilds/[guildId]/exports/[exportId]/route.ts
    - src/app/api/guilds/[guildId]/bulk/delete/route.ts
    - src/app/api/guilds/[guildId]/bulk/reassign/route.ts
    - src/app/api/guilds/[guildId]/trash/route.ts
    - src/app/api/guilds/[guildId]/trash/[itemId]/route.ts
    - src/app/api/guilds/[guildId]/trash/[itemId]/restore/route.ts
decisions:
  - "Use contextual error messages that describe WHAT failed (e.g., 'Failed to load accounts', 'Could not update settings') instead of generic 'something went wrong'"
  - "Preserve known error codes (unverified_email, CSRF codes) for client-side logic while sanitizing message text"
  - "Block unsafe patterns (stack traces, file paths, Prisma errors, DB schema info) via regex detection"
  - "Separate sanitizeError() for backend errors vs internalError() for catch blocks"
metrics:
  duration: 5m 37s
  tasks_completed: 2
  files_modified: 25
  completed_at: 2026-02-16T03:19:44Z
---

# Phase 10 Plan 02: Backend Error Sanitization Summary

**One-liner:** Error sanitization layer prevents information leakage by blocking stack traces, file paths, and internal details from reaching the client while preserving contextual user-friendly messages.

## What Was Built

Implemented a comprehensive error sanitization system for all guild API proxy routes to prevent information disclosure (AUTH-05 requirement). The system ensures backend errors never leak stack traces, file paths, Prisma internals, or database schema information while providing meaningful contextual feedback to users.

### Core Components

1. **Error Sanitizer Utility** (`src/lib/server/error-sanitizer.ts`)
   - `sanitizeError()`: Processes backend error responses with three-tier strategy:
     1. Known error codes → friendly messages (e.g., 'unverified_email' → 'Email verification required')
     2. Safe backend messages → forward if they pass unsafe pattern detection
     3. Fallback → contextual generic messages based on HTTP status code and operation context
   - `internalError()`: Standardized catch block error handler that never leaks details
   - Unsafe pattern detection blocks:
     - Stack traces (`at Function (`, `\n  at `)
     - File paths (`/src/lib/...`)
     - Error class names (`PrismaClientKnownRequestError`)
     - Network errors (`ECONNREFUSED`, `ETIMEDOUT`)
     - Prisma internals
     - Database schema info (column, relation, constraint references)

2. **Guild API Route Coverage** (24 routes sanitized)
   - All routes now use consistent error handling pattern:
     ```typescript
     const data = await response.json()
     if (!response.ok) {
       const sanitized = sanitizeError(response.status, data, 'contextual action')
       return NextResponse.json(sanitized, { status: response.status })
     }
     return NextResponse.json(data)
     ```
   - Catch blocks replaced with `internalError()` helper
   - Removed dangerous `details: String(error)` pattern from exports route

### Security Improvements

**Before:** Raw backend errors forwarded to client
```typescript
const data = await response.json()
return NextResponse.json(data, { status: response.status })
// Could leak: "PrismaClientKnownRequestError: \n    at /src/lib/prisma.ts:42"
```

**After:** Sanitized contextual errors
```typescript
const data = await response.json()
if (!response.ok) {
  const sanitized = sanitizeError(response.status, data, 'load accounts')
  return NextResponse.json(sanitized, { status: response.status })
}
return NextResponse.json(data)
// Returns: { error: "Failed to load accounts" }
```

**Critical leak fixed in exports route:**
- Removed: `{ error: 'Failed to create export', details: String(error) }`
- Now: `internalError('create export')` → `{ error: "Failed to create export" }`

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- ✅ TypeScript compilation passes (`npx tsc --noEmit`)
- ✅ Production build succeeds (`npm run build`)
- ✅ No `details: String(error)` patterns remain in codebase (grep verification)
- ✅ All 24 guild API routes import and use `sanitizeError` (grep verification)
- ✅ Error codes preserved for client-side logic (unverified_email, etc.)
- ✅ SSE/streaming routes unchanged (status/stream, exports/[exportId]/progress)
- ✅ Auth routes unchanged (handle their own error flow)

## Testing Evidence

**Build output:** All routes compiled successfully with no type errors.

**Pattern verification:**
```bash
# No error detail leaks remain
$ grep -r "details: String(error)" src/app/api
# (no results)

# All guild routes sanitize
$ grep -r "sanitizeError" src/app/api/guilds | wc -l
24
```

## Technical Notes

### Contextual Messages per Route

Each route uses an action-specific context string:
- `GET /guilds` → `'load servers'` → "Failed to load servers"
- `PATCH /guilds/[guildId]/settings` → `'update settings'` → "Failed to update settings"
- `POST /guilds/[guildId]/accounts` → `'add account'` → "Failed to add account"
- `DELETE /guilds/[guildId]/trash/[itemId]` → `'permanently delete item'` → "Failed to permanently delete item"

### Error Code Preservation

Known codes (e.g., `unverified_email`, `EBADCSRFTOKEN`) are preserved in sanitized responses:
```json
{ "error": "Email verification required", "code": "unverified_email" }
```

This enables client-side logic like automatic redirects without leaking internals.

### Pattern Detection Examples

**Blocked patterns:**
- `at backendFetch (/Users/dev/dashboard/src/lib/server/backend-fetch.ts:42:15)`
- `PrismaClientKnownRequestError: Invalid constraint "user_email_unique"`
- `ECONNREFUSED: Connection refused at 127.0.0.1:3000`
- `column "guildId" does not exist`

**Safe messages forwarded:**
- "Invalid email format"
- "Account limit reached"
- "Server not found"

## Self-Check: PASSED

**Created files exist:**
```bash
$ [ -f "src/lib/server/error-sanitizer.ts" ] && echo "FOUND"
FOUND
```

**Commits exist:**
```bash
$ git log --oneline | grep -E "(cbf80ad|6995110|818ff7a)"
818ff7a feat(10-02): apply error sanitization to guild API routes (part 2)
6995110 feat(10-02): apply error sanitization to guild API routes (part 1)
cbf80ad feat(10-02): create error sanitizer utility
```

**Modified files verified:**
```bash
$ git show cbf80ad --name-only | tail -1
src/lib/server/error-sanitizer.ts

$ git show 6995110 --stat | grep "files changed"
12 files changed, 96 insertions(+), 28 deletions(-)

$ git show 818ff7a --stat | grep "files changed"
12 files changed, 97 insertions(+), 30 deletions(-)
```

## Impact Assessment

**Security posture:** Significantly improved. Information disclosure vector (AUTH-05) now mitigated across all guild API routes.

**User experience:** Improved. Users now see contextual error messages ("Failed to load accounts") instead of generic messages or leaked technical details.

**Maintainability:** Centralized error handling logic in a single utility. Future routes can import and use the same pattern.

**Performance:** Negligible impact. Sanitization adds minimal overhead (regex checks on error paths only).

## Next Steps

This plan completes AUTH-05 (information disclosure prevention) for the frontend proxy layer. Remaining Phase 10 work:
- 10-03: CSP headers (AUTH-04)
- 10-04: Rate limiting UI (if applicable)
- 10-05: Input validation/sanitization audit

## Commits

- `cbf80ad`: feat(10-02): create error sanitizer utility
- `6995110`: feat(10-02): apply error sanitization to guild API routes (part 1)
- `818ff7a`: feat(10-02): apply error sanitization to guild API routes (part 2)
