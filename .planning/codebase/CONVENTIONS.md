# Coding Conventions

**Analysis Date:** 2025-02-16

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `EmptyState.tsx`, `PlatformIcon.tsx`)
- Hooks: kebab-case with `use-` prefix (e.g., `use-guilds.ts`, `use-tracking.ts`)
- Utilities: kebab-case (e.g., `fetch-with-retry.ts`, `date-utils.ts`)
- Types: separate files with descriptive names (e.g., `guild.ts`, `tracking.ts`)
- API routes: snake_case with hierarchical structure (e.g., `guilds/[guildId]/settings/route.ts`)

**Functions:**
- React hooks: camelCase with `use` prefix (e.g., `useGuilds()`, `useDebounce()`)
- Regular functions: camelCase (e.g., `calculateBackoff()`, `buildPostQuery()`)
- Helper functions: camelCase, often placed near usage or in dedicated utils files (e.g., `parseRetryAfter()`, `normalizeCookieDomain()`)
- Exported functions: consistently use camelCase regardless of module type

**Variables:**
- State variables: camelCase (e.g., `isLoading`, `hasSessionCookie`, `refreshToken`)
- Constants: UPPER_SNAKE_CASE for global constants (e.g., `MAX_RETRIES`, `BASE_BACKOFF_MS`)
- Type guards: camelCase with leading check context (e.g., `isAuthEndpoint()`)
- Event handlers: camelCase with `on` prefix (e.g., `onMessage()`, `onError()`)

**Types/Interfaces:**
- Type names: PascalCase (e.g., `GuildDetails`, `PostFilters`, `RateLimitError`)
- Generic type parameters: single capital letter (e.g., `<T>`) or descriptive PascalCase
- Response types: suffix with `Response` (e.g., `GuildsResponse`, `AccountsResponse`)
- Request types: suffix with `Request` (e.g., `AddAccountRequest`, `UpdateSettingsRequest`)
- Enum-like constants: objects with uppercase keys (e.g., `platformColors`, `RETRYABLE_SERVER_STATUSES`)

## Code Style

**Formatting:**
- Indentation: 2 spaces (inferred from existing code)
- Line length: no strict limit enforced, but code typically wraps at ~100 characters
- Semicolons: used throughout (enforced by TypeScript context)
- Trailing commas: used in multi-line objects and arrays

**Linting:**
- Tool: ESLint with Next.js config (`eslint-config-next`)
- Config file: `.eslintrc.json`
- Rules:
  - Extends `next/core-web-vitals` and `next/typescript`
  - `@typescript-eslint/no-unused-vars`: error, with `argsIgnorePattern: "^_"` to allow unused parameters starting with underscore
  - No custom Prettier config detected; formatting is implicit/conventional

## Import Organization

**Order:**
1. React/Next.js imports (e.g., `import { useState } from 'react'`)
2. Third-party libraries (e.g., `import { useQuery } from '@tanstack/react-query'`)
3. Internal imports using path aliases (e.g., `import { useDebounce } from '@/hooks'`)
4. Type imports (e.g., `import type { GuildDetails } from '@/types'`)

**Path Aliases:**
- Base alias: `@/*` maps to `./src/*`
- Established directories leveraging the alias:
  - `@/hooks` - Custom React hooks
  - `@/components` - React components (organized by subdirectory: `ui/`, `forms/`, `analytics/`, etc.)
  - `@/lib` - Utility functions (both client and server utilities)
  - `@/types` - TypeScript interfaces and types
  - `@/app` - Next.js app directory routes and layouts

**Pattern:**
- Prefer relative imports within the same domain; use `@/` aliases for cross-domain imports
- Barrel files are used selectively (e.g., components may export via index, but not enforced globally)

## Error Handling

**Patterns:**
- Try-catch blocks wrap async operations that invoke external APIs (e.g., `backendFetch()`)
- Explicit error messages returned in NextResponse objects (e.g., `{ error: 'Unauthorized' }`)
- Client-side: errors caught in React Query `onError` callbacks and displayed via toast notifications (`toast.error()`)
- Fetch wrapper (`fetchWithRetry()`) includes comprehensive error handling:
  - Network errors: automatic retry with exponential backoff (1s, 2s, 4s... up to 30s)
  - 401 Unauthorized: triggers session refresh, then retries original request
  - 429 Rate Limit: respects `Retry-After` header or falls back to 15s
  - 5xx Server errors: automatic retry for idempotent methods (GET, HEAD, OPTIONS)
- Error boundaries: used at layout/route level (see `src/app/(dashboard)/error.tsx`)
- Logging: console.error/warn used in error boundaries and critical paths

## Logging

**Framework:** Native `console` API (no structured logging library)

**Patterns:**
- `console.error()`: used in error boundaries and critical failures
- `console.warn()`: used in `fetchWithRetry()` for retry events and storage operation failures
- Logging statements include context (e.g., `console.warn(\`Rate limited (429). Retrying in ${Math.round(delay / 1000)}s...\`)`)
- No log levels or structured logging observed; logging is ad-hoc and informational

## Comments

**When to Comment:**
- Public/exported functions: include JSDoc-style block comments describing purpose, parameters, and return values
- Complex logic: inline comments explain non-obvious algorithmic decisions (e.g., backoff calculation, cookie domain normalization)
- Configuration constants: comments explain purpose and units (e.g., `const MAX_BACKOFF_MS = 30000; // 30 seconds`)
- Session flow: detailed multi-line comments for complex state management flows (e.g., session refresh flow in `fetchWithRetry()`)
- Workarounds: comments explain why a pattern is used if it's non-standard (e.g., JSON serialization edge cases in `usePersistentState()`)

**JSDoc/TSDoc:**
- Used extensively on exported functions and hooks
- Format: standard JSDoc with `@param`, `@returns`, `@example` tags
- Example from `useDebounce()`:
  ```typescript
  /**
   * Debounces a value by the specified delay.
   * Useful for search inputs to avoid excessive API calls.
   *
   * @param value - The value to debounce
   * @param delay - Delay in milliseconds (default: 300ms)
   * @returns The debounced value
   */
  ```

## Function Design

**Size:**
- Hooks: typically 10-50 lines (shorter for simple queries, longer for complex mutations with optimistic updates)
- Components: typically 20-100 lines (presentational components ~20-40, logic-heavy components ~60-100)
- Utility functions: typically 5-20 lines (single responsibility principle)
- API route handlers: typically 15-30 lines

**Parameters:**
- Hooks: minimal parameters; rely on dependencies passed to query/mutation options
- Components: interface-based props (e.g., `interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>`)
- Functions: typed parameters with sensible defaults (e.g., `delay: number = 300`)
- API routes: destructure `{ params }` using Promise-based approach per Next.js 15+ pattern

**Return Values:**
- Hooks: return query result objects (e.g., `{ data, isLoading, error }`) or mutation objects
- Components: return React.ReactNode (JSX)
- Functions: typed return values (avoid implicit `any`)
- Error handling: throw Error objects rather than returning error objects for consistency

## Module Design

**Exports:**
- Named exports for functions/components (e.g., `export function useGuilds()`)
- Default exports for page components only (e.g., `export default function LoginPage()`)
- Type exports use `export type` to separate type-only imports
- Re-exports used for convenience (e.g., `export type { ConnectionState }` in hooks)

**Barrel Files:**
- Not systematically used; most imports are direct to source files
- Observed in some UI component directories but not enforced as a pattern
- Prefer explicit imports over deep re-exports

**File Structure Pattern:**
- Hooks grouped by domain (`src/hooks/use-{domain}.ts`)
- Components grouped by feature (`src/components/{feature}/` or `src/components/ui/` for reusables)
- Types grouped by domain (`src/types/{domain}.ts`)
- API routes follow Next.js file-based routing (`src/app/api/...`)

---

*Convention analysis: 2025-02-16*
