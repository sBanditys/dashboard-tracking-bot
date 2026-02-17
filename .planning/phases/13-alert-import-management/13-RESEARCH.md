# Phase 13: Alert & Import Management - Research

**Researched:** 2026-02-17
**Domain:** Alert threshold management, email alert configuration, CSV import/export, admin-gated routing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Alert Threshold Display
- Card-based layout — each threshold as a card with metric icon, platform badge, value, enabled toggle, and last triggered timestamp
- Flat list with filters — all thresholds in one list, not grouped by account group
- Three filter dropdowns: account group, platform, metric type
- Text search — instant filter-as-you-type (debounced) to search by group name or threshold value
- All fields on cards: metric icon, platform badge, threshold value, enabled toggle, last triggered timestamp
- Last triggered: relative time by default ("2 hours ago"), absolute on hover/tooltip
- Inline toggle for enable/disable directly on card — waits for API confirmation before flipping (not optimistic)
- Per-group alert settings — Claude's discretion on presentation (e.g., banner when filtering by group)
- Discord notification channel shown as read-only info on the alerts page
- Empty state: friendly illustration + prominent "Create threshold" CTA button
- Infinite scroll for threshold list
- Nav badge: show count of active thresholds on the alerts nav item

#### Alert Creation Form
- Modal/dialog — opens from "Create threshold" button
- Metric type: radio buttons with icons (eye for views, heart for likes, chat for comments)
- Platform: dropdown defaulting to "All platforms", can change to specific platform (instagram, tiktok, youtube, x, facebook)
- Threshold value: number input with context hints showing current metric averages if available
- Account group selector: only shows groups where user has admin permissions
- Prevent duplicates — warn if threshold for same metric+platform already exists on the group
- Post-create: modal closes, success toast, new card animates into list (fade + slide in)
- Validation: inline field errors for form validation + toast for server errors

#### Alert Deletion
- Type to confirm — must type "delete" to confirm deletion (both single and bulk)
- Card exit animation: fade out + collapse, remaining cards slide up smoothly

#### Bulk Operations
- Checkboxes on each card with "Select all" for visible (filtered) thresholds
- Sticky bulk action bar stays visible when scrolling — Enable All, Disable All, Delete actions
- Bulk delete requires same "type to confirm" pattern

#### Email Alert Configuration
- Placement: Claude's discretion (section or tab within alerts page)
- Delivery mode: immediate vs daily digest toggle
- Digest time picker: Claude's discretion (dropdown or time input for UTC hour)
- Recipients: inline list with masked emails (first 3 chars visible always, even for admins), verification badge, resend button, remove button
- Verification status: show distinct "Verification expired" state with prominent resend button after 24h
- Email validation: client-side format check before sending to backend
- Rate limit info: display "Max X emails/hour per recipient" in email config section
- Max 5 recipients per guild (backend enforced)

#### Import Flow
- Dedicated import/export page at `/guilds/[guildId]/manage/data`
- Tabs: Import | Export with slide transition between tabs
- Drag & drop upload zone on desktop, tap-to-upload button on mobile
- Template download button on import page only — relies on template, no inline column docs
- Show limits: "500 rows max, 1MB file size limit" displayed near upload area
- All-or-nothing validation — all rows must be valid before import can proceed
- Validation error display: Claude's discretion on best error presentation
- Inline editing: Claude decides safest approach against injection (likely re-upload only)
- Extra confirmation dialog before starting import — "Import X accounts?" with Cancel/Confirm
- Progress bar + count — animated bar showing "127/500 accounts imported" with percentage
- SSE real-time progress for import
- Concurrent import: Claude decides based on backend CSV lock behavior (likely block with message)
- Post-import: success summary showing "X accounts imported successfully" with link to view them
- Import history: show recent imports below upload area (date, row count, success/failure status)
- Client pre-check: verify file type and basic CSV structure before sending to backend for full validation

#### Export Experience
- All export types exposed: accounts, posts, metrics, analytics, audit (+ GDPR separate)
- Radio cards for export type selection with icon and description per type
- Format selector: dropdown to choose CSV, XLSX, or JSON
- XLSX format: single sheet with platform column (not separate sheets per platform)
- Three filter dropdowns: brand, group, platform (type-specific filters — Claude decides per type)
- Preview first: show "X accounts match your filters" with sample rows before downloading
- Row selection: Claude decides (likely export all matching, no per-row selection)
- Progress bar during export generation with cancel button
- SSE real-time progress for export
- Export history: shared list across all types with type badge, date, format, row count, re-download link
- Expiry display: show "Expires in 18h" or "Expired" badge on history entries (24h download URL expiry)
- Remaining quota: display "8 of 10 exports remaining today" near export button
- Empty state: disable export button when 0 results match filters
- File naming: Claude decides (descriptive with date/filters)
- GDPR export: separate section with clear data privacy messaging and separate 3/day quota display

#### Navigation & Routing
- Routes: `/guilds/[guildId]/manage/alerts` and `/guilds/[guildId]/manage/data`
- Manage section: sub-navigation in sidebar with items: Alerts, Data
- Admin-only: entire /manage section only visible to admins in sidebar
- 403 page: non-admins navigating directly to /manage URLs see "You don't have permission" with back link

#### Mobile Responsiveness
- Full mobile support across all pages
- Alerts: cards stack vertically, filters adapt to mobile layout
- Import: tap-to-upload replaces drag & drop on mobile
- Validation table: Claude decides (horizontal scroll or card layout on mobile)
- Export radio cards: Claude decides (stack or carousel on mobile)

#### Accessibility
- WCAG 2.1 AA compliance across all Phase 13 pages
- Keyboard navigation: all interactive elements keyboard accessible
- Upload zone: Claude decides best keyboard-accessible alternative (visible browse button or hidden input)
- Progress bars: ARIA live region announcements at milestones (25%, 50%, 75%, complete)
- Screen reader labels: all toggles, buttons, and form controls properly labeled

#### Animations
- New threshold card: fade in + slide down from top
- Deleted threshold card: fade out + collapse, remaining cards slide up
- Tab switch: slide left/right transition between Import and Export tabs

#### Loading States
- Alerts page: skeleton cards matching threshold card shape
- Export tab: progressive load — show static UI immediately, history and quotas load inline

#### Error Handling
- Alert creation: inline field errors + toast for server errors
- CSV upload failure: drop zone turns red with error message, user can try again
- Export failure: progress bar turns red + error message + "Try again" button
- Toggle failure: waits for API, shows loading state, only flips after confirmation

#### Audit Logging
- Rely on existing audit log page (no inline audit on Phase 13 pages)
- Import entries: detailed with link — summary ("Imported 50 accounts from CSV") + link to import details

#### Real-Time Updates
- Import/Export: SSE for both import and export progress tracking
- Threshold data: Claude's discretion (React Query polling consistent with existing patterns)

#### Pagination & Data Loading
- Thresholds: infinite scroll
- Import/export history: paginated, 20 items per page

#### Search
- Alerts page: instant filter-as-you-type text search (debounced) for group name or threshold value
- Import/export history: Claude's discretion based on expected volume

### Claude's Discretion
- Per-group alert settings presentation (banner vs collapsible header)
- Email config placement (section vs tab on alerts page)
- Digest time picker implementation
- Validation error display format (inline table vs split valid/invalid)
- Inline editing safety (likely re-upload only for injection safety)
- Concurrent import handling
- Export row selection (likely all matching)
- Export file naming convention
- Type-specific filter mapping for non-account export types
- Mobile table adaptation (horizontal scroll vs cards)
- Mobile radio card layout (stack vs carousel)
- Upload zone keyboard accessibility approach
- Threshold value min/max constraints
- Import/export history search/filtering
- Alert data refresh strategy (polling interval)

### Deferred Ideas (OUT OF SCOPE)
- In-app alert notifications (browser/push) — separate notification system phase
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ALERT-01 | User can view alert thresholds for an account group | Backend GET `/guilds/:guildId/groups/:groupId/alert-thresholds` exists. Dashboard needs: proxy route, hook, and page component. Flat list with filters requires client-side filtering across groups (multi-group fetch or new cross-guild endpoint). |
| ALERT-02 | Admin can create alert threshold (metric type, platform, value) | Backend POST exists at same path with Zod validation. Dashboard needs: proxy route, form modal with radio inputs, duplicate detection via local state. |
| ALERT-03 | Admin can delete an alert threshold | Backend DELETE exists with idempotency. Dashboard needs: proxy route, TypeToConfirmModal (already exists), card exit animation. |
| ALERT-04 | Admin can update alert settings (streak, threshold, status alerts toggle) | Backend PATCH `/guilds/:guildId/groups/:groupId/alert-settings` exists. **Missing:** PATCH for individual threshold `enabled` toggle — must add to backend. Dashboard needs: inline toggle on card with loading state, proxy route for both alert-settings and individual threshold toggle. |
| IMPEX-01 | Admin can export accounts to CSV with brand/group/platform filters | Backend GET `/guilds/:guildId/accounts/export` exists. Dashboard currently has export page at `/guilds/[guildId]/exports`. Phase 13 moves/extends export under `/manage/data`. The backend `exports.ts` route only accepts `dataType: z.enum(['accounts', 'posts'])` — must extend to all ExportType values from `exportService`. |
| IMPEX-02 | User can download CSV import template | Backend GET `/guilds/:guildId/accounts/template` exists, returns CSV stream. Dashboard needs: proxy GET route (no existing one found) + download button UI. |
| IMPEX-03 | Admin can upload CSV for import preview with validation | Backend POST `/guilds/:guildId/accounts/import` exists with multer, parse+validate pipeline, returns preview object. Dashboard needs: proxy POST route with multipart forwarding, upload zone UI, validation display. |
| IMPEX-04 | Admin can confirm and execute import with progress indicator | Backend POST `/guilds/:guildId/accounts/import/confirm` exists with SSE streaming. Dashboard needs: proxy SSE route, confirmation dialog, progress bar with `useSSE` hook. |
</phase_requirements>

---

## Summary

Phase 13 builds on a well-prepared backend. The backend already has all alert threshold CRUD endpoints (`guildAlerts.ts`), email alert configuration endpoints (`guildEmailAlerts.ts`), CSV import with SSE progress (`accounts/import.ts`), and a general export service (`exports.ts`). The dashboard currently lacks all of these — no hooks, no proxy routes, and no UI components for alert management, email configuration, or CSV import.

The largest backend gap is the missing PATCH endpoint for toggling individual alert threshold `enabled` status. The backend route file only has GET (list), POST (create), DELETE, and PATCH for group-level alert settings. The inline toggle on each card requires a new `PATCH /guilds/:guildId/groups/:groupId/alert-thresholds/:thresholdId` endpoint. Additionally, the dashboard export API route currently limits `dataType` to `['accounts', 'posts']` via Zod enum — this must be extended to the full `ExportType` union (`posts | metrics | analytics | accounts | gdpr | audit`) that the shared `exportService` already supports.

The new `/manage` section requires a structural change: adding sub-navigation to the sidebar (admin-gated), two new page routes (`/guilds/[guildId]/manage/alerts` and `/guilds/[guildId]/manage/data`), a 403 guard component, and updating the `GuildTabs` or sidebar to conditionally show Manage nav items based on user permissions. All animations use Tailwind CSS `transition-*` classes (no Framer Motion in this project).

**Primary recommendation:** Implement in this order: (1) backend PATCH threshold toggle + extend export dataType enum, (2) proxy API routes for all new endpoints, (3) shared hooks, (4) manage section routing + 403 guard, (5) alerts page UI, (6) email config section, (7) data page with import/export tabs.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | `^16` | App Router pages and API proxy routes | Existing framework |
| React | `^19` | UI components | Existing framework |
| @tanstack/react-query | `^5.90.20` | Server state, infinite scroll, mutations | Existing pattern throughout all hooks |
| sonner | `^2.0.7` | Toast notifications | Used in all existing mutation hooks |
| @headlessui/react | `^2.2.9` | Modal dialogs (Dialog, Listbox) | Used for TypeToConfirmModal, ConfirmationModal, filters |
| lucide-react | `^0.564.0` | Icons | Used in existing components |
| react-intersection-observer | `^10.0.2` | Infinite scroll sentinel | Used in accounts and posts pages |
| date-fns | `^4.1.0` | Relative time formatting for "last triggered" timestamps | Already installed |
| zod | `^4.3.6` | Client-side form validation schema | Already installed |
| tailwindcss | `^3.4.1` | All animations via `transition-*`, `animate-*` classes | No Framer Motion — pure Tailwind |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-day-picker | `^9.13.0` | Date/time pickers | Available if needed for digest time picker (though simple `<select>` preferred per project style) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tailwind `transition-*` for animations | Framer Motion | Framer Motion not installed; Tailwind is the project standard |
| `useInfiniteQuery` for threshold list | Simple paginated `useQuery` | Infinite scroll is locked decision; use `useInfiniteQuery` + `useInView` sentinel |
| `EventSource` directly | `useSSE` hook (already built) | `useSSE` has exponential backoff, tab visibility handling, reconnect — use it |
| Simple `<input type="file">` | react-dropzone | No external dropzone library needed; native HTML drag events + hidden input is sufficient and avoids new dependency |

**Installation:** No new npm packages required. All needed libraries are already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── guilds/[guildId]/
│   │       └── manage/
│   │           ├── layout.tsx           # Admin guard + sub-nav for manage section
│   │           ├── alerts/
│   │           │   └── page.tsx         # Alert threshold list + email config
│   │           └── data/
│   │               └── page.tsx         # Import/Export tabs
│   └── api/
│       └── guilds/[guildId]/
│           ├── groups/[groupId]/
│           │   ├── alert-thresholds/
│           │   │   ├── route.ts         # GET (list), POST (create)
│           │   │   └── [thresholdId]/
│           │   │       └── route.ts     # DELETE, PATCH (toggle enabled)
│           │   └── alert-settings/
│           │       └── route.ts         # PATCH (group-level settings)
│           ├── email-config/
│           │   └── route.ts             # GET, PUT
│           ├── email-recipients/
│           │   ├── route.ts             # POST (add)
│           │   └── [recipientId]/
│           │       ├── route.ts         # DELETE
│           │       └── resend-verification/
│           │           └── route.ts     # POST
│           └── accounts/
│               ├── template/
│               │   └── route.ts         # GET (download CSV template)
│               ├── import/
│               │   └── route.ts         # POST (preview/dry-run)
│               └── import/confirm/
│                   └── route.ts         # POST (SSE streaming import)
├── hooks/
│   ├── use-alerts.ts                    # Alert threshold hooks
│   ├── use-email-alerts.ts              # Email config hooks
│   └── use-import.ts                    # CSV import hooks
├── components/
│   ├── manage/
│   │   ├── manage-nav.tsx               # Sub-navigation (Alerts / Data)
│   │   └── admin-guard.tsx              # 403 component for non-admins
│   ├── alerts/
│   │   ├── threshold-card.tsx           # Individual card with toggle, delete
│   │   ├── threshold-card-skeleton.tsx  # Loading skeleton
│   │   ├── threshold-filters.tsx        # Filter dropdowns + search
│   │   ├── threshold-create-modal.tsx   # Create modal with radio inputs
│   │   ├── threshold-bulk-bar.tsx       # Sticky bulk action bar
│   │   └── email-config-section.tsx     # Email delivery config + recipients
│   └── import-export/
│       ├── import-tab.tsx               # Upload zone, validation, progress
│       ├── export-tab.tsx               # Replaces existing exports page content
│       ├── upload-zone.tsx              # Drag & drop + tap-to-upload
│       ├── import-validation-display.tsx # Validation error presentation
│       └── import-history.tsx           # Recent import entries
└── types/
    ├── alert.ts                         # AlertThreshold, EmailConfig, EmailRecipient types
    └── import.ts                        # ImportPreview, ImportProgress, ImportHistoryEntry types
```

### Pattern 1: Admin Guard via Layout
**What:** A `manage/layout.tsx` server component that checks user permissions and renders either the children or a 403 view.
**When to use:** Admin-only sections where any subroute must be protected.
**Example:**
```typescript
// src/app/(dashboard)/guilds/[guildId]/manage/layout.tsx
// Server component — reads user permissions from session cookie
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const ADMINISTRATOR = 0x8

export default async function ManageLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ guildId: string }>
}) {
  const { guildId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) redirect('/login')

  // Fetch user's guild permissions from backend
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) redirect('/login')
  const user = await res.json()
  const guild = user.guilds?.find((g: { id: string }) => g.id === guildId)
  const hasAdmin = guild && (Number(guild.permissions) & ADMINISTRATOR) !== 0

  if (!hasAdmin) {
    // Render 403 — don't redirect, show message with back link
    return <AdminForbidden guildId={guildId} />
  }

  return <ManageShell guildId={guildId}>{children}</ManageShell>
}
```

### Pattern 2: Infinite Scroll with useInfiniteQuery + useInView
**What:** Existing pattern for threshold list (same as accounts/posts pages).
**When to use:** All infinite scroll lists.
**Example:**
```typescript
// From existing use-tracking.ts pattern
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['guild', guildId, 'alerts', 'thresholds', filters],
  queryFn: async ({ pageParam }) => {
    const res = await fetchWithRetry(`/api/guilds/${guildId}/alerts?page=${pageParam}&...`)
    return res.json()
  },
  initialPageParam: 1,
  getNextPageParam: (lastPage) =>
    lastPage.pagination.page >= lastPage.pagination.total_pages
      ? undefined
      : lastPage.pagination.page + 1,
})

const { ref, inView } = useInView({ threshold: 0, rootMargin: '100px' })
useEffect(() => {
  if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
}, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])
```

**Important:** The backend alert threshold endpoint is scoped per group (`/guilds/:guildId/groups/:groupId/alert-thresholds`). To render a flat cross-group list, options are:
- (A) Add a new cross-guild endpoint on the backend: `GET /guilds/:guildId/alert-thresholds` that lists all thresholds across all groups — **recommended for infinite scroll**
- (B) Fetch all groups first, then fan-out requests per group and merge — fragile, hard to paginate

**Recommendation:** Add cross-guild GET `/guilds/:guildId/alert-thresholds` to the backend. This is a new route not currently present in `guildAlerts.ts`.

### Pattern 3: SSE Progress with Existing useSSE Hook
**What:** Use the project's `useSSE` hook (in `src/hooks/use-sse.ts`) for import/export progress.
**When to use:** Any SSE endpoint.
**Example:**
```typescript
// Import progress consumption
const { connectionState } = useSSE(
  importJobId ? `/api/guilds/${guildId}/accounts/import/confirm` : null,
  {
    onMessage: (data) => {
      const event = data as ImportProgressEvent
      if (event.type === 'progress') setProgress(event)
      if (event.type === 'complete') onComplete(event.result)
      if (event.type === 'error') onError(event.message)
    },
  }
)
```

**Note:** Import confirm is a POST that returns SSE, not a GET endpoint. The existing `useSSE` hook uses `EventSource` which only supports GET. For POST-SSE, must use `fetchWithRetry` manually and read the response body as a stream, or proxy the POST into a GET SSE pattern via job ID (create job → poll SSE by job ID). The existing export pattern does this: POST creates an export record, GET `/exports/:id/progress` streams SSE. Import should follow the same pattern for frontend consistency.

**Confirmed:** The backend import confirm POST uses `res.write()` directly in the response — it IS a POST that streams SSE. The dashboard proxy must handle this carefully. Simplest approach: have the confirm route return an `exportId`-equivalent (or use SSE directly from the proxy by streaming the backend response).

### Pattern 4: TypeToConfirmModal for Destructive Actions
**What:** Already built as `src/components/ui/type-to-confirm-modal.tsx`. Use as-is.
**When to use:** Any deletion requiring "type to confirm" pattern.
**Props:** `open`, `onClose`, `onConfirm`, `title`, `description`, `confirmText="delete"`, `confirmLabel`, `isLoading`, `variant="danger"`.

### Pattern 5: Card Toggle with Loading State (Non-Optimistic)
**What:** Toggle switch that shows loading spinner, waits for API, then flips. On error, stays in original state.
**When to use:** Enable/disable threshold toggle.
**Example:**
```typescript
const [isToggling, setIsToggling] = useState(false)

const handleToggle = async () => {
  setIsToggling(true)
  try {
    await toggleThreshold.mutateAsync({ thresholdId, enabled: !threshold.enabled })
    // Query invalidation updates the UI
  } catch {
    // Toast error, state reverts via query cache (no optimistic update to undo)
  } finally {
    setIsToggling(false)
  }
}
```

### Pattern 6: Drag-and-Drop Upload Zone
**What:** Native HTML `onDragOver/onDrop` events + hidden `<input type="file">`. No external library.
**When to use:** CSV upload on import page.
**Example:**
```typescript
const [isDragging, setIsDragging] = useState(false)
const [error, setError] = useState<string | null>(null)

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault()
  setIsDragging(false)
  const file = e.dataTransfer.files[0]
  if (!file) return
  // Client pre-check: file type + basic size validation
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    setError('Only CSV files are supported')
    return
  }
  if (file.size > 1024 * 1024) {
    setError('File must be under 1MB')
    return
  }
  onFileSelected(file)
}

// Keyboard accessibility: visible "Browse file" button that triggers hidden input
<input type="file" accept=".csv" ref={fileInputRef} onChange={...} className="sr-only" aria-label="Upload CSV file" />
<button onClick={() => fileInputRef.current?.click()}>Browse file</button>
```

### Pattern 7: Sidebar Admin-Gated Navigation
**What:** Update `src/components/layout/sidebar.tsx` to conditionally show Manage nav items based on ADMINISTRATOR permission bit.
**When to use:** Admin-only nav items.
**How:** `useUser()` hook returns the user object with `guilds[].permissions`. Check `(permissions & 0x8) !== 0`.
**Note:** Sidebar currently uses `guildMatch` to detect current guild and show guild nav items. Add Manage nav items in the same guild-specific block, conditionally rendered.

### Anti-Patterns to Avoid
- **Optimistic toggle:** The decision is to wait for API confirmation before flipping toggle state. Do not use `useMutation`'s `onMutate` for optimistic updates on the toggle.
- **Fan-out per-group alert fetching:** Do not fetch each group's thresholds individually and merge. Add a cross-guild endpoint instead.
- **Using EventSource for POST-SSE:** `EventSource` only supports GET. The import confirm endpoint is a POST. Handle this by proxying through the Next.js API route which streams the response body.
- **Inline CSV editing:** Per decisions, use re-upload only for injection safety. Do not build an editable table for CSV rows.
- **Separate XLSX sheets per platform:** Decision is single sheet with platform column.
- **Non-CSRF-protected mutations:** All POST/DELETE/PATCH proxy routes must forward the `X-CSRF-Token` header (this is handled automatically by `fetchWithRetry` which reads `_csrf_token` cookie and injects the header).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE connection with retry | Custom EventSource wrapper | `useSSE` hook (`src/hooks/use-sse.ts`) | Already has exponential backoff, tab visibility handling, reconnect, cooldown |
| Debounced search | setTimeout in component | `useDebounce` hook (`src/hooks/use-debounce.ts`) | Already built, used throughout filters |
| Multi-select with shift-click | Custom selection logic | `useShiftSelection` hook (`src/hooks/use-selection.ts`) | Already supports shift-range, toggle, select-all |
| Type-to-confirm modal | Custom dialog | `TypeToConfirmModal` (`src/components/ui/type-to-confirm-modal.tsx`) | Already exists with all required variants |
| Empty state UI | Custom | `EmptyState` and `NoResults` (`src/components/empty-state.tsx`) | Already built with action button support |
| Loading skeleton | Custom shimmer | `Skeleton` (`src/components/ui/skeleton.tsx`) | Already has `line`, `circle`, `rect` shapes |
| API proxy pattern | Custom fetch | `backendFetch` + `sanitizeError` + `internalError` | All proxy routes use this pattern, handles X-Internal-Secret |
| Infinite scroll sentinel | Custom IntersectionObserver | `useInView` from `react-intersection-observer` | Already installed, used in accounts/posts pages |
| Card checkbox multi-select | Custom | `useShiftSelection` | Already handles sets, toggle, range |
| Relative time display | Custom | `date-fns` `formatDistanceToNow` | Already installed |

**Key insight:** This project has a substantial library of already-built utilities and UI components. Almost no new infrastructure is needed — the work is building application-specific components on top of existing primitives.

---

## Common Pitfalls

### Pitfall 1: Missing Cross-Guild Alert Endpoint
**What goes wrong:** The backend only has `GET /guilds/:guildId/groups/:groupId/alert-thresholds` (per-group). The UI needs a flat list across all groups for the infinite scroll view.
**Why it happens:** Original backend was built for per-group use. Phase 13 UI design requires a cross-group view.
**How to avoid:** Add `GET /guilds/:guildId/alert-thresholds` to `guildAlerts.ts` backend file. This should accept pagination, optional groupId/platform/metricType filter params, and return paginated thresholds with their group name/id included.
**Warning signs:** Infinite scroll list breaks or requires multiple waterfall requests.

### Pitfall 2: Missing PATCH Threshold Toggle Endpoint
**What goes wrong:** There is no `PATCH /guilds/:guildId/groups/:groupId/alert-thresholds/:thresholdId` for toggling `enabled`. Without it, the inline toggle cannot be implemented.
**Why it happens:** Backend guildAlerts.ts has GET (list), POST (create), DELETE, but no PATCH for individual thresholds.
**How to avoid:** Add PATCH endpoint to backend before building the toggle UI. The frontend toggle must wait for this endpoint.
**Warning signs:** Toggle on card doesn't persist or requires workaround.

### Pitfall 3: Export dataType Enum Too Narrow
**What goes wrong:** The backend `exports.ts` route validates `dataType: z.enum(['accounts', 'posts'])`. Sending `metrics`, `analytics`, `audit`, or `gdpr` returns a 400 error even though the `exportService` handles all types.
**Why it happens:** The route was built for Phase 12 scope (accounts + posts) and wasn't expanded.
**How to avoid:** Extend the Zod enum in `exports.ts` to `z.enum(['accounts', 'posts', 'metrics', 'analytics', 'audit', 'gdpr'])`. Also update the `ExportRequest` type in the dashboard `src/types/export.ts` to include all types.
**Warning signs:** Export fails with 400 for metrics/analytics/audit/GDPR types.

### Pitfall 4: POST-SSE Import Confirm Proxy
**What goes wrong:** The import confirm endpoint (`POST /accounts/import/confirm`) returns an SSE stream from a POST request. Next.js API route proxies and `EventSource` both expect GET for streaming.
**Why it happens:** Import is a fire-and-complete operation — the POST body carries the validated rows, and the response streams progress.
**How to avoid:** The Next.js proxy route for import confirm must forward the POST and stream the response body back to the client using `TransformStream` or response body passthrough. The client-side must use `fetch()` + `ReadableStream` parsing (not `EventSource`). Alternatively, refactor to a job-ID pattern: POST returns a job ID, GET streams progress — but this requires backend changes and is unnecessary complexity.

Recommended approach for the proxy:
```typescript
// app/api/guilds/[guildId]/accounts/import/confirm/route.ts
export async function POST(request: NextRequest, { params }: RouteParams) {
  // Forward the POST, pipe the SSE response body directly back
  const response = await backendFetch(backendUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  // Return streaming response
  return new NextResponse(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

On the client, read using `fetch` + ReadableStream:
```typescript
const res = await fetch('/api/guilds/.../accounts/import/confirm', { method: 'POST', body: ... })
const reader = res.body!.getReader()
const decoder = new TextDecoder()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  const chunk = decoder.decode(value)
  // Parse SSE lines
}
```

### Pitfall 5: Missing Template Proxy Route
**What goes wrong:** The backend has `GET /guilds/:guildId/accounts/template` returning a CSV stream. There is no corresponding Next.js proxy route in the dashboard.
**Why it happens:** Was never added — only import and export proxy routes were built.
**How to avoid:** Add `GET` handler at `/api/guilds/[guildId]/accounts/template/route.ts` that pipes the backend CSV response directly to the client with `Content-Disposition: attachment` headers preserved.

### Pitfall 6: Admin Check in Sidebar
**What goes wrong:** Sidebar is a client component (`'use client'`). It reads `pathname` but doesn't know the user's permissions for the current guild.
**Why it happens:** User permissions per guild live in the session/auth data, not in URL.
**How to avoid:** Use `useUser()` hook (already exists in `src/hooks/use-user.ts`) to get the user object. Find the current guild in `user.guilds` by guildId, check `(permissions & 0x8) !== 0`. Show Manage nav items only when this check passes. The sidebar already has the `guildId` from `pathname.match`.

### Pitfall 7: Email Masking Is Server-Side Only
**What goes wrong:** Developer tries to unmask emails on the client by calling a different endpoint. Backend always returns masked emails (`abc***@domain.com`) — even to admins. This is by design.
**Why it happens:** Privacy requirement — masked emails prevent email harvesting even by admins. The `maskEmail()` function in `guildEmailAlerts.ts` is always applied.
**How to avoid:** Design the email recipient UI to work with masked emails. No "reveal email" feature. Verification badge and resend/remove buttons work by recipient `id`, not email.

### Pitfall 8: Concurrent Import Lock
**What goes wrong:** Backend uses `acquireImportLock(guildAccess.id)` — only one import per guild at a time. Second upload attempt returns 409 Conflict.
**Why it happens:** Intentional — prevents data corruption from concurrent imports.
**How to avoid:** When the proxy returns 409, show a non-dismissable blocking state on the upload UI: "An import is currently in progress. Please wait for it to complete before starting a new one." The upload zone should remain disabled. Poll/refresh to detect when the lock is released (or show a manual "Check status" button).

---

## Code Examples

Verified patterns from the existing codebase:

### Proxy Route Template (GET)
```typescript
// Source: src/app/api/guilds/[guildId]/exports/route.ts (existing)
import { backendFetch } from '@/lib/server/backend-fetch'
import { sanitizeError, internalError } from '@/lib/server/error-sanitizer'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
type RouteParams = { params: Promise<{ guildId: string; groupId: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { guildId, groupId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(request.url)
    const response = await backendFetch(
      `${API_URL}/api/v1/guilds/${guildId}/groups/${groupId}/alert-thresholds${url.search}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await response.json()
    if (!response.ok) return NextResponse.json(sanitizeError(response.status, data, 'load alert thresholds'), { status: response.status })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(internalError('load alert thresholds'), { status: 500 })
  }
}
```

### React Query Hook Template
```typescript
// Source: src/hooks/use-exports.ts + use-tracking.ts patterns
export function useAlertThresholds(guildId: string, filters: ThresholdFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['guild', guildId, 'alerts', 'thresholds', filters],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam), limit: '20', ...filters })
      const res = await fetchWithRetry(`/api/guilds/${guildId}/alert-thresholds?${params}`)
      if (!res.ok) throw new Error('Failed to fetch thresholds')
      return res.json() as Promise<ThresholdPage>
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page >= last.pagination.total_pages ? undefined : last.pagination.page + 1,
    staleTime: 30 * 1000,
    enabled: !!guildId,
  })
}
```

### Non-Optimistic Toggle Mutation
```typescript
// Pattern from project: wait for API, invalidate cache
export function useToggleThreshold(guildId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, thresholdId, enabled }: { groupId: string; thresholdId: string; enabled: boolean }) => {
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/groups/${groupId}/alert-thresholds/${thresholdId}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to toggle threshold')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'alerts'] })
    },
    onError: (err) => {
      toast.error('Failed to update threshold', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })
}
```

### Card Fade-Out + Collapse Animation (Tailwind only)
```typescript
// Pattern from src/app/(dashboard)/settings/sessions/page.tsx
const [removing, setRemoving] = useState(false)

const handleDelete = async () => {
  setRemoving(true)
  // Wait for animation before removing from DOM
  await new Promise(r => setTimeout(r, 300))
  await deleteThreshold.mutateAsync(...)
}

<div
  className={cn(
    'transition-all duration-300 ease-in-out overflow-hidden',
    removing ? 'opacity-0 max-h-0 mb-0' : 'opacity-100 max-h-96 mb-4'
  )}
>
  {/* card content */}
</div>
```

### Relative Time with date-fns
```typescript
// Source: date-fns docs — formatDistanceToNow
import { formatDistanceToNow } from 'date-fns'

// Relative: "2 hours ago"
const relative = threshold.lastTriggered
  ? formatDistanceToNow(new Date(threshold.lastTriggered), { addSuffix: true })
  : 'Never'

// Absolute on hover — use title attribute or Tooltip component
<span title={threshold.lastTriggered ? new Date(threshold.lastTriggered).toLocaleString() : ''}>
  {relative}
</span>
```

### Import Confirm SSE Streaming Proxy
```typescript
// New pattern needed for POST-SSE proxy
// app/api/guilds/[guildId]/accounts/import/confirm/route.ts
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { guildId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const response = await backendFetch(
    `${API_URL}/api/v1/guilds/${guildId}/accounts/import/confirm`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const data = await response.json()
    return NextResponse.json(sanitizeError(response.status, data, 'import accounts'), { status: response.status })
  }

  // Pipe SSE stream directly to client
  return new NextResponse(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

### Client-Side SSE Stream Reader (for POST-SSE)
```typescript
// Custom reader since EventSource only supports GET
async function* readSSEStream(response: Response): AsyncGenerator<ImportProgressEvent> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          yield JSON.parse(line.slice(6)) as ImportProgressEvent
        } catch { /* skip malformed */ }
      }
    }
  }
}
```

### Backend: New Cross-Guild Alert Threshold Endpoint (to add)
```typescript
// Add to guildAlerts.ts
router.get('/:guildId/alert-thresholds', ...requireDashboardGuildAuth, async (req, res) => {
  const guildId = String(req.params.guildId)
  const page = parseInt(String(req.query.page ?? '1'), 10)
  const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10), 100)
  const skip = (page - 1) * limit
  const groupId = req.query.groupId ? String(req.query.groupId) : undefined
  const platform = req.query.platform ? String(req.query.platform) : undefined
  const metricType = req.query.metricType ? String(req.query.metricType) : undefined

  const where = {
    guildId,
    ...(groupId && { accountGroupId: groupId }),
    ...(platform && { platform }),
    ...(metricType && { metricType }),
  }

  const [thresholds, total] = await Promise.all([
    prisma.alertThreshold.findMany({
      where,
      include: { accountGroup: { select: { id: true, label: true, discordChannelId: true, alertSettings: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.alertThreshold.count({ where }),
  ])

  res.json({
    thresholds,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    active_count: await prisma.alertThreshold.count({ where: { guildId, enabled: true } }),
  })
})
```

### Backend: PATCH Threshold Toggle (to add)
```typescript
// Add to guildAlerts.ts
router.patch('/:guildId/groups/:groupId/alert-thresholds/:thresholdId',
  ...requireDashboardGuildAuth, requireGuildAdmin, dashboardIdempotency,
  async (req, res) => {
    const { guildId, groupId, thresholdId } = req.params as Record<string, string>
    const schema = z.object({ enabled: z.boolean() })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.errors })

    const threshold = await prisma.alertThreshold.findFirst({
      where: { id: thresholdId, accountGroupId: groupId, guildId },
    })
    if (!threshold) return res.status(404).json({ error: 'Alert threshold not found' })

    const updated = await prisma.alertThreshold.update({
      where: { id: thresholdId },
      data: { enabled: parsed.data.enabled },
    })
    res.json({ threshold: updated })
  }
)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Alert thresholds scoped per-group only | Need cross-guild list endpoint for flat UI | Phase 13 decision | New backend endpoint required |
| Export types: `accounts \| posts` only | All ExportType values: `accounts \| posts \| metrics \| analytics \| audit \| gdpr` | Phase 13 decision | Backend Zod enum extension + frontend type update required |
| Exports at `/guilds/[guildId]/exports` | Data management at `/guilds/[guildId]/manage/data` | Phase 13 decision | Existing exports page should be migrated/superseded; old URL can redirect |

**Deprecated/outdated:**
- `ExportRequest.dataType: 'accounts' | 'posts'` in `src/types/export.ts`: must be extended to all export types
- The existing `/guilds/[guildId]/exports` page: the Phase 13 `/manage/data` export tab supersedes it. Either redirect the old URL or leave it as a legacy route and make `/manage/data` the canonical location.

---

## Open Questions

1. **Cross-guild threshold endpoint: new backend route vs client fan-out**
   - What we know: Backend currently only has per-group endpoint. Infinite scroll requires pagination from a single source.
   - What's unclear: Whether backend owner is available to add the new endpoint quickly.
   - Recommendation: Add the cross-guild endpoint. It's a small, low-risk addition to `guildAlerts.ts`.

2. **Import SSE: POST-SSE proxying vs job-ID pattern**
   - What we know: Backend import confirm uses POST-SSE directly. The `useSSE` hook uses `EventSource` (GET only).
   - What's unclear: Whether the backend can easily be adapted to the job-ID pattern (POST returns job ID → GET streams progress).
   - Recommendation: Use direct POST-SSE proxying with `fetch` + ReadableStream on client. Simpler than changing the backend. The code example above shows exactly how.

3. **Old Exports page: redirect or keep**
   - What we know: `/guilds/[guildId]/exports` currently exists with full UI. Phase 13 creates `/manage/data` with export tab.
   - What's unclear: Whether to delete the old page, keep it, or redirect.
   - Recommendation: Add a redirect from `/guilds/[guildId]/exports` to `/guilds/[guildId]/manage/data` (if admin) or keep both during transition. Simplest: keep the old page as-is and build the new one independently, then evaluate.

4. **Threshold value constraints**
   - What we know: Backend schema is `thresholdValue Int` (positive integer). The backend validates `z.number().int().positive()`.
   - What's unclear: UI min/max constraints for the threshold value input.
   - Recommendation: Use `min="1"` and `max="10000000"` (10M) as sensible UI limits. Show no explicit max to the user — just enforce positivity in the form. Current metric averages context hint makes this feel natural.

5. **Alert data refresh strategy (Claude's discretion)**
   - What we know: SSE is used for import/export. Threshold data is less time-sensitive.
   - What's unclear: Whether polling is needed at all for the threshold list.
   - Recommendation: Use `staleTime: 30 * 1000` + `refetchOnWindowFocus: true` for threshold data. No polling needed — changes are admin-initiated and reflected immediately after mutations via cache invalidation.

---

## Backend Changes Required (Summary)

These backend changes are prerequisites for Phase 13 implementation:

| Change | File | Priority |
|--------|------|----------|
| Add `GET /guilds/:guildId/alert-thresholds` (cross-guild, paginated, filterable) | `api/src/routes/dashboard/guilds/guildAlerts.ts` | **HIGH** — blocks infinite scroll UI |
| Add `PATCH /guilds/:guildId/groups/:groupId/alert-thresholds/:thresholdId` (toggle enabled) | `api/src/routes/dashboard/guilds/guildAlerts.ts` | **HIGH** — blocks toggle UI |
| Extend `createExportSchema.dataType` enum to all ExportType values | `api/src/routes/dashboard/exports.ts` | **HIGH** — blocks expanded export UI |

---

## Sources

### Primary (HIGH confidence)
- Codebase read: `api/src/routes/dashboard/guilds/guildAlerts.ts` — all alert threshold endpoints confirmed
- Codebase read: `api/src/routes/dashboard/guilds/guildEmailAlerts.ts` — all email config endpoints confirmed
- Codebase read: `api/src/routes/dashboard/accounts/import.ts` — import template/preview/confirm endpoints confirmed
- Codebase read: `api/src/routes/dashboard/exports.ts` — export list/create/status/SSE confirmed; dataType enum gap confirmed
- Codebase read: `shared/src/lib/exports/exportTypes.ts` — full ExportType union: `posts | metrics | analytics | accounts | gdpr | audit`
- Codebase read: `shared/prisma/schema.prisma` — AlertThreshold, GuildEmailConfig, EmailRecipient, DataExport models confirmed
- Codebase read: `src/hooks/use-sse.ts` — useSSE hook confirmed (GET only via EventSource)
- Codebase read: `src/hooks/use-exports.ts` — export hooks confirmed; useExportProgress uses EventSource directly
- Codebase read: `src/components/ui/type-to-confirm-modal.tsx` — TypeToConfirmModal confirmed
- Codebase read: `src/hooks/use-debounce.ts`, `use-selection.ts` — both confirmed available
- Codebase read: `src/components/layout/sidebar.tsx` — sidebar structure confirmed, guildId extracted from pathname
- Codebase read: `package.json` — no Framer Motion; all needed libraries already installed

### Secondary (MEDIUM confidence)
- Pattern inference from `src/app/(dashboard)/settings/sessions/page.tsx` — animation pattern with `transition-all duration-300`
- Pattern inference from `src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx` — infinite scroll with useInView + useInfiniteQuery

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — read directly from package.json and existing imports
- Architecture patterns: HIGH — derived from existing code in same codebase
- Backend API surface: HIGH — read all relevant backend route files
- Pitfalls: HIGH — identified by comparing what's missing vs what CONTEXT.md requires
- SSE POST-streaming: MEDIUM — pattern derived from Next.js streaming capabilities; specific proxy approach needs validation at implementation

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable stack)
