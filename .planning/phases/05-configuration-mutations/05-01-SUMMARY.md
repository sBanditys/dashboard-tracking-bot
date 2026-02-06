---
phase: 05-configuration-mutations
plan: 01
subsystem: mutations
tags: [react-query, mutations, confirmation-modal, cache-invalidation]
requires: [04-03]
provides: [confirmation-modal, delete-mutations, delete-api-routes]
affects: [05-02, 05-03, 05-04, 05-05]
tech-stack:
  added: []
  patterns:
    - Headless UI Dialog for confirmations
    - React Query mutation hooks with cache invalidation
    - DELETE proxy routes following existing auth pattern
key-files:
  created:
    - src/app/api/guilds/[guildId]/brands/[brandId]/route.ts
  modified:
    - src/components/ui/confirmation-modal.tsx
    - src/hooks/use-guilds.ts
    - src/hooks/use-audit-log.ts
decisions:
  - id: DEV-029
    decision: Reusable ConfirmationModal with configurable confirmLabel prop
    rationale: Single modal component serves all destructive actions (delete account, brand, etc.)
    context: Task 1 - Enhanced existing modal with flexible props
  - id: DEV-030
    decision: Cache invalidation invalidates both specific list and parent guild
    rationale: Ensures UI updates consistently after deletions across all views
    context: Task 3 - Delete mutations invalidate ['guild', guildId, 'accounts'] and ['guild', guildId]
metrics:
  duration: 3m 7s
  tasks: 3
  commits: 3
  completed: 2026-02-06
---

# Phase 5 Plan 1: Delete Infrastructure Summary

**One-liner:** Reusable confirmation modal and delete mutations for accounts/brands with proper cache invalidation

## What Was Built

### Task 1: Enhanced Confirmation Modal Component
- Updated existing `ConfirmationModal` component at `src/components/ui/confirmation-modal.tsx`
- Added `confirmLabel` prop for flexible button text (defaults to "Delete")
- Integrated `cn()` utility for cleaner class management
- Improved styling: `space-y-4` for consistent spacing, proper disabled states
- Added `type="button"` to prevent accidental form submissions
- Red delete button (`bg-red-600 hover:bg-red-700`) signals destructive action per CONTEXT.md

**Props:**
```typescript
interface ConfirmationModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  itemName: string
  isLoading?: boolean
  confirmLabel?: string
}
```

### Task 2: DELETE API Proxy Routes
- Created `/api/guilds/:guildId/brands/:brandId` DELETE endpoint
- Account DELETE route already existed at `/api/guilds/:guildId/accounts/:accountId`
- Both follow existing auth pattern: extract token from cookies, forward to backend
- Proper error handling with 401/500 responses

**Pattern:**
```typescript
type RouteParams = { params: Promise<{ guildId: string; brandId: string }> }
export async function DELETE(request: NextRequest, { params }: RouteParams)
```

### Task 3: Delete Mutation Hooks
- Added `useDeleteAccount(guildId: string)` to `src/hooks/use-guilds.ts`
- Added `useDeleteBrand(guildId: string)` to `src/hooks/use-guilds.ts`
- Both use React Query `useMutation` with cache invalidation on success
- Invalidate both specific list (`['guild', guildId, 'accounts']`) and parent guild (`['guild', guildId]`)

**Pattern:**
```typescript
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
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'accounts'] })
      queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
    },
  })
}
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing AuditLogEntry type export**
- **Found during:** Task 3 TypeScript verification
- **Issue:** `audit-log-table.tsx` imports `AuditLogEntry` from `@/hooks/use-audit-log`, but type was not exported
- **Fix:** Added re-export of `AuditLogEntry` type from `@/types/audit` in `use-audit-log.ts`
- **Files modified:** `src/hooks/use-audit-log.ts`
- **Commit:** 5e0aa3c (included with Task 3)
- **Why Rule 1:** Pre-existing TypeScript compilation error blocking build - required fix for correctness

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Confirmation Modal Component | 0929b9e | src/components/ui/confirmation-modal.tsx |
| 2 | Add Delete API Proxy Routes | cb61481 | src/app/api/guilds/[guildId]/brands/[brandId]/route.ts |
| 3 | Add Delete Mutation Hooks | 5e0aa3c | src/hooks/use-guilds.ts, src/hooks/use-audit-log.ts |

## Decisions Made

**DEV-029: Reusable ConfirmationModal with configurable confirmLabel prop**
- Single modal component serves all destructive actions
- `confirmLabel` prop allows "Delete Account", "Delete Brand", etc.
- Item name displayed prominently: "Are you sure you want to delete {itemName}?"

**DEV-030: Cache invalidation invalidates both specific list and parent guild**
- Delete mutations invalidate `['guild', guildId, 'accounts']` and `['guild', guildId]`
- Ensures UI updates across all views (accounts page, guild detail page)
- Pattern applies to all future mutations

## Verification Results

**All verification criteria met:**

1. ✅ TypeScript compilation passes (`npx tsc --noEmit`)
2. ✅ ConfirmationModal component exists with Headless UI Dialog, red confirm button, loading state
3. ✅ DELETE proxy routes exist for accounts and brands at correct paths
4. ✅ useDeleteAccount and useDeleteBrand hooks exported from `@/hooks/use-guilds`

**Success criteria met:**

- ✅ ConfirmationModal component with Headless UI Dialog, red confirm button (`bg-red-600 hover:bg-red-700`), loading state
- ✅ DELETE proxy routes at `/api/guilds/:guildId/accounts/:accountId` and `/api/guilds/:guildId/brands/:brandId`
- ✅ useDeleteAccount and useDeleteBrand hooks with cache invalidation pattern
- ✅ All TypeScript compiles cleanly

## Next Phase Readiness

**Ready for 05-02:** Add/Edit Account Modal
- ConfirmationModal ready for delete confirmations
- useDeleteAccount available for delete functionality
- DELETE route ready for backend communication

**Pattern established:**
- Confirmation modal reusable across all destructive actions
- Cache invalidation pattern documented for all future mutations
- API proxy pattern consistent with existing codebase

**No blockers:** All infrastructure in place for mutation flows.

## Notes

- Account DELETE route already existed from prior work - only brand route needed creation
- AuditLogEntry type export fix was necessary pre-existing bug preventing compilation
- All mutation hooks follow established pattern from `useUpdateGuildSettings`
- Cache invalidation strategy: invalidate both specific resource list and parent guild for comprehensive UI updates

## Self-Check: PASSED

All files and commits verified:
- ✓ src/app/api/guilds/[guildId]/brands/[brandId]/route.ts exists
- ✓ Commit 0929b9e exists
- ✓ Commit cb61481 exists
- ✓ Commit 5e0aa3c exists
