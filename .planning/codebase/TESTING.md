# Testing Patterns

**Analysis Date:** 2025-02-16

## Test Framework

**Status:** No testing framework detected

- No test files found (no `*.test.ts`, `*.spec.ts`, etc.)
- No Jest or Vitest config files present
- No test runner scripts in `package.json` (only `lint` script for ESLint)
- No testing libraries in `devDependencies` (no `@testing-library/*`, `jest`, `vitest`, etc.)

**Implications:**
- Codebase currently has zero automated test coverage
- Testing validation is manual or relies on type checking via TypeScript
- This is a critical gap for a dashboard with complex state management and API integration

## Recommended Testing Setup

If testing is to be added, the following frameworks are recommended based on codebase patterns:

**Test Runner:** Vitest
- Reason: Fast, ESM-native, excellent TypeScript support, minimal config needed

**Component Testing:** Vitest + React Testing Library
- For testing React components and hooks
- Reason: Standard in Next.js ecosystem, straightforward DOM testing

**API Route Testing:** Vitest with Node.js API
- For testing Next.js route handlers in `src/app/api/`
- Reason: Can mock fetch and Next.js modules directly

**End-to-End:** Playwright or Cypress (optional)
- For testing full user flows (auth, navigation, data operations)

## Test File Organization

**Recommended Pattern (not currently implemented):**
- Location: Co-located with source files
- Structure: `{source-file}.test.ts` or `{source-file}.spec.ts` next to source
- Example structure:
  ```
  src/
  ├── hooks/
  │   ├── use-guilds.ts
  │   └── use-guilds.test.ts
  ├── lib/
  │   ├── fetch-with-retry.ts
  │   └── fetch-with-retry.test.ts
  ├── components/
  │   ├── empty-state.tsx
  │   └── empty-state.test.tsx
  ```

## Existing Code Patterns Suitable for Testing

### React Query Hook Pattern

**Source:** `src/hooks/use-guilds.ts`, `src/hooks/use-tracking.ts`

Example pattern used throughout:
```typescript
export function useGuilds() {
    return useQuery<GuildsResponse>({
        queryKey: ['guilds'],
        queryFn: async () => {
            const response = await fetchWithRetry('/api/guilds')
            if (!response.ok) {
                throw new Error('Failed to fetch guilds')
            }
            return response.json()
        },
        staleTime: 2 * 60 * 1000,
    })
}
```

**Testing strategy:**
```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useGuilds } from '@/hooks/use-guilds'

describe('useGuilds', () => {
  it('fetches guilds on mount', async () => {
    const queryClient = new QueryClient()
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    const { result } = renderHook(() => useGuilds(), { wrapper })

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    // Wait for data
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toBeDefined()
  })
})
```

### Mutation Pattern

**Source:** `src/hooks/use-guilds.ts` (useUpdateGuildSettings), `src/hooks/use-tracking.ts` (useAddAccount)

Example pattern:
```typescript
export function useUpdateGuildSettings(guildId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (settings: UpdateSettingsRequest) => {
            const response = await fetchWithRetry(`/api/guilds/${guildId}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to update settings')
            }

            return response.json() as Promise<{ settings: GuildSettings }>
        },
        onMutate: async (settings) => {
            // Optimistic update
            await queryClient.cancelQueries({ queryKey: ['guild', guildId] })
            const previousGuild = queryClient.getQueryData<GuildDetails>(['guild', guildId])

            queryClient.setQueryData<GuildDetails>(['guild', guildId], (old) => {
                if (!old) return old
                return {
                    ...old,
                    settings: { ...old.settings, ...settings },
                }
            })

            return { previousGuild }
        },
        onError: (error, variables, context) => {
            if (context?.previousGuild) {
                queryClient.setQueryData(['guild', guildId], context.previousGuild)
            }
            toast.error('Failed to update settings')
        },
        onSuccess: () => {
            toast.success('Settings saved successfully')
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
        },
    })
}
```

**Testing strategy:**
```typescript
describe('useUpdateGuildSettings', () => {
  it('optimistically updates settings', async () => {
    const queryClient = new QueryClient()
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    const { result } = renderHook(() => useUpdateGuildSettings('guild123'), { wrapper })

    // Trigger mutation
    result.current.mutate({ logs_channel_id: 'new-id' })

    // Optimistic update should be immediate
    const guildData = queryClient.getQueryData(['guild', 'guild123'])
    expect(guildData.settings.logs_channel_id).toBe('new-id')

    // Wait for server response
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })

  it('rolls back on error', async () => {
    // Mock failed response
    global.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ message: 'Error' }), { status: 400 }))
    )

    // Mutation should fail and rollback
    await waitFor(() => {
      expect(result.current.error).toBeDefined()
    })

    // Previous value restored
    expect(queryClient.getQueryData(['guild', 'guild123'])).toEqual(previousGuild)
  })
})
```

### Utility Function Pattern

**Source:** `src/lib/fetch-with-retry.ts`

Example function with testable logic:
```typescript
function calculateBackoff(attempt: number): number {
  const exponentialDelay = BASE_BACKOFF_MS * Math.pow(2, attempt)
  const cappedDelay = Math.min(exponentialDelay, MAX_BACKOFF_MS)
  const jitter = cappedDelay * Math.random() * 0.5
  return cappedDelay + jitter
}

function parseRetryAfter(retryAfter: string | null): number | null {
  if (!retryAfter) return null
  const seconds = parseInt(retryAfter, 10)
  if (!isNaN(seconds)) {
    return Math.min(seconds * 1000, MAX_RATE_LIMIT_WINDOW_MS)
  }
  // ... date parsing logic
}
```

**Testing strategy:**
```typescript
describe('calculateBackoff', () => {
  it('applies exponential backoff', () => {
    const delay0 = calculateBackoff(0)
    const delay1 = calculateBackoff(1)
    const delay2 = calculateBackoff(2)

    expect(delay1).toBeGreaterThan(delay0)
    expect(delay2).toBeGreaterThan(delay1)
  })

  it('caps at 30 seconds', () => {
    const delay = calculateBackoff(10)
    expect(delay).toBeLessThanOrEqual(MAX_BACKOFF_MS * 1.5) // Account for jitter
  })
})

describe('parseRetryAfter', () => {
  it('parses numeric seconds', () => {
    expect(parseRetryAfter('120')).toBe(120000)
  })

  it('parses HTTP date format', () => {
    const future = new Date(Date.now() + 60000)
    const result = parseRetryAfter(future.toUTCString())
    expect(result).toBeCloseTo(60000, -2)
  })

  it('returns null for invalid input', () => {
    expect(parseRetryAfter(null)).toBeNull()
    expect(parseRetryAfter('invalid')).toBeNull()
  })
})
```

### Component Pattern

**Source:** `src/components/empty-state.tsx`, `src/components/ui/button.tsx`

Example component:
```typescript
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 mb-4 text-gray-500 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-gray-400 max-w-md mb-6">{description}</p>
      {action && (
        <Link href={action.href} target="_blank" rel="noopener noreferrer" className="...">
          {action.label}
        </Link>
      )}
    </div>
  )
}
```

**Testing strategy:**
```typescript
import { render, screen } from '@testing-library/react'
import { EmptyState } from '@/components/empty-state'

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        icon={<span>Icon</span>}
        title="No data"
        description="Try again later"
      />
    )

    expect(screen.getByText('No data')).toBeInTheDocument()
    expect(screen.getByText('Try again later')).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    render(
      <EmptyState
        icon={<span>Icon</span>}
        title="No data"
        description="Try again later"
        action={{ label: 'Learn more', href: '/docs' }}
      />
    )

    expect(screen.getByRole('link', { name: 'Learn more' })).toHaveAttribute('href', '/docs')
  })

  it('does not render action when not provided', () => {
    const { container } = render(
      <EmptyState icon={<span>Icon</span>} title="No data" description="Try again later" />
    )

    expect(container.querySelector('a')).not.toBeInTheDocument()
  })
})
```

### API Route Pattern

**Source:** `src/app/api/guilds/[guildId]/route.ts`

Example route handler:
```typescript
type RouteParams = { params: Promise<{ guildId: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
    const { guildId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const response = await backendFetch(`${API_URL}/api/v1/guilds/${guildId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        const data = await response.json()
        return NextResponse.json(data, { status: response.status })
    } catch {
        return NextResponse.json({ error: 'Failed to fetch guild' }, { status: 500 })
    }
}
```

**Testing strategy:**
```typescript
import { GET } from '@/app/api/guilds/[guildId]/route'

describe('GET /api/guilds/[guildId]', () => {
  it('returns 401 when no auth token present', async () => {
    const request = new NextRequest('http://localhost:3000/api/guilds/123')
    const response = await GET(request, { params: Promise.resolve({ guildId: '123' }) })

    expect(response.status).toBe(401)
  })

  it('forwards request to backend with Bearer token', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ id: '123', name: 'Test' })))
    )

    const request = new NextRequest('http://localhost:3000/api/guilds/123', {
      headers: { Cookie: 'auth_token=token123' },
    })

    await GET(request, { params: Promise.resolve({ guildId: '123' }) })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/guilds/123'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token123',
        }),
      })
    )
  })

  it('returns 500 on backend fetch error', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

    const request = new NextRequest('http://localhost:3000/api/guilds/123', {
      headers: { Cookie: 'auth_token=token123' },
    })

    const response = await GET(request, { params: Promise.resolve({ guildId: '123' }) })

    expect(response.status).toBe(500)
  })
})
```

## Error Testing Patterns

**Common approach in codebase:**
- Errors are thrown or caught at the mutation/query boundary
- Client code handles errors via `onError` callbacks or caught promises
- API routes return error JSON with status codes

**Testing errors:**
```typescript
it('handles API errors gracefully', async () => {
  global.fetch = vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify({ message: 'Validation failed' }), { status: 400 })
    )
  )

  const { result } = renderHook(() => useGuilds(), { wrapper })

  await waitFor(() => {
    expect(result.current.error).toBeDefined()
    expect(result.current.error.message).toContain('Failed to fetch')
  })
})
```

## Async Testing Pattern

**Pattern observed throughout hooks:**
- Use `waitFor()` from React Testing Library for async operations
- Use `renderHook()` for hook testing
- Wrap with QueryClientProvider for React Query hooks

```typescript
await waitFor(() => {
  expect(result.current.isLoading).toBe(false)
})
```

## Coverage Goals (Recommended)

- **Unit tests:** Utility functions (lib/*), pure logic
  - Target: 90%+ coverage of critical paths (backoff calculation, retry logic, etc.)

- **Integration tests:** Hooks + mock API
  - Target: All useQuery/useMutation hooks
  - Mock `fetchWithRetry()` and validate query behavior

- **Component tests:** Reusable components
  - Target: `src/components/ui/*`, `src/components/forms/*`
  - Validate rendering and user interactions

- **E2E tests:** Full flows (optional)
  - Auth flow (login → dashboard → logout)
  - Data operations (create, update, delete)

---

*Testing analysis: 2025-02-16*
