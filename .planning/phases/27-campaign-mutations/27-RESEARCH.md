# Phase 27: Campaign Mutations - Research

**Researched:** 2026-03-09
**Domain:** React form modals, CRUD mutations, admin-guarded UI
**Confidence:** HIGH

## Summary

Phase 27 builds three UI operations (create, edit, delete campaigns) on top of infrastructure already delivered in Phase 25 (mutation hooks, Zod schemas, ConflictError) and Phase 26 (list/detail pages). The core work is building a shared `CampaignForm` component used by both create and edit modals, wiring delete through the existing `ConfirmationModal`, and adding admin visibility guards.

All backend integration is already complete. The mutation hooks (`useCreateCampaign`, `useUpdateCampaign`, `useDeleteCampaign`) handle API calls, cache invalidation, toast messages, and 409 conflict detection. The Zod schemas (`createCampaignSchema`, `updateCampaignSchema`) provide runtime validation. The established modal pattern from `AddBrandModal` and `ConfirmationModal` provides the exact UI skeleton to follow.

**Primary recommendation:** Build one shared `CampaignForm` component with a `mode` prop, embed it in two thin modal wrappers (CreateCampaignModal, EditCampaignModal), and use `ConfirmationModal` directly for delete. Wire all three into existing pages with admin guards.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Create campaign uses modal dialog (Headless UI Dialog), consistent with AddBrandModal pattern
- Triggered by "+ Create Campaign" button next to page title on campaign list page
- Fields organized with collapsible advanced section (always visible: Name, Brand, Budget, Per-user Cap, Platform Rates; collapsible: closeThreshold, rules, dailySubmissionLimit, paymentMethods, channel IDs)
- Monetary fields entered as dollars, converted to cents on submit
- At least one platform rate must be non-zero (client-side validation)
- Uses `createCampaignSchema` for Zod validation on submit
- `useUnsavedChanges` hook for dirty form warning
- Edit modal from campaign detail page header, pre-filled
- Shared `CampaignForm` component for create and edit (mode prop)
- Only changed fields sent in PATCH payload (diff vs initial) plus `version`
- 409 conflict: error toast with refresh action, `ConflictError` instanceof check
- Delete button in detail page header, next to Edit (red secondary style)
- Delete button hidden for Active/Paused/SubmissionsClosed -- only visible for Draft/Completed
- Confirmation via existing `ConfirmationModal`
- After delete: navigate to campaign list with success toast, cache invalidated
- Create/Edit/Delete buttons completely hidden for non-admin (not disabled)
- Admin check via guild permissions `isAdmin` pattern

### Claude's Discretion
- Exact brand dropdown implementation (Headless UI Listbox or native select)
- Payment methods input format (comma-separated text vs multi-select)
- Channel ID input format (text input vs channel picker if available)
- Modal width (max-w-md vs max-w-lg depending on field layout)
- Toast message wording for create/edit/delete success
- Whether advanced section defaults to expanded in edit mode (when fields have values)
- Skeleton/loading state inside modals during submit

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAMP-05 | Admin can create a campaign with name, budget, per-user cap, and platform rates | `useCreateCampaign` hook + `createCampaignSchema` already built; `useBrands` provides brand dropdown data; `AddBrandModal` provides modal pattern |
| CAMP-06 | Admin can edit campaign configuration (14 optional fields with 409 conflict handling) | `useUpdateCampaign` hook with `ConflictError` on 409; `updateCampaignSchema` for validation; diff-only PATCH payload pattern |
| CAMP-07 | Admin can delete campaign (Draft/Completed only, with confirmation dialog) | `useDeleteCampaign` hook; `ConfirmationModal` component ready; status-based visibility guard |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @headlessui/react | (installed) | Dialog/modal, Disclosure for collapsible | Already used for all modals in project |
| @tanstack/react-query | (installed) | Mutation hooks, cache invalidation | Already powers all data fetching |
| zod | (installed) | Form validation schemas | Already defines `createCampaignSchema`/`updateCampaignSchema` |
| sonner | (installed) | Toast notifications | Already used by mutation hooks |
| next/navigation | (installed) | `useRouter` for post-delete redirect | Standard Next.js navigation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | (installed) | Icons (Plus, Pencil, Trash2, ChevronDown) | Button icons |
| clsx/cn | (installed) | Conditional class composition | All component styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Headless UI Listbox for brand dropdown | Native `<select>` | Native select is simpler but doesn't match dark theme styling; **recommend native `<select>`** since it's a simple ID picker with few items and other forms in the project use native selects |
| Headless UI Disclosure for collapsible | Manual state + div | Disclosure handles accessibility (aria-expanded, keyboard); **recommend Disclosure** |

## Architecture Patterns

### Recommended Component Structure
```
src/components/campaigns/
  campaign-form.tsx          # Shared form (mode: 'create' | 'edit')
  create-campaign-modal.tsx  # Dialog wrapper around CampaignForm
  edit-campaign-modal.tsx    # Dialog wrapper around CampaignForm (pre-filled)
```

### Pattern 1: Shared Form with Mode Prop
**What:** Single `CampaignForm` component handles both create and edit, controlled by a `mode` prop.
**When to use:** When create and edit share 90%+ of the same fields.
**Example:**
```typescript
// Source: project pattern from AddBrandModal + campaign schemas
interface CampaignFormProps {
  mode: 'create' | 'edit'
  initialValues?: Partial<CampaignFormValues>
  onSubmit: (values: CreateCampaignInput | UpdateCampaignInput) => void
  isPending: boolean
  onCancel: () => void
}
```
The form manages its own local state. On submit:
- **Create mode:** Validates with `createCampaignSchema`, sends all fields
- **Edit mode:** Diffs current state vs `initialValues`, sends only changed fields + `version`

### Pattern 2: Dollar-to-Cents Conversion
**What:** Form inputs accept dollar strings (e.g., "50.00"), converted to integer cents on submit.
**When to use:** All monetary fields (budget, perUserCap, platform rates).
**Example:**
```typescript
// Dollar string to cents integer
function dollarsToCents(dollars: string): number {
  const parsed = parseFloat(dollars)
  if (isNaN(parsed) || parsed < 0) return 0
  return Math.round(parsed * 100)
}

// Cents integer to dollar string (for edit mode initial values)
function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2)
}
```

### Pattern 3: Admin Visibility Guard
**What:** Derive `isAdmin` from guild permissions, conditionally render admin-only buttons.
**When to use:** Create, Edit, Delete buttons.
**Example:**
```typescript
// Source: src/app/(dashboard)/guilds/[guildId]/bonus/page.tsx
const { user } = useUser()
const guild = user?.guilds?.find((g) => g.id === guildId)
const isAdmin = guild !== undefined && (Number(guild.permissions) & 0x8) !== 0

// In JSX:
{isAdmin && <button>+ Create Campaign</button>}
```

### Pattern 4: 409 Conflict Handling in Edit Modal
**What:** Catch `ConflictError` from mutation, show toast with refresh action.
**When to use:** Edit campaign submit.
**Example:**
```typescript
// Source: src/hooks/use-campaigns.ts (useUpdateCampaign)
updateCampaign.mutate(payload, {
  onSuccess: () => {
    onClose()
  },
  onError: (error) => {
    if (error instanceof ConflictError) {
      toast.error('Campaign was modified by someone else', {
        action: {
          label: 'Refresh',
          onClick: () => queryClient.invalidateQueries({
            queryKey: campaignKeys.detail(guildId, campaignId)
          })
        }
      })
      onClose()
      return
    }
    setFormError(error.message)
  }
})
```

### Pattern 5: Diff-Only PATCH Payload
**What:** Compare current form state to initial values, send only changed fields.
**When to use:** Edit campaign submit to minimize payload and avoid overwriting concurrent changes.
**Example:**
```typescript
function buildUpdatePayload(
  current: CampaignFormValues,
  initial: CampaignFormValues,
  version: number
): UpdateCampaignInput {
  const payload: Record<string, unknown> = { version }
  for (const key of Object.keys(current) as (keyof CampaignFormValues)[]) {
    if (current[key] !== initial[key]) {
      payload[key] = current[key]
    }
  }
  return payload as UpdateCampaignInput
}
```

### Anti-Patterns to Avoid
- **Sending full form state on edit:** Always diff. The backend uses optimistic locking and sending unchanged fields increases conflict surface.
- **Disabling instead of hiding admin buttons:** Context decision is to completely hide (not render), not disable. Non-admins should see a clean read-only view.
- **Converting cents in the hook layer:** Keep dollar/cents conversion at the form boundary (on submit/on init). Hooks work with cents.
- **Duplicating form fields between create and edit:** Use the shared CampaignForm component.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal dialog | Custom portal/overlay | Headless UI `Dialog` | Focus trapping, scroll lock, ESC close, backdrop click |
| Collapsible section | Manual height animation | Headless UI `Disclosure` | Accessible, handles aria-expanded, keyboard nav |
| Form validation | Manual field checks | Zod `createCampaignSchema.safeParse()` | Already defined, consistent with backend validation |
| Delete confirmation | Custom confirm dialog | `ConfirmationModal` component | Already built, tested, styled |
| Unsaved changes warning | Custom beforeunload | `useUnsavedChanges` hook | Already built, handles cleanup |
| Toast notifications | Custom notification system | `sonner` (already in hooks) | Hooks already call `toast.success/error` |

**Key insight:** Nearly all infrastructure for this phase was built in Phase 25. The work is pure UI composition.

## Common Pitfalls

### Pitfall 1: Floating Point in Dollar-to-Cents
**What goes wrong:** `parseFloat("19.99") * 100` gives `1998.9999999999998` instead of `1999`.
**Why it happens:** IEEE 754 floating point precision.
**How to avoid:** Always use `Math.round()` after multiplication: `Math.round(parseFloat(dollars) * 100)`.
**Warning signs:** Tests showing off-by-one cent values.

### Pitfall 2: Missing Version Field on Update
**What goes wrong:** PATCH request rejected by backend because `version` is required in `updateCampaignSchema`.
**Why it happens:** Forgetting to include `version` from the campaign detail data.
**How to avoid:** Always include `version: campaign.version` in the update payload. The schema requires it.
**Warning signs:** 400 errors on edit submit.

### Pitfall 3: Stale Form Data After 409 Conflict
**What goes wrong:** User sees stale data in edit modal after a conflict, tries to save again, gets another 409.
**Why it happens:** Modal still holds old initial values after conflict.
**How to avoid:** Close the modal on 409, invalidate the detail query, let user reopen with fresh data.
**Warning signs:** Repeated 409 errors in sequence.

### Pitfall 4: Brand Dropdown Empty on Create
**What goes wrong:** Brand select has no options because brands haven't been fetched.
**Why it happens:** Create modal opens before brands are loaded.
**How to avoid:** Use `useBrands(guildId)` in the create modal. Show loading state or disable submit until brands are available.
**Warning signs:** Empty dropdown with no loading indicator.

### Pitfall 5: Payment Methods Array Serialization
**What goes wrong:** `paymentMethods` is `string[]` but form input gives a single string.
**Why it happens:** Text input returns string, schema expects array.
**How to avoid:** Split comma-separated input: `value.split(',').map(s => s.trim()).filter(Boolean)`.
**Warning signs:** Zod validation error on submit.

### Pitfall 6: Delete Button Shown for Active Campaigns
**What goes wrong:** Delete attempt on Active campaign fails with backend error.
**Why it happens:** Status check only considers Draft/Completed but misses edge cases.
**How to avoid:** Only show delete when `campaign.status === 'Draft' || campaign.status === 'Completed'`. Backend enforces this too as a safety net.
**Warning signs:** Error toast on delete attempt.

## Code Examples

### Brand Dropdown Data Source
```typescript
// Source: src/hooks/use-tracking.ts
import { useBrands } from '@/hooks/use-tracking'

// Inside CreateCampaignModal or CampaignForm:
const { data: brandsData, isLoading: brandsLoading } = useBrands(guildId)
const brands = brandsData?.brands ?? []

// Render:
<select value={brandId} onChange={e => setBrandId(e.target.value)}>
  <option value="">Select a brand</option>
  {brands.map(b => (
    <option key={b.id} value={b.id}>{b.label}</option>
  ))}
</select>
```

### Collapsible Advanced Section with Disclosure
```typescript
// Source: @headlessui/react Disclosure
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { ChevronDown } from 'lucide-react'

<Disclosure defaultOpen={mode === 'edit' && hasAdvancedValues}>
  <DisclosureButton className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white">
    Advanced Settings
    <ChevronDown className="w-4 h-4 ui-open:rotate-180 transition-transform" />
  </DisclosureButton>
  <DisclosurePanel className="mt-3 space-y-4">
    {/* closeThreshold, rules, dailySubmissionLimit, paymentMethods, channel IDs */}
  </DisclosurePanel>
</Disclosure>
```

### Modal Pattern (from AddBrandModal)
```typescript
// Source: src/components/forms/add-brand-modal.tsx
<Dialog open={open} onClose={onClose} className="relative z-50">
  <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <DialogPanel className="max-w-lg w-full bg-surface border border-border rounded-lg p-6 space-y-4">
      <DialogTitle className="text-lg font-semibold text-white">
        {mode === 'create' ? 'Create Campaign' : 'Edit Campaign'}
      </DialogTitle>
      <CampaignForm ... />
    </DialogPanel>
  </div>
</Dialog>
```

### Delete with Status Guard
```typescript
// Source: project patterns
const canDelete = campaign.status === 'Draft' || campaign.status === 'Completed'
const deleteCampaign = useDeleteCampaign(guildId, campaignId)
const router = useRouter()

// Only render when admin AND deletable status:
{isAdmin && canDelete && (
  <button onClick={() => setDeleteOpen(true)} className="... bg-red-600 ...">
    Delete
  </button>
)}

// ConfirmationModal onConfirm:
deleteCampaign.mutate(undefined, {
  onSuccess: () => {
    router.push(`/guilds/${guildId}/campaigns`)
  }
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate create/edit forms | Shared form with mode prop | Project convention | Less code, fewer bugs |
| Full payload on PATCH | Diff-only payload + version | Phase 25 design | Fewer conflicts |
| Disabled buttons for non-admin | Hidden buttons (not rendered) | Project convention | Cleaner read-only UX |

## Open Questions

1. **Headless UI Disclosure availability**
   - What we know: Project uses `@headlessui/react` for Dialog; Disclosure is part of the same package
   - What's unclear: Whether the installed version supports the newer component API (`DisclosureButton` vs `Disclosure.Button`)
   - Recommendation: Use the newer API (`DisclosureButton`), consistent with how Dialog uses `DialogPanel` not `Dialog.Panel`

2. **Brand data shape mismatch**
   - What we know: `useBrands` returns `Brand` objects (tracking types) with fields like `is_paused`, `slug`, `groups`. Campaign `brandId` expects just an ID. Campaign detail returns `brand: { id, label }`.
   - What's unclear: Whether paused brands should be excluded from the create dropdown
   - Recommendation: Show all brands (including paused) -- the backend doesn't restrict by brand pause status for campaigns

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual browser testing (no automated test framework configured) |
| Config file | none |
| Quick run command | `npx tsc --noEmit` (type check) |
| Full suite command | `npx tsc --noEmit && npx next build` (type check + build) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAMP-05 | Admin creates campaign with required fields | manual | Browser: fill form, submit, verify list | N/A |
| CAMP-06 | Admin edits campaign, 409 conflict shows toast | manual | Browser: edit, submit, verify; simulate 409 | N/A |
| CAMP-07 | Admin deletes Draft/Completed campaign with confirmation | manual | Browser: delete, confirm, verify redirect | N/A |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit` (type check)
- **Per wave merge:** `npx tsc --noEmit && npx next build`
- **Phase gate:** Full build green + manual verification of all 3 requirements

### Wave 0 Gaps
None -- no automated test infrastructure exists in this project; validation is via TypeScript type checking and manual browser testing.

## Sources

### Primary (HIGH confidence)
- Project codebase: `src/hooks/use-campaigns.ts` -- all 3 mutation hooks verified
- Project codebase: `src/types/campaign.ts` -- Zod schemas and ConflictError verified
- Project codebase: `src/components/forms/add-brand-modal.tsx` -- modal pattern template
- Project codebase: `src/components/ui/confirmation-modal.tsx` -- delete confirmation ready
- Project codebase: `src/app/(dashboard)/guilds/[guildId]/bonus/page.tsx` -- admin check pattern
- Project codebase: `src/hooks/use-tracking.ts` -- `useBrands` hook for brand dropdown

### Secondary (MEDIUM confidence)
- Headless UI Disclosure API -- based on project's use of modern component API pattern (DialogPanel not Dialog.Panel)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use
- Architecture: HIGH -- patterns directly observed in existing codebase
- Pitfalls: HIGH -- derived from actual schema definitions and known floating-point issues

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable project patterns)
