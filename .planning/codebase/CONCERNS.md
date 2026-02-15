# Codebase Concerns

**Analysis Date:** 2025-02-16

## Tech Debt

**Generic Error Messages in API Routes:**
- Issue: API routes catch all errors with generic `{ error: 'Failed to [operation]' }` responses, making debugging difficult
- Files: `src/app/api/guilds/[guildId]/posts/route.ts`, `src/app/api/guilds/[guildId]/bulk/delete/route.ts`, `src/app/api/guilds/[guildId]/settings/route.ts`
- Impact: Production errors provide no context; support teams can't diagnose issues without server logs
- Fix approach: Log actual error details server-side while returning safe client messages. Consider structured logging with request IDs for tracing

**Global State in `fetch-with-retry.ts`:**
- Issue: Module-level mutable state (`globalRateLimitUntil`, `refreshPromise`, `sessionRecoveryInProgress`) at lines 29-31
- Files: `src/lib/fetch-with-retry.ts`
- Impact: In server contexts (Next.js middleware or API routes), this state persists across requests and could cause race conditions. Multiple simultaneous requests from different users could interfere
- Fix approach: Move state to React Query's mutation cache or context. For server-side usage, don't rely on global state; pass session state in request context
- Current mitigation: Code appears client-focused (uses `window` and cookies), but mixing client/server logic is risky

**Type Casting Without Validation:**
- Issue: Multiple `as` casts and `as unknown as` patterns (112 instances across codebase)
- Files: Throughout src/ - examples in `src/hooks/use-tracking.ts` line 131 (`as Promise<AccountsResponse>`), export filter components
- Impact: Type assertions bypass type safety; if response structure differs, code fails silently or crashes
- Fix approach: Use runtime validation libraries (Zod already in dependencies) to validate API responses before casting

**Missing Test Coverage:**
- Issue: Zero test files found in codebase (no `.test.ts`, `.spec.ts` files)
- Files: N/A
- Impact: Regression risk on complex logic like `fetchWithRetry` exponential backoff, session refresh flows, bulk operations
- Fix approach: Add Jest/Vitest config and unit tests for: auth flows, error handling, data transformations, export logic

## Known Issues

**Session Refresh Race Condition Potential:**
- Symptoms: Two concurrent requests both receiving 401 could both trigger refresh flow
- Files: `src/lib/fetch-with-retry.ts` lines 197-213, `src/app/api/auth/refresh/route.ts`
- Trigger: Rapid sequential requests after token expiration
- Current mitigation: `refreshPromise` variable (lines 122-141) deduplicates concurrent refresh attempts. However, this is single-process state and won't work in distributed deployments
- Safe approach: Document that this only works in single-process environments; plan for distributed session cache in future

**Missing Error Details in Response JSON:**
- Symptoms: Client receives generic errors; can't determine if 401 is token expired, insufficient permissions, or server error
- Files: All API route handlers
- Trigger: Any failed request
- Workaround: Add specific error codes to responses (e.g., `{ error: 'FORBIDDEN', code: 'INSUFFICIENT_PERMISSIONS' }`)

**Uncaught Promise Rejection in `recoverExpiredSession`:**
- Symptoms: Logout call in line 152 uses `.catch(() => undefined)` - errors are silently swallowed
- Files: `src/lib/fetch-with-retry.ts` lines 152-156
- Trigger: Network failure during session recovery
- Impact: User may see redirect to login but session cleanup incomplete
- Safe approach: Log the error with console.warn before suppressing it

## Security Considerations

**Cookie Domain Calculation in OAuth Flow:**
- Risk: Complex domain normalization logic (lines 26-48 in `src/app/api/auth/login/route.ts`) could be bypassed by malformed requests
- Files: `src/app/api/auth/login/route.ts`
- Current mitigation: Regex validation for IP addresses and localhost handling, domain parts filtering
- Recommendations:
  - Add integration tests for edge cases (numeric domains, multi-TLD, special chars)
  - Consider using a well-tested library (e.g., `tldjs`) instead of custom parsing

**Auth Token in URL Parameters:**
- Risk: `guildId` parameter forwarded directly to backend API without validation
- Files: `src/app/api/guilds/[guildId]/posts/route.ts` line 24, similar patterns in other guild routes
- Current mitigation: Backend enforces guild membership check
- Recommendations:
  - Add client-side validation that guildId is a valid Discord snowflake (numeric)
  - Consider using `z.coerce.string().length(18)` validation if possible

**CSRF Token Handling:**
- Risk: CSRF token extracted from cookie but only conditionally forwarded (line 57-60 in refresh route)
- Files: `src/app/api/auth/refresh/route.ts`
- Current mitigation: Only forwarded if available
- Recommendations:
  - Clarify if backend enforces CSRF validation for cookie-based requests
  - Ensure all state-changing mutations include CSRF token

## Performance Bottlenecks

**Infinite Scroll with Client-Side Filtering:**
- Problem: Accounts page loads all pages in memory then filters client-side (lines 100-116 in accounts/page.tsx)
- Files: `src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx`
- Cause: Backend may not support all filter combinations (see comment line 99)
- Scaling impact: With 10k accounts across 10 pages, filtering happens on full dataset in memory
- Improvement path:
  - Implement backend filters for platform and group to avoid loading unwanted pages
  - Add pagination reset when filters change (currently loads from page 1 but keeps previous pages)

**Export Processing:**
- Problem: Excel export builds entire ZIP in memory before downloading
- Files: `src/lib/posts-excel-export.ts` (398 lines)
- Cause: XLSX format requires building complete file structure before writing
- Scaling impact: Large datasets (>50k posts) could exhaust heap memory
- Improvement path:
  - For large exports, stream response in chunks or use server-side processing
  - Add progress tracking with estimated file size before download begins
  - Consider server-side export job queue for very large datasets

**Rate Limit Cooldown Global State:**
- Problem: Single `globalRateLimitUntil` timestamp blocks all non-auth requests during cooldown
- Files: `src/lib/fetch-with-retry.ts` lines 31, 112-119, 184-187
- Cause: Applies to entire application vs per-endpoint
- Impact: One endpoint hitting rate limit prevents other endpoints from working
- Improvement path: Track per-endpoint rate limit state using Map keyed by URL/domain

**Re-render Cycles in Large Tables:**
- Problem: 81 useCallback/useEffect/useMemo hooks across codebase without dependency analysis
- Files: Various component files
- Risk: Missing dependencies could cause stale closures; too many dependencies cause excessive re-renders
- Safe approach: Audit top components (audit-log-table.tsx, accounts/page.tsx) for unnecessary memoization

## Fragile Areas

**Session Refresh Flow:**
- Files: `src/lib/fetch-with-retry.ts`, `src/app/api/auth/refresh/route.ts`, `src/middleware.ts`
- Why fragile: Multi-step flow involving middleware, client retry logic, and server state. Points of failure:
  1. Cookie middleware intercepts refresh flow (could clear tokens prematurely)
  2. Browser cookie storage inconsistency between refresh call and retry
  3. Race between token expiration and user navigating to protected route
- Safe modification: Only modify after understanding entire flow (documented in fetch-with-retry.ts comments). Add integration tests for scenarios: expired token, concurrent requests, tab switching
- Test coverage: None currently; critical path untested

**Bulk Operations Mutability:**
- Files: `src/hooks/use-guilds.ts` lines 229-284 (delete/reassign mutations)
- Why fragile: Optimistic updates without proper rollback validation. If network fails but client shows success, user confused
- Safe modification: Always check `onSettled` actually refetches from server before declaring victory
- Test coverage: No tests for mutation error scenarios

**Export History State Persistence:**
- Files: `src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx` lines 50-62 (export modal state)
- Why fragile: Multiple state variables (showAddModal, showDeleteConfirm, showReassignModal) with no single source of truth
- Risk: User confirms delete, modal doesn't close, UI shows inconsistent state
- Safe modification: Consider state machine pattern for modal flows

**Type Safety Gaps in API Responses:**
- Files: Throughout hooks - `use-tracking.ts`, `use-guilds.ts`, `use-audit-log.ts`
- Why fragile: Responses parsed as typed without validation; if backend changes response structure, frontend crashes
- Current code: `response.json() as Promise<AccountsResponse>` (no validation)
- Safe approach: Add Zod schema validation; let validation failures surface in error handling

## Scaling Limits

**Single-Process Session State:**
- Current capacity: Works in development and small deployments (single Next.js process)
- Limit: Breaks when deploying to serverless or multi-process environments
- Files: `src/lib/fetch-with-retry.ts` lines 29-31
- Scaling path:
  1. Extract session state to shared Redis cache
  2. Use Redis-backed mutation cache for rate limiting
  3. Each request operates on independent state copy

**Infinite Scroll Pagination Memory:**
- Current capacity: Pages cached in React Query; staleTime 2-5 minutes
- Limit: User scrolls through 100+ pages (10k+ items), React Query cache grows unbounded
- Files: `src/hooks/use-tracking.ts` (useInfiniteQuery), accounts/page.tsx
- Scaling path:
  1. Set `keepPreviousData: false` to discard old pages
  2. Implement manual cache eviction for older pages
  3. Use virtual scrolling library for large lists instead of infinite scroll

**SSE Connection Pooling:**
- Current capacity: One EventSource per status endpoint per component
- Limit: If 100 users each open a guild dashboard, 100 concurrent connections
- Files: `src/hooks/use-sse.ts`, `src/hooks/use-guilds.ts` line 103-106
- Scaling path:
  1. Implement shared SSE connection pooling (one per guild)
  2. Use broadcast channel API to notify multiple components of updates
  3. Add connection limits with queue fallback

## Dependencies at Risk

**Version Mismatches:**
- Risk: `@next/bundle-analyzer` is v16.1.6 (newer than Next.js 14.2.35 in production)
- Impact: Potential API incompatibilities
- Files: `package.json` line 28
- Migration plan: Lock all @next/* packages to match main Next.js version

**React 18 with React Query 5:**
- Current: Both are latest versions
- Risk: React 18 Suspense/concurrent features not fully integrated with React Query
- Files: All client components using `useQuery`
- Mitigation: Current code uses traditional query state management; no risk from new features

## Missing Critical Features

**No Error Boundary Components:**
- Problem: Application has no React Error Boundaries
- Blocks: Cannot gracefully handle render-time errors; full page crashes
- Impact: Any component error affects entire dashboard
- Fix: Add `error.tsx` (Next.js convention) and ErrorBoundary wrapper

**No Request/Response Logging:**
- Problem: No structured logging for debugging
- Blocks: Cannot trace request flow or diagnose timing issues
- Current workaround: console.warn in fetchWithRetry (lines 230-244)
- Fix: Implement request-scoped logging with request ID propagation

**No Offline Support:**
- Problem: Network failures show generic error; no queue of pending mutations
- Blocks: Users on flaky networks experience data loss (queued operations lost on refresh)
- Fix: Implement service worker with background sync for mutations

**No Monitoring/Alerting:**
- Problem: Errors not tracked; high rate limit errors not alerted on
- Blocks: Cannot detect widespread issues until users report
- Fix: Integrate error tracking (Sentry) and metrics (Datadog/NewRelic)

## Test Coverage Gaps

**Session Refresh Flow:**
- What's not tested: Full retry cycle including token expiration, refresh call, and retry
- Files: `src/lib/fetch-with-retry.ts` lines 121-214, `src/app/api/auth/refresh/route.ts`
- Risk: Session recovery could fail silently with only 401 redirecting to login
- Priority: High - affects all authenticated requests

**Export Formatting Edge Cases:**
- What's not tested: Excel export with special characters, NULL metrics, missing dates
- Files: `src/lib/posts-excel-export.ts` (398 lines of custom XLSX building)
- Risk: Corrupted exports or malformed XML
- Priority: Medium - only affects export feature

**Bulk Operation Failures:**
- What's not tested: Network failure partway through delete/reassign, timeout scenarios
- Files: `src/hooks/use-guilds.ts` mutation handlers, bulk operation components
- Risk: Inconsistent state (some items deleted, some not)
- Priority: Medium - affects data integrity

**Rate Limit Recovery:**
- What's not tested: Exponential backoff calculation, jitter distribution, Retry-After parsing
- Files: `src/lib/fetch-with-retry.ts` lines 50-85, 216-236
- Risk: Rate limit logic fails; client ignores cooldown and hammers API
- Priority: High - affects reliability under load

**Component State Machines:**
- What's not tested: Modal open/close sequences, filter state interactions
- Files: `src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx` (399 lines of complex UI state)
- Risk: Modal gets stuck open, filters reset unexpectedly
- Priority: Medium - affects UX

---

*Concerns audit: 2025-02-16*
