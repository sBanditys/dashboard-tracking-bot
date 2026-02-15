# Architecture

**Analysis Date:** 2025-02-16

## Pattern Overview

**Overall:** Next.js 14 middleware-based SSR proxy architecture with client-side React Query for data fetching and state management.

**Key Characteristics:**
- Stateless middleware layer (`src/middleware.ts`) that routes authenticated users to dashboard and unauthenticated to login
- Next.js API routes (`src/app/api/*`) act as reverse proxy to backend Express API
- Client-side hooks (`src/hooks/*`) use TanStack React Query for caching, pagination, mutations
- Server-side fetch utilities for SSR-to-backend communication with internal secret headers
- Token-based authentication (JWT access token + refresh token) stored in httpOnly cookies

## Layers

**Middleware Layer:**
- Purpose: Route protection and session validation at request level
- Location: `src/middleware.ts`
- Contains: Cookie-based session check, redirect logic
- Depends on: Next.js Request/Response APIs
- Used by: All routes before handler execution

**API Proxy Layer:**
- Purpose: Forward dashboard requests to backend Express API with auth credentials
- Location: `src/app/api/*` (all route.ts files)
- Contains: API routes that accept frontend requests, add Authorization header, call backend, return response
- Depends on: Backend API at `process.env.NEXT_PUBLIC_API_URL`, `backendFetch()` utility
- Used by: Client-side hooks and browser fetch requests

**Page/Component Layer:**
- Purpose: Render UI and orchestrate data fetching
- Location: `src/app/(dashboard)/**/*.tsx`, `src/app/(auth)/**/*.tsx`
- Contains: Page components (async/server), layout wrappers, error boundaries
- Depends on: Hooks, components, utilities
- Used by: Next.js router

**Hook Layer (Data Fetching & State):**
- Purpose: Encapsulate server communication, caching, mutations
- Location: `src/hooks/use-*.ts`
- Contains: `useQuery()`, `useMutation()`, custom state logic
- Depends on: `fetchWithRetry()`, `apiClient`, React Query
- Used by: Page and component layer

**Component Layer:**
- Purpose: Render UI primitives and feature-specific UI
- Location: `src/components/**/*.tsx`
- Contains: React components (client or server), forms, modals, cards
- Depends on: UI components, hooks, types
- Used by: Page layer, other components

**Utility Layer:**
- Purpose: Shared functions and helpers
- Location: `src/lib/**/*.ts`
- Contains: Fetch wrappers, auth helpers, formatters, CSV/Excel export
- Depends on: External libraries (date-fns, recharts, zod)
- Used by: All layers above

## Data Flow

**Authentication Flow:**

1. User navigates to `/login`
2. Client redirects to `/api/auth/login` (Next.js route)
3. Next.js GET handler calls backend at `GET /api/v1/auth/discord` via `backendFetch()`
4. Backend returns redirect to Discord OAuth URL + sets `oauth_ctx` cookie
5. Next.js extracts `oauth_ctx` Set-Cookie header from backend response, sets it in response
6. Browser redirects to Discord OAuth, then back to callback handler
7. Backend exchanges code for tokens, returns `access_token` + `refresh_token`
8. Next.js callback receives tokens, stores in httpOnly cookies via `/api/auth/session` POST
9. Middleware checks for `auth_token` or `refresh_token` cookie, allows access to `/guilds/*`

**Data Fetch Flow (Client):**

1. Page/component calls hook (e.g., `useGuild(guildId)`)
2. Hook uses `useQuery()` with `fetchWithRetry()` for data fetching
3. `fetchWithRetry()` sends GET to `/api/guilds/{guildId}` with credentials: 'include'
4. Middleware validates session cookie exists
5. Next.js route handler (`src/app/api/guilds/[guildId]/route.ts`) extracts auth_token from cookies
6. Route handler calls `backendFetch()` to `GET /api/v1/guilds/{guildId}` with Authorization header + X-Internal-Secret header
7. Backend validates JWT, returns guild data
8. Next.js route returns response to client
9. `fetchWithRetry()` caches response in React Query, returns data to hook
10. Component receives data and renders

**Token Refresh Flow:**

1. Client fetch receives 401 response
2. `fetchWithRetry()` detects 401, calls `refreshSession()` (POST `/api/auth/refresh`)
3. Next.js refresh handler extracts `refresh_token` from cookies
4. Backend exchanges refresh token for new token pair
5. Next.js stores new `auth_token` in cookies
6. `fetchWithRetry()` retries original request with new auth_token cookie
7. If retry succeeds, data is returned; if still 401, redirect to login

**Mutation Flow (Server Updates):**

1. Component calls mutation hook (e.g., `useUpdateGuildSettings()`)
2. User submits form
3. `useMutation()` calls `fetchWithRetry()` with POST/PATCH method
4. Next.js route handler receives request, adds Authorization header
5. Backend validates permission (admin check), updates data, returns result
6. Mutation success handler invalidates related queries to trigger refetch
7. Optimistic update applied immediately; rollback on error

**State Management:**

- **Server state:** Managed by React Query with TanStack Query client
  - Caching: `staleTime` (2-5 min), `gcTime` (10 min)
  - Refetch on: mutation success, manual invalidation, window focus disabled
  - Pagination: Page-based with `useQuery` queryKey changes
- **Client state:** Local component state with `useState()`
  - UI state: drawer open, expanded cards, modal visibility
  - Form state: handled by component local state or simple hooks
- **SSE state:** Real-time updates via Server-Sent Events in `useSSE()` hook
  - Updates React Query cache directly on message
  - Falls back to polling when disconnected

## Key Abstractions

**fetchWithRetry():**
- Purpose: Reliable HTTP client with auto-retry for rate limits and transient errors
- Location: `src/lib/fetch-with-retry.ts`
- Pattern: Exponential backoff (1s, 2s, 4s...) with jitter, handles 429 Retry-After header
- Handles token refresh on 401 by calling `/api/auth/refresh`
- Returns RateLimitError when cooldown active; throws Error on network failure

**backendFetch():**
- Purpose: Wrapper for backend calls from API routes; adds X-Internal-Secret header
- Location: `src/lib/server/backend-fetch.ts`
- Pattern: Middleware that injects `X-Internal-Secret: {process.env.INTERNAL_API_SECRET}` for SSR rate-limit bypass
- Used in: All API route handlers for backend communication

**React Query Hooks (use-*.ts):**
- Purpose: Encapsulate API endpoints as reusable data hooks
- Location: `src/hooks/use-guilds.ts`, `use-tracking.ts`, `use-analytics.ts`, etc.
- Pattern: `useQuery()` for reads, `useMutation()` for writes
- Features: Optimistic updates, error boundaries, automatic refetch, pagination support

**UI Components (src/components/ui/):**
- Purpose: Reusable headless UI primitives
- Location: `src/components/ui/button.tsx`, `data-table.tsx`, `confirmation-modal.tsx`, etc.
- Pattern: Compound components with props, using className for styling (Tailwind)
- Used by: Feature components and pages

**Feature Components (src/components/{feature}/):**
- Purpose: Domain-specific UI (tracking, analytics, exports, etc.)
- Location: `src/components/tracking/`, `src/components/analytics/`, etc.
- Pattern: Use hooks for data, compose UI components, handle local state
- Exported from: `index.ts` barrel files for tree-shaking

## Entry Points

**Public Pages (No Auth):**
- `/login` - Login page with Discord OAuth button
  - Location: `src/app/(auth)/login/page.tsx`
  - Triggers: Click on login button
  - Responsibilities: Display login UI, link to auth flow

**OAuth Callback:**
- `/auth/callback` - Receives code from Discord, exchanges for tokens
  - Location: `src/app/auth/callback/page.tsx`
  - Triggers: Discord redirects after user approves
  - Responsibilities: Call `/api/auth/exchange` to complete auth, redirect to home

**Dashboard Pages (Protected):**
- `/` - Guild switcher and dashboard home
  - Location: `src/app/(dashboard)/page.tsx`
  - Triggers: Middleware redirects authenticated users here
  - Responsibilities: Show guilds list, links to guild pages

- `/guilds` - List all accessible guilds
  - Location: `src/app/(dashboard)/guilds/page.tsx`

- `/guilds/[guildId]` - Guild overview with stats and links
  - Location: `src/app/(dashboard)/guilds/[guildId]/page.tsx`
  - Responsibilities: Fetch guild details, display stats, render quick access links

- `/guilds/[guildId]/{accounts|brands|posts|analytics|exports|activity|settings}` - Feature pages
  - Location: `src/app/(dashboard)/guilds/[guildId]/{feature}/page.tsx`

**API Routes (Internal):**
- `/api/auth/*` - Session management
  - `/api/auth/login` - Start Discord OAuth flow
  - `/api/auth/callback` - Receive OAuth code
  - `/api/auth/session` - Store tokens in cookies
  - `/api/auth/refresh` - Refresh expired access token
  - `/api/auth/logout` - Clear cookies

- `/api/guilds` - Guild list and operations
  - `GET /api/guilds` - List accessible guilds
  - `GET /api/guilds/[guildId]` - Get guild details
  - `GET /api/guilds/[guildId]/status` - Bot health status
  - `GET /api/guilds/[guildId]/status/stream` - SSE stream for real-time updates
  - `PATCH /api/guilds/[guildId]/settings` - Update guild settings
  - Other resource routes for accounts, brands, posts, exports, etc.

## Error Handling

**Strategy:** Multi-level error boundaries with fallback UI and user feedback

**Patterns:**

1. **Network Layer (fetchWithRetry):**
   - Catches network errors, retries GET/HEAD/OPTIONS requests
   - Throws RateLimitError on 429 with retry-after window
   - Throws generic Error after max retries exhausted

2. **Route Handler Level (API routes):**
   - Try-catch wrapping backend calls
   - Returns NextResponse.json({ error: 'message' }, { status: 500 })
   - Logs errors for debugging

3. **Hook Level (useQuery/useMutation):**
   - `isError` flag shows error state
   - `error` property contains Error object
   - `onError` callback in mutations shows toast notification
   - Rollback optimistic updates on error

4. **Component Level:**
   - Error boundaries (`src/app/(dashboard)/error.tsx`, `src/app/global-error.tsx`)
   - Conditional rendering: `if (isError) { return <ErrorUI /> }`
   - Toast notifications for user feedback (Sonner)

5. **Page Level:**
   - Rate limit detection: `error.message.includes('Rate limited')` shows special message
   - Suggests reload or shows error details

## Cross-Cutting Concerns

**Logging:** Console-based
- `console.warn()` in `fetchWithRetry()` for retry attempts and network errors
- No centralized logging infrastructure; suitable for MVP
- Future: Add structured logging (Pino, Winston) for production

**Validation:**
- Backend-driven validation (API returns 400 with error details)
- Frontend Zod schemas in form components for client-side checks
- TypeScript strict mode enforces type safety

**Authentication:**
- Cookie-based with httpOnly, secure, sameSite: 'lax'
- JWT tokens validated by backend
- Token refresh via POST `/api/auth/refresh`
- Middleware protects dashboard routes

**Rate Limiting:**
- Backend returns 429 with Retry-After header
- `fetchWithRetry()` implements exponential backoff and global cooldown
- SSR requests bypass with X-Internal-Secret header

**Performance:**
- Code-splitting: `dynamic()` imports for Recharts components (analytics)
- Image optimization: Discord avatar CDN with remotePatterns
- CSS: Tailwind JIT with dark mode
- Bundle analyzer: `next/bundle-analyzer` (disabled by default, enable with ANALYZE=true)

---

*Architecture analysis: 2025-02-16*
