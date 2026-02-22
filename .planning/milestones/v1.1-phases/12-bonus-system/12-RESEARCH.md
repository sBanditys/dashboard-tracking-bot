# Phase 12: Bonus System - Research

**Researched:** 2026-02-21
**Domain:** Next.js dashboard UI — paginated list with inline expansion, multi-tab layout, optimistic payment toggles, week picker, bonus creation form, results visualization, and leaderboard
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Round Listing:**
- Chronological card layout, newest first
- Each card shows mini target list inline: week dates, bonus amount, target count with achieved/missed icons per group
- Filter tabs at top: All / Evaluated / Pending
- "Load more" button for pagination (not infinite scroll)
- Unevaluated rounds: "Pending" badge with muted/faded card style; evaluated rounds show green/red achievement summary
- Clicking a card expands it inline (not a separate page) with full details
- Targets shown as flat list (not grouped by brand) with brand shown as label on each row
- Expanded card has separate sections: "Targets", "Payments", and "Results" (as tabs)
- Friendly empty state with illustration/icon + "No bonus rounds yet" + prominent "Create Round" button

**Round Creation:**
- Form layout: Claude's discretion (sheet/drawer or full page based on complexity)
- Week picker defaults to current week with option to select past weeks
- Past week selection shows a warning confirmation dialog: "This week has ended. The round will be evaluated immediately. Continue?"
- Week picker disables weeks that already have bonus rounds
- Account group selection: full checklist with "Select all" toggle
- Target views: bulk default input for all groups + individual override per group
- Bonus amount: dollar input ($50.00) — frontend converts to cents for API
- Currency display: $ (USD) throughout
- Account group labels in checklist: Claude's discretion on whether to show brand prefix
- Review summary step before final creation (shows week, amount, and selected targets)
- Confirmation dialog for retroactive rounds in addition to summary step

**Payment Management:**
- Individual payments: inline toggle switch for paid/unpaid (no confirmation dialog for single toggle)
- Reversing payment (toggling to unpaid): warning toast with undo option for a few seconds
- Optimistic UI updates: toggle flips immediately, reverts if API fails
- Bulk actions: "Mark All Paid" / "Mark All Unpaid" buttons above payment list
- Dynamic bulk buttons: show only relevant button based on current payment states
- Bulk actions always require confirmation dialog showing count + total dollar amount
- Each payment row shows: group name, amount in dollars, paid/unpaid toggle, paid-by user + date
- Notes field always visible per payment row with character counter (42/500)
- Notes auto-save on blur
- Running total progress bar at top of payments section showing paid vs total amount
- Payment list sortable by group name, paid status, and amount
- Non-admin users see payments section read-only (toggles disabled)
- Unevaluated rounds show explanation: "Payments will be available after this round is evaluated"

**Results & Near-Miss Display:**
- Accessed via "Results" tab in expanded round card (not separate page)
- Summary stat cards at top: "X Achieved", "Y Missed", "Z Near-Miss", "$X Total Bonus"
- Each target shows a progress bar (actual vs target views) with color fill based on achievement
- Near-miss highlighting: Claude's discretion on prominence (inline highlight vs dedicated section)

**Leaderboard:**
- Accessed via "Leaderboard" tab on main bonus page (alongside "Rounds" tab)
- Primary ranking switchable between hit rate % and total bonus earned
- Time range: preset buttons for 4 weeks, 8 weeks, 12 weeks, All time
- Top 3 get podium treatment with gold/silver/bronze medal icons showing group name, hit rate, and bonus amount
- Rest shown in ranked table below podium
- Paid vs unpaid bonus columns: Claude's discretion
- Friendly empty state: "No bonus data yet — create and evaluate rounds to see rankings"

### Claude's Discretion
- Creation form layout (sheet/drawer vs full page)
- Account group label format in checklist (brand prefix or not)
- Near-miss visual treatment (inline badge vs dedicated section)
- Leaderboard paid/unpaid column split
- Loading skeleton designs
- Exact spacing, typography, and color palette
- Error state handling throughout
- Animation and transition details

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BONUS-01 | User can view paginated list of bonus rounds | Cursor pagination from `GET /bonus/rounds?evaluated=&limit=&cursor=`; "Load more" button pattern; card expansion with inline tabs |
| BONUS-02 | User can view bonus round details (targets, payment status) | `GET /bonus/rounds/:roundId` returns targets + payments; expand-in-place card pattern with Targets/Payments/Results tabs |
| BONUS-03 | Admin can create a bonus round with targets and amount | `POST /bonus/rounds`; react-day-picker week selection; full checklist with Select All; two-step review + confirm flow; dollar-to-cents conversion |
| BONUS-04 | Admin can mark individual payments as paid/unpaid | `PATCH /bonus/rounds/:roundId/payments/:paymentId`; optimistic toggle via React Query `setQueryData`; revert on error; warning toast with undo for un-pay |
| BONUS-05 | Admin can bulk-update all payments in a round | `PATCH /bonus/rounds/:roundId/payments/bulk`; "Mark All Paid/Unpaid" with dynamic visibility; ConfirmationModal showing count + dollar total |
| BONUS-06 | User can view bonus round results with near-miss reporting | `GET /bonus/rounds/:roundId/results`; summary stat cards (achieved/missed/near-miss/total bonus); progress bars per target; near-miss badge treatment |
| BONUS-07 | User can view bonus achievement leaderboard | `GET /bonus/leaderboard?weeks=`; top-3 podium with medal icons; ranked table below; switchable ranking metric; preset time-range buttons |
</phase_requirements>

---

## Summary

Phase 12 is a pure frontend build. The backend is fully implemented with 7 endpoints already in production (create round, list rounds, get round detail, update payment, bulk payment, results with near-miss, leaderboard). The work is entirely in the Next.js dashboard: new API proxy routes, React Query data hooks, TypeScript types, and UI components.

The primary architectural challenge is the layered tab structure: the main bonus page has two top-level tabs (Rounds / Leaderboard), and each expanded round card has three inner tabs (Targets / Payments / Results). Inline card expansion (accordion-style, not navigation) means expanded state lives in component `useState`, not the URL router.

The second complexity area is the round creation form — a multi-step wizard with a week picker (react-day-picker 9.x custom week-selection mode), account group checklist with bulk-default + per-group override view targets, dollar amount input, a review summary step, and conditional confirmation dialogs (retroactive weeks get an extra dialog).

Payment management requires optimistic UI updates with React Query `setQueryData` for instant toggle feedback, revert-on-error logic, and a Sonner toast-with-action (undo) for the reversal case.

**Primary recommendation:** Build in 5 plans: (1) data layer (types + hooks + proxy routes), (2) main page structure + rounds list + empty state, (3) expanded round card with inner tabs (Targets + Payments + Results), (4) round creation form wizard, (5) leaderboard tab.

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | ^5.90.20 | Server state, caching, optimistic updates | Already the project standard for all data fetching |
| `react-day-picker` | ^9.13.0 | Week picker for round creation | Already installed; supports custom week-selection modifiers |
| `date-fns` | ^4.1.0 | `startOfWeek`, `endOfWeek`, `format`, `parseISO` | Already installed; used throughout analytics/sessions |
| `sonner` | ^2.0.7 | Toast notifications including undo action | Already the project standard for all toasts |
| `@headlessui/react` | ^2.2.9 | `Dialog`/`DialogPanel` for modals | Already used in confirmation-modal, threshold-create-modal |
| `lucide-react` | ^0.564.0 | Medal icons (Trophy, Medal), toggle icons, status icons | Already installed; used throughout all components |
| `tailwindcss` | ^3.4.1 | Styling with project design tokens | Already the project standard |

### No new packages required

All required functionality is covered by existing dependencies. Specifically:
- Week picker: `react-day-picker` 9.x with custom `modifiers` (already documented pattern)
- Progress bars: plain `div` with percentage width and Tailwind color classes
- Optimistic updates: React Query `setQueryData` + `onError` revert
- Toast with undo: Sonner `toast.warning` with `action: { label: 'Undo', onClick: fn }`
- Podium display: plain JSX with Tailwind — no chart library needed

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (dashboard)/guilds/[guildId]/
│   │   └── bonus/
│   │       └── page.tsx              # Main bonus page (Rounds + Leaderboard tabs)
│   └── api/guilds/[guildId]/bonus/
│       ├── rounds/
│       │   ├── route.ts              # GET list, POST create
│       │   └── [roundId]/
│       │       ├── route.ts          # GET round detail
│       │       ├── results/
│       │       │   └── route.ts      # GET results
│       │       └── payments/
│       │           ├── bulk/
│       │           │   └── route.ts  # PATCH bulk
│       │           └── [paymentId]/
│       │               └── route.ts  # PATCH individual
│       └── leaderboard/
│           └── route.ts              # GET leaderboard
├── hooks/
│   └── use-bonus.ts                  # All bonus React Query hooks
├── types/
│   └── bonus.ts                      # All bonus TypeScript types
└── components/
    └── bonus/
        ├── rounds-tab.tsx            # Rounds list + filter tabs + load more
        ├── round-card.tsx            # Collapsible card with inner tabs
        ├── round-card-skeleton.tsx   # Skeleton for loading state
        ├── targets-tab.tsx           # Inner tab: flat target list
        ├── payments-tab.tsx          # Inner tab: payment list with toggles
        ├── results-tab.tsx           # Inner tab: stats + progress bars
        ├── leaderboard-tab.tsx       # Main leaderboard tab (podium + table)
        └── create-round-modal.tsx    # Multi-step creation form
```

### Pattern 1: Cursor Pagination with Load More

The backend uses cursor-based pagination (`next_cursor`, `has_more`). The frontend fetches the first page and appends subsequent pages on "Load More" click. State: `rounds[]` accumulated in component state, `cursor` for next request.

```typescript
// Source: Verified from bonusRoutes.ts backend — cursor pagination response shape
// GET /api/guilds/:guildId/bonus/rounds?limit=10&cursor=<id>&evaluated=true|false

// useQuery per page, accumulate in component:
const [rounds, setRounds] = useState<BonusRound[]>([])
const [cursor, setCursor] = useState<string | null>(null)
const [hasMore, setHasMore] = useState(false)

// On "Load More" click: fetch with cursor, append to rounds[]
```

**Alternative considered:** `useInfiniteQuery` (used for infinite scroll in alerts). Rejected because the UX is a "Load More" button, not infinite scroll — plain `useQuery` with accumulated state is simpler and avoids `flatMap(pages)` complexity.

### Pattern 2: Inline Card Expansion (Accordion)

Expanded card state lives in component state. Only one card can be expanded at a time (accordion behavior). Inner tabs are local `useState` per expanded card.

```typescript
// In RoundsTab:
const [expandedRoundId, setExpandedRoundId] = useState<string | null>(null)

const handleCardClick = (roundId: string) => {
  setExpandedRoundId(prev => prev === roundId ? null : roundId)
}
```

When a card is expanded:
1. Fetch round detail (`GET /rounds/:roundId`) via React Query — enabled only when expanded
2. Render `<RoundCard>` expanded with inner `Targets` / `Payments` / `Results` tabs
3. Fetch results (`GET /rounds/:roundId/results`) only when "Results" tab is active — lazy fetch with `enabled: activeTab === 'results' && round.evaluated`

### Pattern 3: Optimistic Payment Toggle

Standard React Query optimistic update pattern, verified from codebase pattern in `use-alerts.ts` and `use-exports.ts`.

```typescript
// Source: Project pattern from hooks — onMutate/onError/onSettled
const useUpdatePayment = (guildId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roundId, paymentId, paid, notes }) => {
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/bonus/rounds/${roundId}/payments/${paymentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paid, notes }),
        }
      )
      if (!res.ok) throw new Error('Failed to update payment')
      return res.json()
    },
    onMutate: async ({ roundId, paymentId, paid }) => {
      // Cancel in-flight refetches
      await queryClient.cancelQueries({ queryKey: ['guild', guildId, 'bonus', 'round', roundId] })
      // Snapshot previous value
      const previous = queryClient.getQueryData(['guild', guildId, 'bonus', 'round', roundId])
      // Optimistically update payment in cache
      queryClient.setQueryData(
        ['guild', guildId, 'bonus', 'round', roundId],
        (old: BonusRoundDetail | undefined) => {
          if (!old) return old
          return {
            ...old,
            round: {
              ...old.round,
              payments: old.round.payments.map(p =>
                p.id === paymentId ? { ...p, paid } : p
              ),
            },
          }
        }
      )
      return { previous }
    },
    onError: (err, variables, context) => {
      // Revert on error
      if (context?.previous) {
        queryClient.setQueryData(
          ['guild', guildId, 'bonus', 'round', variables.roundId],
          context.previous
        )
      }
      toast.error('Failed to update payment')
    },
    onSettled: (data, err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'bonus', 'round', variables.roundId] })
    },
  })
}
```

### Pattern 4: Toast with Undo (Sonner)

For reversing a payment (toggling to unpaid), show a warning toast with an undo action. Sonner supports `action` prop on toasts.

```typescript
// Source: Sonner docs — action prop for toast
// Trigger when toggling paid -> unpaid:
const toastId = toast.warning('Payment marked as unpaid', {
  action: {
    label: 'Undo',
    onClick: () => {
      // Re-mark as paid
      updatePayment.mutate({ roundId, paymentId, paid: true })
      toast.dismiss(toastId)
    },
  },
  duration: 5000,
})
```

### Pattern 5: React Day Picker Week Selection (v9.x)

react-day-picker 9.x supports custom week selection via `modifiers` + `onDayClick`. This is the documented pattern from Context7.

```typescript
// Source: react-day-picker official docs — custom-selections.mdx
import { startOfWeek, endOfWeek, isAfter } from 'date-fns'
import { DayPicker, rangeIncludesDate, type DateRange } from 'react-day-picker'

const [selectedWeek, setSelectedWeek] = useState<DateRange | undefined>()

// To disable weeks with existing rounds, build array of start dates:
const disabledDates = existingRoundWeekStarts.flatMap(weekStart => ({
  from: weekStart,
  to: endOfWeek(weekStart),
}))

<DayPicker
  showWeekNumber
  modifiers={{
    selected: selectedWeek,
    range_start: selectedWeek?.from,
    range_end: selectedWeek?.to,
    range_middle: (date: Date) =>
      selectedWeek ? rangeIncludesDate(selectedWeek, date, true) : false,
  }}
  disabled={[
    { after: new Date() },  // No future weeks
    ...disabledDates,       // Weeks that already have rounds
  ]}
  onDayClick={(day, modifiers) => {
    if (modifiers.disabled || modifiers.hidden) return
    setSelectedWeek({
      from: startOfWeek(day),
      to: endOfWeek(day),
    })
    // Detect retroactive: if week end is before now, show confirmation
    const weekEnd = endOfWeek(day)
    if (isAfter(new Date(), weekEnd)) {
      setShowRetroactiveWarning(true)
    }
  }}
/>
```

**Note:** The week picker floats in a popover rather than always-visible calendar. Use a `useState` for popover open/close. Since no Popover component exists in the project, implement as an absolutely-positioned `div` controlled by open state, or use `@headlessui/react` `Popover`. Headlessui v2 `Popover` is available.

### Pattern 6: API Proxy Routes

All proxy routes follow the exact same pattern established in `exports/route.ts`, `alert-thresholds/route.ts`. Use `backendFetch` from `@/lib/server/backend-fetch` and `sanitizeError`/`internalError` from `@/lib/server/error-sanitizer`.

```typescript
// Source: Verified from /src/app/api/guilds/[guildId]/exports/route.ts
import { backendFetch } from '@/lib/server/backend-fetch'
import { sanitizeError, internalError } from '@/lib/server/error-sanitizer'
import { BACKEND_API_URL } from '@/lib/server/api-url'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

type RouteParams = { params: Promise<{ guildId: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { guildId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(request.url)
    const response = await backendFetch(
      `${BACKEND_API_URL}/api/v1/guilds/${guildId}/bonus/rounds${url.search}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await response.json()
    if (!response.ok) return NextResponse.json(sanitizeError(response.status, data, 'load bonus rounds'), { status: response.status })
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json(internalError('load bonus rounds'), { status: 500 })
  }
}
```

**Key requirement:** `backendFetch` auto-injects `Idempotency-Key` for POST/PATCH/DELETE mutations (from `backendFetch.ts`). No manual idempotency key needed in proxy routes.

### Pattern 7: Dollar-to-Cents Conversion

Frontend input accepts `$50.00` format. Convert at submission time:

```typescript
const amountCents = Math.round(parseFloat(bonusAmount) * 100)
```

Display helper (cents to dollars):
```typescript
const centsToDisplay = (cents: number): string =>
  `$${(cents / 100).toFixed(2)}`
```

### Pattern 8: Admin Check (for Payment Toggles)

The `ManageLayout` pattern uses `useUser()` + guild permissions bit check. For the bonus page, since it's NOT under `/manage/`, admin check must happen inline within the bonus page/components:

```typescript
// Source: /src/app/(dashboard)/guilds/[guildId]/manage/layout.tsx
const { user } = useUser()
const guild = user?.guilds?.find((g) => g.id === guildId)
const isAdmin = guild !== undefined && (Number(guild.permissions) & 0x8) !== 0
```

Non-admin users see payment toggles as disabled (read-only) — not hidden. Admin check controls toggle disabled state, not visibility.

### Pattern 9: Notes Auto-Save on Blur

Notes field in payment rows auto-saves when focus leaves the field. Use `onBlur` handler with debounce check — only call API if value changed from original.

```typescript
const [notesValue, setNotesValue] = useState(payment.notes ?? '')
const originalNotes = useRef(payment.notes ?? '')

const handleNotesBlur = () => {
  if (notesValue !== originalNotes.current) {
    updatePayment.mutate({ roundId, paymentId: payment.id, paid: payment.paid, notes: notesValue })
    originalNotes.current = notesValue
  }
}
```

### Pattern 10: Leaderboard "All Time" weeks parameter

The backend `leaderboardQuerySchema` accepts `weeks` as a number. For "All time", pass a very large number (e.g., `9999`) to include all history. Verify backend handles large values gracefully — the SQL query uses `weekStart >= weeksAgo` where `weeksAgo = now - (weeks * 7 days)`, so 9999 weeks ago is safe (predates any data).

```typescript
const WEEK_OPTIONS = [
  { label: '4 weeks', value: 4 },
  { label: '8 weeks', value: 8 },
  { label: '12 weeks', value: 12 },
  { label: 'All time', value: 9999 },
]
```

### Pattern 11: Progress Bar for Results

Simple Tailwind-based progress bar — no library needed:

```tsx
<div className="w-full bg-surface rounded-full h-2">
  <div
    className={cn(
      'h-2 rounded-full transition-all duration-300',
      target.achieved ? 'bg-green-500' : target.near_miss ? 'bg-yellow-500' : 'bg-red-500'
    )}
    style={{ width: `${Math.min(100, (target.actual_views / target.target_views) * 100)}%` }}
  />
</div>
```

### Anti-Patterns to Avoid

- **Using `useInfiniteQuery` for Load More:** The "Load More" button pattern works better with accumulated state + plain `useQuery`, not infinite query pages. `useInfiniteQuery` is designed for infinite scroll, not button-triggered load.
- **Navigating to a new page for round detail:** The UX decision is inline card expansion. Do NOT use router.push.
- **Fetching round detail eagerly:** Only fetch detail when card is expanded (`enabled: expandedRoundId === round.id`). Avoid loading all round details on page load.
- **Fetching results eagerly:** Only fetch results when "Results" tab is active AND round is evaluated.
- **Confirmation dialog on single payment toggle:** The UX decision is NO confirmation for single toggles. Only bulk actions require confirmation.
- **Hiding payment section for non-admins:** Non-admins see payments read-only with disabled toggles, not hidden.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dialog/Modal | Custom overlay with z-index hacks | `@headlessui/react` `Dialog` | Already used in 3+ components (confirmation-modal, threshold-create-modal, revoke-session-dialog). Focus trapping, keyboard dismiss, accessibility all handled |
| Toast notifications | Custom toast state management | `sonner` | Already the project standard. Supports `action` prop for undo pattern |
| Week date calculation | Custom `startOfWeek`/`endOfWeek` | `date-fns` | Already imported in analytics, sessions. Handles locale/timezone correctly |
| Optimistic updates with rollback | Manual optimistic state tracking | React Query `onMutate`/`onError`/`onSettled` | Battle-tested pattern; handles concurrent mutations, cache invalidation |
| Backend request idempotency | Manual `Idempotency-Key` headers | `backendFetch` auto-injection | Already implemented in `backend-fetch.ts` — auto-generates UUID for mutations |
| Error sanitization | Custom error message filtering | `sanitizeError` / `internalError` from `error-sanitizer.ts` | Already implemented, follows 10-02 security decision |
| Table sorting | Custom sort logic | Local `useState` for sort config + JS `.sort()` | DataTable component already supports `sortConfig`/`onSort` props |

**Key insight:** This phase builds on fully-established patterns. Every primitive needed (modals, toasts, tables, skeleton loaders, progress indicators, error sanitization, fetch wrappers) already exists in the project. The work is composing these primitives into bonus-domain components.

## Common Pitfalls

### Pitfall 1: Week Start Day Mismatch

**What goes wrong:** `date-fns` `startOfWeek` defaults to Sunday (locale-dependent). The backend uses `getWeekStart` from `@lx/shared/lib/weekBoundary`. If the frontend and backend use different week start days, weeks won't match — creating a round for "this week" on the dashboard might target a different week than the backend expects.

**Why it happens:** `date-fns` v4 `startOfWeek` defaults to Sunday (day 0) unless locale is explicitly set.

**How to avoid:** Pass `{ weekStartsOn: 1 }` (Monday) if the backend's `getWeekStart` uses Monday, OR verify the backend's week boundary definition. Check `weekBoundary.ts` before implementing the week picker. If backend uses Sunday start, leave as default.

**Warning signs:** Round created for "this week" appears with wrong dates in the list.

### Pitfall 2: Bulk vs Individual Payment Route Order

**What goes wrong:** Express routes are matched in order. The backend has `/rounds/:roundId/payments/bulk` and `/rounds/:roundId/payments/:paymentId`. Since Express matches `:paymentId` literally, `bulk` would match as a paymentId if the routes are registered in wrong order.

**Why it happens:** The backend registers `bulk` before `:paymentId` (correct order in bonusRoutes.ts line 601 before line 467). But the proxy routes must also be set up correctly: the Next.js route `/api/guilds/[guildId]/bonus/rounds/[roundId]/payments/bulk/route.ts` must resolve before `[paymentId]/route.ts`. In Next.js App Router, static segments (`bulk`) take precedence over dynamic segments (`[paymentId]`) automatically.

**How to avoid:** Use directory structure `/payments/bulk/route.ts` (static) AND `/payments/[paymentId]/route.ts` (dynamic). Next.js App Router resolves static before dynamic — this is handled automatically.

**Warning signs:** Bulk update calls hitting the individual payment handler, returning 404.

### Pitfall 3: Optimistic Update Cache Key Mismatch

**What goes wrong:** Optimistic update targets query key `['guild', guildId, 'bonus', 'round', roundId]` but the actual data is stored under `['guild', guildId, 'bonus', 'round-detail', roundId]`. The update writes to the wrong cache entry, so the UI doesn't update.

**Why it happens:** Query keys must be consistent between the hook that fetches the data and the mutation that updates it.

**How to avoid:** Define all query keys as constants in `use-bonus.ts`:
```typescript
export const bonusKeys = {
  rounds: (guildId: string) => ['guild', guildId, 'bonus', 'rounds'] as const,
  roundDetail: (guildId: string, roundId: string) => ['guild', guildId, 'bonus', 'round', roundId] as const,
  results: (guildId: string, roundId: string) => ['guild', guildId, 'bonus', 'results', roundId] as const,
  leaderboard: (guildId: string, weeks: number) => ['guild', guildId, 'bonus', 'leaderboard', weeks] as const,
}
```

### Pitfall 4: Notes Auto-Save Race Condition

**What goes wrong:** User types in notes, blurs (auto-save fires), then immediately toggles paid status. Two PATCH requests fire concurrently. If they arrive out of order, the second request may overwrite the first.

**Why it happens:** The `PATCH /payments/:paymentId` endpoint accepts both `paid` and `notes` in one request. Concurrent requests can conflict.

**How to avoid:** Include current `paid` status when auto-saving notes (not just notes). And include current notes value when toggling paid. This way each request sends the full intended state, making order less critical. The backend will accept the last write as ground truth.

### Pitfall 5: Currency Input Edge Cases

**What goes wrong:** User inputs `$50` (no decimal), `50.1`, or `50.999`. The `parseFloat` + `Math.round(* 100)` conversion handles these: `$50` → 5000 cents, `50.1` → 5010, `50.999` → 5100. However, user input of `0` or negative amounts must be rejected.

**How to avoid:** Validate before submission:
```typescript
const amount = parseFloat(bonusAmount)
if (isNaN(amount) || amount <= 0) {
  setError('Please enter a valid positive amount')
  return
}
const amountCents = Math.round(amount * 100)
```

### Pitfall 6: DayPicker Week Disable Logic

**What goes wrong:** Disabling weeks that already have bonus rounds requires knowing the `weekStart` of each existing round. The list endpoint returns `week_start` for each round. But the disable logic must apply to the ENTIRE week, not just the start day.

**How to avoid:** Convert each round's `week_start` to a date range:
```typescript
const disabledWeeks = existingRounds.map(r => ({
  from: new Date(r.week_start),
  to: endOfWeek(new Date(r.week_start)),
}))
```
Pass `disabled={[{ after: endOfWeek(new Date()) }, ...disabledWeeks]}` to block future weeks AND weeks with existing rounds.

### Pitfall 7: "All Time" Leaderboard Weeks Value

**What goes wrong:** If the frontend sends `weeks=9999`, the backend may fail validation if the `leaderboardQuerySchema` has a max value constraint.

**How to avoid:** Check `bonusHelpers.ts` leaderboard schema. If it has a max, use that max value for "all time" instead of 9999. The current implementation in bonusRoutes.ts at line 860 just does `setDate(getDate() - (weeks * 7))` with no explicit max validation evident in what we've seen, but verify the zod schema.

## Code Examples

Verified patterns from official sources and project codebase:

### Proxy Route: POST Create Bonus Round

```typescript
// src/app/api/guilds/[guildId]/bonus/rounds/route.ts
import { backendFetch } from '@/lib/server/backend-fetch'
import { sanitizeError, internalError } from '@/lib/server/error-sanitizer'
import { BACKEND_API_URL } from '@/lib/server/api-url'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

type RouteParams = { params: Promise<{ guildId: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { guildId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const response = await backendFetch(
      `${BACKEND_API_URL}/api/v1/guilds/${guildId}/bonus/rounds`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json(
        sanitizeError(response.status, data, 'create bonus round'),
        { status: response.status }
      )
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(internalError('create bonus round'), { status: 500 })
  }
}
```

### React Query Hook: Load More Pattern

```typescript
// Source: Project pattern (accumulated state, not useInfiniteQuery)
export function useBonusRounds(guildId: string, filter: 'all' | 'evaluated' | 'pending') {
  const [rounds, setRounds] = useState<BonusRound[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const evaluated = filter === 'all' ? undefined : filter === 'evaluated' ? 'true' : 'false'

  const query = useQuery({
    queryKey: bonusKeys.rounds(guildId, filter, cursor),
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '10' })
      if (cursor) params.set('cursor', cursor)
      if (evaluated !== undefined) params.set('evaluated', evaluated)
      const res = await fetchWithRetry(`/api/guilds/${guildId}/bonus/rounds?${params}`)
      if (!res.ok) throw new Error('Failed to load bonus rounds')
      return res.json() as Promise<BonusRoundsResponse>
    },
    staleTime: 30 * 1000,
    enabled: !!guildId,
  })

  // Accumulate rounds when data changes
  useEffect(() => {
    if (query.data) {
      if (cursor === null) {
        setRounds(query.data.rounds) // First page replaces
      } else {
        setRounds(prev => [...prev, ...query.data!.rounds]) // Subsequent pages append
      }
      setHasMore(query.data.has_more)
    }
  }, [query.data, cursor])

  const loadMore = () => {
    if (query.data?.next_cursor) setCursor(query.data.next_cursor)
  }

  // Reset when filter changes
  useEffect(() => {
    setRounds([])
    setCursor(null)
  }, [filter, guildId])

  return { rounds, hasMore, loadMore, isLoading: query.isLoading, isError: query.isError }
}
```

### TypeScript Types: bonus.ts

```typescript
// src/types/bonus.ts — derived from bonusRoutes.ts response shapes
export interface BonusRound {
  id: string
  week_start: string
  week_end: string
  bonus_amount_cents: number
  evaluated: boolean
  evaluated_at: string | null
  evaluated_by: string | null
  created_by: string
  created_at: string
  targets: BonusTarget[]
}

export interface BonusTarget {
  id: string
  account_group_id: string
  account_group_label: string
  target_views: number
  actual_views: number | null
  achieved: boolean | null
  delta: number | null
}

export interface BonusPayment {
  id: string
  account_group_id: string
  account_group_label: string
  amount_cents: number
  paid: boolean
  paid_at: string | null
  paid_by: string | null
  notes: string | null
  created_at: string
}

export interface BonusRoundDetail extends BonusRound {
  payments: BonusPayment[]
}

export interface BonusRoundsResponse {
  rounds: BonusRound[]
  next_cursor: string | null
  has_more: boolean
}

export interface BonusRoundDetailResponse {
  round: BonusRoundDetail
}

export interface BonusResultTarget {
  account_group_id: string
  account_group_label: string
  brand_label: string
  target_views: number
  actual_views: number
  achieved: boolean
  delta: number
  delta_percent: number
  near_miss: boolean
  payment: {
    id: string
    amount_cents: number
    paid: boolean
    paid_at: string | null
    paid_by: string | null
  } | null
}

export interface BonusResultsResponse {
  round: {
    id: string
    week_start: string
    week_end: string
    bonus_amount_cents: number
    evaluated_at: string | null
    evaluated_by: string | null
  }
  summary: {
    total_groups: number
    achieved_count: number
    missed_count: number
    near_miss_count: number
    total_bonus_cents: number
    total_paid_cents: number
    total_unpaid_cents: number
  }
  results: BonusResultTarget[]
}

export interface BonusLeaderboardEntry {
  account_group_id: string
  group_label: string
  brand_label: string
  total_rounds: number
  rounds_achieved: number
  hit_rate_percent: number
  total_bonus_cents: number
  total_paid_cents: number
}

export interface BonusLeaderboardResponse {
  leaderboard: BonusLeaderboardEntry[]
  meta: {
    weeks: number
    since: string
    total_groups: number
    total_rounds_evaluated: number
  }
}

export interface CreateBonusRoundRequest {
  week_start: string           // ISO date string
  bonus_amount_cents: number
  targets: {
    account_group_id: string
    target_views: number
  }[]
}
```

### Filter Tab Pattern (matching project style)

```tsx
// Source: Based on data page tab pattern in manage/data/page.tsx
type RoundFilter = 'all' | 'evaluated' | 'pending'

const FILTERS: { id: RoundFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'evaluated', label: 'Evaluated' },
  { id: 'pending', label: 'Pending' },
]

<div className="inline-flex bg-surface border border-border rounded-lg p-1 gap-1">
  {FILTERS.map((f) => (
    <button
      key={f.id}
      type="button"
      onClick={() => setFilter(f.id)}
      className={cn(
        'px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
        filter === f.id
          ? 'bg-accent-purple text-white shadow-sm'
          : 'text-gray-400 hover:text-gray-200'
      )}
    >
      {f.label}
    </button>
  ))}
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Page navigation for detail views | Inline card expansion (accordion) | Design decision per CONTEXT.md | Avoids URL management, keeps context in list |
| Infinite scroll | "Load More" button | Design decision per CONTEXT.md | Better UX for paginated data, less accidental loading |
| Polling for optimistic updates | React Query `onMutate`/`onError` rollback | Project standard from v1.0 | Instant UI feedback without waiting for server |
| Full-page confirmation for every action | Per-action pattern: no-confirm for single toggles, confirm for bulk | Design decision per CONTEXT.md | Reduces friction for common operations |

**Deprecated/outdated:**
- `next/router` `useRouter().push()` for bonus detail: Not applicable — inline expansion used instead
- `react-query` v4 patterns: Project uses v5 (^5.90.20) — all hooks use v5 API (`initialPageParam`, `getNextPageParam` in `useInfiniteQuery`)

## Open Questions

1. **Backend week start day (Monday vs Sunday)**
   - What we know: `date-fns` v4 `startOfWeek` defaults to Sunday. The backend uses `getWeekStart` from `@lx/shared/lib/weekBoundary.ts`.
   - What's unclear: Whether the backend uses Monday or Sunday as week start.
   - Recommendation: Read `weekBoundary.ts` at build time (task 1). If Monday, pass `{ weekStartsOn: 1 }` to `date-fns` functions.

2. **Leaderboard max weeks validation in bonusHelpers.ts**
   - What we know: The leaderboard uses `weeks` query param. The schema is in `bonusHelpers.ts` (not fully read).
   - What's unclear: Whether there's a max value cap in the zod schema.
   - Recommendation: Read `bonusHelpers.ts` in task 1. If max is set, use that value for "All time" instead of 9999.

3. **Creation form: sheet/drawer vs modal dialog**
   - What we know: Decided as Claude's discretion. The form has ~4 steps: week picker + group selection + target views + review summary.
   - What's unclear: Whether complexity warrants a full-width slide-in sheet or a centered dialog is sufficient.
   - Recommendation: Use `@headlessui/react` `Dialog` for the modal (established pattern in project). The form fits in a dialog with stepped sections — no need for a full-screen drawer. Keep modal max-width at `max-w-2xl` to accommodate the group checklist.

## Sources

### Primary (HIGH confidence)
- `/Users/gabrielleal/Desktop/Tracking Data Bot/api/src/routes/dashboard/bonus/bonusRoutes.ts` — Complete backend API, all 7 endpoint shapes verified
- `/Users/gabrielleal/Desktop/dashboard-tracking-bot/src/app/api/guilds/[guildId]/exports/route.ts` — Proxy route pattern verified
- `/Users/gabrielleal/Desktop/dashboard-tracking-bot/src/lib/server/backend-fetch.ts` — Auto-idempotency-key behavior verified
- `/Users/gabrielleal/Desktop/dashboard-tracking-bot/src/lib/server/error-sanitizer.ts` — Error sanitization pattern verified
- `/Users/gabrielleal/Desktop/dashboard-tracking-bot/src/hooks/use-exports.ts` — Optimistic update and mutation patterns verified
- `/Users/gabrielleal/Desktop/dashboard-tracking-bot/src/hooks/use-alerts.ts` — Mutation + invalidation patterns verified
- `/Users/gabrielleal/Desktop/dashboard-tracking-bot/package.json` — All installed dependencies verified
- Context7 `/gpbl/react-day-picker` — Week selection pattern, disabled dates, v9.x API verified

### Secondary (MEDIUM confidence)
- `/Users/gabrielleal/Desktop/dashboard-tracking-bot/src/app/(dashboard)/guilds/[guildId]/manage/data/page.tsx` — Tab pattern for Rounds/Leaderboard top-level tabs
- `/Users/gabrielleal/Desktop/dashboard-tracking-bot/src/components/analytics/leaderboard.tsx` — Leaderboard row rendering reference pattern
- `/Users/gabrielleal/Desktop/dashboard-tracking-bot/src/components/ui/data-table.tsx` — Sortable table pattern for payment list

### Tertiary (LOW confidence — needs verification in task 1)
- Backend `bonusHelpers.ts` not fully read — leaderboard `weeks` max value unknown
- Backend `weekBoundary.ts` not read — week start day (Mon vs Sun) unknown

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified from package.json and existing usage
- Architecture: HIGH — all proxy patterns, hook patterns, component patterns verified from existing project files
- API shapes: HIGH — complete backend source read, all 7 endpoints documented
- Pitfalls: HIGH — derived from reading actual code, not speculation
- react-day-picker week picker: HIGH — verified from Context7 official docs

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable stack, no fast-moving dependencies)
