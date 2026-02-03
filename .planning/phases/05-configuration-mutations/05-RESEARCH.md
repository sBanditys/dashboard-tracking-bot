# Phase 5: Configuration & Mutations - Research

**Researched:** 2026-02-03
**Domain:** Form mutations, confirmation dialogs, audit logging with React Query + Headless UI
**Confidence:** HIGH

## Summary

This phase implements CRUD operations for guild configuration through the dashboard. The codebase already has an established pattern using React Query for data fetching, Headless UI for accessible components (Listbox, Menu), and Zod for schema validation. The backend has a `DashboardAuditLog` model ready for use.

The recommended approach leverages the existing stack: use Headless UI's Dialog component for delete confirmations and add-item forms, Combobox for searchable channel selection, and React Query's `useMutation` hook with cache invalidation for server-side persistence. Form validation uses Zod schemas that can be shared between client validation and API request bodies.

**Primary recommendation:** Build mutations as custom hooks (`useUpdateGuildSettings`, `useAddAccount`, etc.) that wrap `useMutation` with proper cache invalidation, following the existing `use-guilds.ts` and `use-tracking.ts` patterns.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @headlessui/react | ^2.2.9 | Dialog, Combobox, Listbox | Already used for dropdowns; ARIA-compliant out of box |
| @tanstack/react-query | ^5.90.20 | Mutations, cache invalidation | Already used for queries; same API for mutations |
| zod | ^4.3.6 | Schema validation | Already used in backend; can share schemas |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 | Date formatting for audit log | Time formatting, relative dates |
| clsx | ^2.1.1 | Conditional class names | Button state styling |

### Not Needed
| Library | Why Not |
|---------|---------|
| react-hook-form | Overkill for simple forms; Zod + controlled inputs sufficient |
| formik | Same - adds complexity without benefit for these use cases |
| react-toastify | Can use simple inline success/error states initially |

**Installation:** None required - all libraries already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   ├── use-guilds.ts          # Existing - add mutations here
│   ├── use-tracking.ts        # Existing - add mutations here
│   └── use-audit-log.ts       # New - audit log query + filters
├── components/
│   ├── ui/
│   │   ├── confirmation-modal.tsx  # New - reusable delete confirm
│   │   └── combobox.tsx            # New - searchable select base
│   ├── forms/
│   │   ├── guild-settings-form.tsx # New - settings edit form
│   │   ├── add-account-form.tsx    # New - add tracked account
│   │   └── add-brand-form.tsx      # New - add brand
│   └── audit/
│       └── audit-log-table.tsx     # New - activity log display
├── app/
│   ├── api/guilds/[guildId]/
│   │   ├── settings/route.ts       # New - PATCH settings
│   │   ├── accounts/route.ts       # Extend with POST/DELETE
│   │   ├── brands/route.ts         # Extend with POST/DELETE
│   │   ├── channels/route.ts       # New - GET Discord channels
│   │   └── audit-log/route.ts      # New - GET audit log
│   └── (dashboard)/guilds/[guildId]/
│       └── activity/page.tsx       # New - audit log page
└── types/
    ├── guild.ts                    # Extend with mutation types
    └── audit.ts                    # New - audit log types
```

### Pattern 1: Mutation Hook with Cache Invalidation
**What:** Wrap useMutation with automatic query cache invalidation on success
**When to use:** All create/update/delete operations
**Example:**
```typescript
// Source: Codebase pattern extrapolated from use-guilds.ts
export function useUpdateGuildSettings(guildId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: Partial<GuildSettings>) => {
      const response = await fetch(`/api/guilds/${guildId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update settings')
      }
      return response.json()
    },
    onSuccess: () => {
      // Invalidate guild details to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
    },
  })
}
```

### Pattern 2: Confirmation Modal Component
**What:** Reusable modal for delete confirmations using Headless UI Dialog
**When to use:** All destructive actions (per user decision: modal with confirm button)
**Example:**
```typescript
// Source: https://headlessui.com/react/dialog
import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react'

interface ConfirmationModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  itemName: string  // Per decision: show just the item name
  isLoading?: boolean
}

export function ConfirmationModal({
  open, onClose, onConfirm, title, itemName, isLoading
}: ConfirmationModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />

      {/* Full-screen container for centering */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-w-md w-full bg-surface border border-border rounded-lg p-6">
          <DialogTitle className="text-lg font-semibold text-white">
            {title}
          </DialogTitle>
          <Description className="mt-2 text-gray-400">
            Are you sure you want to delete <span className="text-white font-medium">{itemName}</span>?
          </Description>

          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
```

### Pattern 3: Searchable Combobox for Channel Selection
**What:** Headless UI Combobox with filtering for Discord channels
**When to use:** Channel selection (per decision: searchable combobox, text channels only)
**Example:**
```typescript
// Source: https://headlessui.com/react/combobox
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption, ComboboxButton } from '@headlessui/react'
import { useState, useMemo } from 'react'

interface Channel {
  id: string
  name: string
  type: number  // 0 = text, 2 = voice, etc.
  bot_has_access: boolean
}

interface ChannelSelectProps {
  channels: Channel[]
  value: string | null
  onChange: (channelId: string | null) => void
}

export function ChannelSelect({ channels, value, onChange }: ChannelSelectProps) {
  const [query, setQuery] = useState('')

  // Filter to text channels only (per decision)
  const textChannels = useMemo(
    () => channels.filter(c => c.type === 0),
    [channels]
  )

  const filtered = query === ''
    ? textChannels
    : textChannels.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase())
      )

  const selected = textChannels.find(c => c.id === value)

  return (
    <Combobox value={value} onChange={onChange}>
      <div className="relative">
        <ComboboxInput
          className="w-full py-3 pl-3 pr-10 bg-surface border border-border rounded-lg text-sm text-gray-300"
          displayValue={(id: string | null) =>
            textChannels.find(c => c.id === id)?.name ?? ''
          }
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search channels..."
        />
        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-3">
          {/* Chevron icon */}
        </ComboboxButton>

        <ComboboxOptions className="absolute z-20 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
          {filtered.map((channel) => (
            <ComboboxOption
              key={channel.id}
              value={channel.id}
              className="relative cursor-pointer select-none py-3 px-4 text-sm text-gray-300 data-[focus]:bg-background"
            >
              <span className="flex items-center gap-2">
                <span>#</span>
                <span>{channel.name}</span>
                {/* Per decision: warn if bot may not have permission */}
                {!channel.bot_has_access && (
                  <span className="text-yellow-500 text-xs">(may lack permissions)</span>
                )}
              </span>
            </ComboboxOption>
          ))}
        </ComboboxOptions>
      </div>
    </Combobox>
  )
}
```

### Pattern 4: Inline Edit with Toggle
**What:** Click-to-edit pattern that shows input on focus
**When to use:** Simple field edits (settings page)
**Recommendation:** Use this pattern for guild settings - it keeps users in context
**Example:**
```typescript
// Inline edit field pattern
interface InlineEditProps {
  value: string
  onSave: (value: string) => void
  label: string
  isLoading?: boolean
}

export function InlineEditField({ value, onSave, label, isLoading }: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const handleSave = () => {
    onSave(editValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="text-left w-full group"
      >
        <span className="text-gray-400 text-sm">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-white">{value || 'Not set'}</span>
          <span className="opacity-0 group-hover:opacity-100 text-gray-500 text-sm">Edit</span>
        </div>
      </button>
    )
  }

  return (
    <div>
      <label className="text-gray-400 text-sm">{label}</label>
      <div className="flex gap-2 mt-1">
        <input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="flex-1 bg-surface border border-border rounded px-3 py-2 text-white"
          autoFocus
        />
        <button onClick={handleSave} disabled={isLoading} className="text-accent-purple">Save</button>
        <button onClick={handleCancel} className="text-gray-400">Cancel</button>
      </div>
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Hand-rolling focus trap in modals:** Use Headless UI Dialog which handles this automatically
- **Optimistic updates for destructive actions:** Wait for server confirmation before removing from UI
- **Showing success toast for every mutation:** Prefer inline status indication for non-critical actions
- **Nested modals:** Never open a modal from within a modal; use a multi-step pattern instead

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal focus trap | Manual focus management | Headless UI Dialog | Focus trap, ESC key, outside click all handled |
| Accessible combobox | Custom dropdown with search | Headless UI Combobox | Keyboard nav, ARIA, screen reader support |
| Form validation | Custom validation logic | Zod schemas | Type inference, reusable between client/server |
| Query cache invalidation | Manual refetch calls | React Query invalidateQueries | Handles race conditions, deduplication |
| Confirmation button state | Manual loading state | useMutation isLoading | Automatic pending state management |

**Key insight:** Headless UI components handle accessibility concerns (focus management, ARIA attributes, keyboard navigation) that are easy to get wrong. The existing codebase already uses Listbox correctly - extend this pattern to Dialog and Combobox.

## Common Pitfalls

### Pitfall 1: Not Invalidating Related Queries
**What goes wrong:** After adding an account, the accounts list doesn't update
**Why it happens:** Only invalidating the specific query, not related queries
**How to avoid:** Invalidate all queries that might be affected
```typescript
onSuccess: () => {
  // Invalidate both the list and any detail views
  queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'accounts'] })
  queryClient.invalidateQueries({ queryKey: ['guild', guildId] }) // Guild details has account_count
}
```
**Warning signs:** UI shows stale counts or missing items after mutations

### Pitfall 2: Dialog Not Closing After Action
**What goes wrong:** User clicks delete, action succeeds, but modal stays open
**Why it happens:** Forgetting to call onClose in onSuccess callback
**How to avoid:** Always close modal in success handler
```typescript
const handleConfirmDelete = async () => {
  try {
    await deleteMutation.mutateAsync(itemId)
    onClose() // Close modal after success
  } catch (error) {
    // Keep modal open on error so user can retry
  }
}
```
**Warning signs:** Users have to manually close modal after successful action

### Pitfall 3: Optimistic Updates for Irreversible Actions
**What goes wrong:** Item disappears from UI, but server delete fails; user thinks it's gone
**Why it happens:** Using optimistic update pattern for destructive actions
**How to avoid:** Wait for server confirmation before updating UI for deletes
```typescript
// Good: Wait for confirmation
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'accounts'] })
}

// Bad: Optimistic delete
onMutate: async (id) => {
  await queryClient.cancelQueries({ queryKey: ['guild', guildId, 'accounts'] })
  const previous = queryClient.getQueryData(['guild', guildId, 'accounts'])
  queryClient.setQueryData(['guild', guildId, 'accounts'], (old) =>
    old.filter(item => item.id !== id)
  )
  return { previous }
}
```
**Warning signs:** Items flicker or reappear after delete operations

### Pitfall 4: Form Validation Only on Submit
**What goes wrong:** User fills entire form, submits, then sees all errors at once
**Why it happens:** Only running Zod validation on form submit
**How to avoid:** Validate on blur for individual fields, on submit for cross-field
```typescript
const [errors, setErrors] = useState<Record<string, string>>({})

const validateField = (name: string, value: string) => {
  const result = schema.shape[name].safeParse(value)
  setErrors(prev => ({
    ...prev,
    [name]: result.success ? undefined : result.error.issues[0].message
  }))
}
```
**Warning signs:** Users complain about "too many errors at once"

### Pitfall 5: Not Handling Concurrent Edits
**What goes wrong:** Two users edit same settings, second overwrites first without warning
**Why it happens:** No optimistic locking or last-modified check
**How to avoid:** Include version/updatedAt in updates, reject if stale
**Recommendation:** LOW priority for this phase - can defer to future if needed
**Warning signs:** Users report "my changes disappeared"

## Code Examples

Verified patterns from official sources and codebase analysis:

### Complete Mutation Hook Pattern
```typescript
// Source: Codebase use-guilds.ts pattern + TanStack docs
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { GuildSettings } from '@/types/guild'

interface UpdateSettingsRequest {
  logs_channel_id?: string | null
  watch_category_id?: string | null
  pause_category_id?: string | null
  updates_channel_id?: string | null
  updates_role_id?: string | null
  allowed_platforms?: string[]
}

export function useUpdateGuildSettings(guildId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: UpdateSettingsRequest) => {
      const response = await fetch(`/api/guilds/${guildId}/settings`, {
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
    onSuccess: (data) => {
      // Update the guild query cache with new settings
      queryClient.setQueryData(['guild', guildId], (old: any) => ({
        ...old,
        settings: data.settings,
      }))
    },
    onError: (error) => {
      console.error('Settings update failed:', error)
    },
  })
}
```

### Delete Account with Confirmation
```typescript
// Source: Pattern combining Headless UI Dialog + React Query mutation
export function useDeleteAccount(guildId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (accountId: string) => {
      const response = await fetch(`/api/guilds/${guildId}/accounts/${accountId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete account')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate accounts list and guild details (account_count)
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'accounts'] })
      queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
    },
  })
}

// Usage in component
function AccountRow({ account, guildId }: { account: Account; guildId: string }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const deleteMutation = useDeleteAccount(guildId)

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(account.id)
    setShowDeleteModal(false)
  }

  return (
    <>
      {/* ... account display ... */}
      <button
        onClick={() => setShowDeleteModal(true)}
        className="text-red-500 hover:text-red-400"
      >
        Delete
      </button>

      <ConfirmationModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Account"
        itemName={`@${account.username}`}
        isLoading={deleteMutation.isPending}
      />
    </>
  )
}
```

### API Route Proxy with Mutation Support
```typescript
// Source: Codebase src/app/api/guilds/[guildId]/route.ts pattern
// File: src/app/api/guilds/[guildId]/settings/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type RouteParams = { params: Promise<{ guildId: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { guildId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const response = await fetch(`${API_URL}/api/v1/guilds/${guildId}/settings`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
```

### Audit Log Query Hook
```typescript
// Source: Pattern based on codebase use-tracking.ts
interface AuditLogFilters {
  user?: string
  action?: string
  page?: number
  limit?: number
}

interface AuditLogEntry {
  id: string
  created_at: string
  actor: {
    id: string
    type: 'user' | 'system' | 'bot'
    name?: string
  }
  action: string
  target_type: string
  target_id: string | null
  changes: Record<string, { old: unknown; new: unknown }> | null
}

interface AuditLogResponse {
  entries: AuditLogEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export function useAuditLog(guildId: string, filters: AuditLogFilters = {}) {
  return useQuery<AuditLogResponse>({
    queryKey: ['guild', guildId, 'audit-log', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.user) params.set('user', filters.user)
      if (filters.action) params.set('action', filters.action)
      params.set('page', String(filters.page ?? 1))
      params.set('limit', String(filters.limit ?? 25))

      const response = await fetch(`/api/guilds/${guildId}/audit-log?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch audit log')
      }
      return response.json()
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!guildId,
  })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-hook-form for all forms | Controlled inputs + Zod for simple forms | 2024 | Less boilerplate for small forms |
| Custom modal with focus trap | Headless UI Dialog | v2.0 (2024) | Better accessibility, less code |
| Manual optimistic updates | React Query v5 mutation callbacks | v5 (2023) | Simpler rollback patterns |
| Toast notifications for all | Inline status for non-critical | 2025 trend | Less interruption |

**Deprecated/outdated:**
- Headless UI v1 `Transition` component: Use `transition` prop and data attributes in v2
- `useMutation` `onMutate` for simple cases: Use `onSuccess` with invalidation unless truly need optimistic

## Open Questions

Things that couldn't be fully resolved:

1. **Discord Channel API Access**
   - What we know: Need to fetch Discord channels for the combobox
   - What's unclear: Whether bot API exposes channel list or need Discord API call
   - Recommendation: Check backend for existing channel list endpoint; may need new endpoint that calls Discord API

2. **Audit Log User Resolution**
   - What we know: `DashboardAuditLog` stores `actorId` as Discord user ID
   - What's unclear: How to resolve user ID to display name for the table
   - Recommendation: Either store name at audit time, or create user lookup endpoint

3. **Test Notification Button**
   - What we know: User left this as Claude's discretion
   - What's unclear: Backend support for sending test notifications
   - Recommendation: Defer to future phase unless backend already supports it

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/hooks/use-guilds.ts`, `src/hooks/use-tracking.ts` - React Query patterns
- Codebase analysis: `src/components/filters/status-select.tsx` - Headless UI Listbox pattern
- Codebase analysis: `api/src/routes/dashboard/guilds.ts` - API proxy and Zod patterns
- Codebase analysis: `shared/prisma/schema.prisma` - DashboardAuditLog model
- [Headless UI Dialog](https://headlessui.com/react/dialog) - Modal component API
- [Headless UI Combobox](https://headlessui.com/react/combobox) - Searchable select API

### Secondary (MEDIUM confidence)
- [TanStack Query Mutations](https://tanstack.com/query/latest/docs/react/guides/mutations) - Mutation patterns
- [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) - Update strategies
- [Zod + React Hook Form](https://www.contentful.com/blog/react-hook-form-validation-zod/) - Validation patterns
- [Headless UI v2.1 Announcement](https://tailwindcss.com/blog/2024-06-21-headless-ui-v2-1) - New transition API

### Tertiary (LOW confidence)
- [Modal UX Design Patterns](https://blog.logrocket.com/ux-design/modal-ux-design-patterns-examples-best-practices/) - Delete confirmation patterns
- [Inline Edit vs Modal](https://www.patternfly.org/components/inline-edit/design-guidelines/) - Edit pattern recommendations
- [Optimistic UI Best Practices](https://blog.logrocket.com/understanding-optimistic-ui-react-useoptimistic-hook/) - When to use optimistic updates

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in package.json, patterns established in codebase
- Architecture: HIGH - Direct extension of existing patterns in use-guilds.ts, use-tracking.ts
- Pitfalls: MEDIUM - Based on common patterns and React Query documentation
- UX Patterns: MEDIUM - Based on user decisions in CONTEXT.md and web research

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - stack is stable)
