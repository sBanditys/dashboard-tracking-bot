# Phase 29: Campaign Export - Research

**Researched:** 2026-03-10
**Domain:** React modal state machines, polling-based progress, admin-gated UI actions
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Export trigger placement**
- Export button in campaign detail header, next to Edit and Delete
- Admin-only (hidden for non-admin users, same `isAdmin` guard as Edit/Delete)
- Available for all campaign statuses (Draft, Active, Paused, SubmissionsClosed, Completed)
- Button disabled with tooltip "Export in progress" while an export is active (exportId is set)
- Re-enabled after export completes or fails

**Export button styling**
- Matches Edit button style: `bg-surface border border-border text-gray-300 hover:text-white`
- Uses Download/export icon from lucide-react
- Same size and weight as Edit button — secondary action, not primary

**Export modal (ExportCampaignModal)**
- New dedicated component: `src/components/campaigns/export-campaign-modal.tsx`
- Multi-state modal with 4 states: options → progress → complete → error
- Opens when Export header button is clicked

**Format selection**
- Radio buttons (not dropdown): CSV and XLSX side by side
- Default: CSV selected

**Scope selection**
- Radio buttons with descriptions:
  - "Payment summary" — Participant earnings, payment status, amounts
  - "Full data" — All campaign data including posts, platforms, timestamps
- Default: Payment summary selected

**No file name preview**
- Modal shows format + scope radios and Export button only
- Backend decides the file name

**Progress tracking**
- Uses `useCampaignExportStatus` polling hook (3s interval) — NOT SSE
- ExportStatusResponse has `status`, `downloadUrl`, `expiresAt`, `error`
- No cancel support — close button only (export continues on backend)

**Loading state**
- Between clicking Export and receiving exportId: button shows spinner + "Exporting..." text, radios disabled
- Once exportId received, modal transitions to progress view

**Error handling**
- Export failure: inline error in modal with message + "Try Again" button (resets to options view)
- 429 quota exceeded: inline warning in modal "Daily export limit reached (10/10). Try again tomorrow." with Export button disabled and Close button only

**Download behavior**
- Direct URL link: `<a href={downloadUrl} download>` — no proxy
- Modal shows "Export ready" with Download button + Close button
- Expiry hint shown below Download: "Link expires in 24h" (calculated from `expiresAt` in response)

**Quota display**
- Query guild export quota via `useExportHistory(guildId, 1, 1)` when modal opens (already cached with 2min staleTime)
- Show remaining quota at bottom of modal: "7 of 10 daily exports remaining"
- Disable Export button when quota is 0
- Campaign exports share the guild-level daily export quota (10/day total across all export types)

**State persistence**
- exportId stored in parent component state (campaign detail page), not inside modal
- Closing modal during progress preserves exportId — re-opening resumes progress view
- Only reset to options after: complete + close, error + close, or error + retry

**No campaign export history**
- No export history section on campaign detail page
- Past exports accessible through guild-level Data Management > Export tab

### Claude's Discretion
- Mobile responsiveness (standard responsive modal patterns, radios stack vertically)
- Accessibility (focus trap, aria-labelledby, aria-live for progress, Escape to close)
- Exact spacing, typography within modal
- Progress percentage display format
- Skeleton/shimmer during quota fetch
- Modal overlay animation

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXP-01 | Admin can trigger campaign export (CSV/XLSX) with scope selection (payment/full) | Modal format+scope radio pattern; `useTriggerExport` mutation already built; proxy routes already exist |
| EXP-02 | User can see export progress via polling with download link on completion | `useCampaignExportStatus` polling hook already built; state machine: options→progress→complete/error; `ExportStatusResponse` type complete |
</phase_requirements>

---

## Summary

Phase 29 adds a campaign export modal to the campaign detail page. Almost all infrastructure is already in place from Phase 25: the two proxy routes exist (`POST .../export` and `GET .../export/[exportId]`), the two hooks exist (`useTriggerExport`, `useCampaignExportStatus`), and the type definitions exist (`ExportTriggerResponse`, `ExportStatusResponse`). This phase is purely UI work.

The work breaks cleanly into two tasks: (1) build `ExportCampaignModal` as a 4-state wizard component and (2) integrate it into the campaign detail page by adding the Export button to the header and lifting `exportId` state. The modal shell uses the existing Headless UI `Dialog`/`DialogPanel` pattern from `ConfirmationModal`. The quota display reuses `useExportHistory` which is already imported and used elsewhere. The polling-based progress pattern (3s `refetchInterval`) is already implemented in `useCampaignExportStatus`.

The key design insight is state persistence: `exportId` lives in the parent (campaign detail page), not inside the modal. This lets closing and re-opening the modal resume progress rather than starting over. The modal itself tracks a local `modalView` state that drives which panel to render (`options | submitting | progress | complete | error`).

**Primary recommendation:** Build `ExportCampaignModal` as a pure render component driven by `exportId` prop + `useCampaignExportStatus` hook; delegate all mutation calls to `useTriggerExport` in the parent or inside the modal with a callback for `onExportStarted(exportId)`.

---

## Standard Stack

### Core (all already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@headlessui/react` | existing | Modal shell (Dialog, DialogPanel, DialogTitle) | Used in ConfirmationModal and EditCampaignModal — consistent pattern |
| `@tanstack/react-query` | existing | `useTriggerExport` mutation + `useCampaignExportStatus` polling | Already wired; refetchInterval drives progress |
| `lucide-react` | existing | Download icon for Export button | Project-wide icon system |
| `sonner` | existing | Toast on export queued success | Used in all mutation hooks |
| Tailwind CSS | existing | Styling | Project-wide styling |

### Supporting (already in project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `use-exports.ts` `useExportHistory` | existing | Guild quota display (`data.quota.standard.remaining`) | Called when modal opens; 2min staleTime means it's usually cached |
| `src/lib/format.ts` `centsToDisplay` | existing | Currency formatting | Only if export data amounts are shown in modal (unlikely) |
| `cn` from `@/lib/utils` | existing | Conditional class merging | All conditional Tailwind |

### No New Dependencies

This phase adds zero new npm packages.

---

## Architecture Patterns

### Recommended File Structure

```
src/components/campaigns/
└── export-campaign-modal.tsx     # New: ExportCampaignModal component

src/app/(dashboard)/guilds/[guildId]/campaigns/[campaignId]/
└── page.tsx                      # Modified: Add Export button + exportId state + ExportCampaignModal
```

### Pattern 1: Modal State Machine (4 views in one Dialog shell)

**What:** A single `Dialog` wrapper renders different panel contents based on a `modalView` local state. The transition from one view to the next replaces content in-place — no page navigation.

**When to use:** Wizard flows where back/forward tracking is needed within one modal.

**State flow:**
```
options
  └─ [click Export, useTriggerExport.isPending] → submitting (inline in options view)
       └─ [onSuccess(exportId)] → progress
            ├─ [status === 'completed'] → complete
            └─ [status === 'failed'] → error
                  └─ [Try Again] → options
```

**Example (existing reference — ConfirmationModal shell pattern):**
```typescript
// Source: src/components/ui/confirmation-modal.tsx
<Dialog open={open} onClose={onClose} className="relative z-50">
  <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <DialogPanel className="max-w-md w-full bg-surface border border-border rounded-lg p-6 space-y-4 transition-all duration-200 ease-in-out">
      <DialogTitle className="text-lg font-semibold text-white">
        {title}
      </DialogTitle>
      {/* view content goes here */}
    </DialogPanel>
  </div>
</Dialog>
```

### Pattern 2: exportId Lifted to Parent

**What:** `exportId: string | null` state lives in `CampaignDetailPage`, not inside `ExportCampaignModal`. The modal receives it as a prop.

**Why:** Closing the modal mid-export does not reset exportId. Re-opening resumes progress view.

**Reset rules (documented):**
- Complete + Close → parent resets `exportId = null`
- Error + Close → parent resets `exportId = null`
- Error + Try Again → modal view resets to `options` (exportId remains null after clearing)

```typescript
// In CampaignDetailPage
const [exportOpen, setExportOpen] = useState(false)
const [exportId, setExportId] = useState<string | null>(null)

// ExportCampaignModal receives:
// open, onClose, exportId, onExportStarted(id), onExportDone, guildId, campaignId
```

### Pattern 3: Radio Buttons (Inline Tailwind, no component)

**What:** Standard `<input type="radio">` with Tailwind peer/checked styling. No existing radio component in the project — create inline per CONTEXT.md.

```typescript
// Source: established pattern from CONTEXT.md; no existing radio component
<label className="flex items-center gap-3 cursor-pointer">
  <input
    type="radio"
    name="format"
    value="csv"
    checked={format === 'csv'}
    onChange={() => setFormat('csv')}
    disabled={isPending}
    className="accent-accent-purple"
  />
  <span className="text-sm text-gray-300">CSV</span>
</label>
```

### Pattern 4: Quota Display from useExportHistory

**What:** `useExportHistory(guildId, 1, 1)` returns `data.quota.standard.remaining`. Display as: "N of 10 daily exports remaining". Disable Export button when `remaining === 0`.

**Timing:** Called when modal opens (or at parent level). 2min staleTime means no extra network hit if user was already on the page.

```typescript
// Source: src/components/import-export/export-tab.tsx lines 267–278
const { data: historyData } = useExportHistory(guildId, 1, 1)
const remaining = historyData?.quota?.standard.remaining ?? 10
```

**429 handling:** `useTriggerExport` already throws an `Error` with the quota message when status 429. Catch in the modal's submit handler:

```typescript
try {
  const result = await triggerExport.mutateAsync({ format, scope })
  onExportStarted(result.exportId)
} catch (err) {
  if (triggerExport.error?.message?.includes('quota') || ...) {
    setModalView('quota_exceeded')
  } else {
    setModalView('error')
  }
}
```

However, note: the quota check can be done eagerly (disable button when `remaining === 0`) before the user even clicks. The 429 path is a fallback for race conditions.

### Pattern 5: Polling with Auto-Stop

**What:** `useCampaignExportStatus` uses `refetchInterval: 3000`. Status polling stops when `exportId` is null (hook is disabled) or when parent clears exportId on completion.

The hook transitions modal view when `data.status` changes:

```typescript
const { data: exportStatus } = useCampaignExportStatus(guildId, campaignId, exportId)

useEffect(() => {
  if (!exportStatus) return
  if (exportStatus.status === 'completed' && exportStatus.downloadUrl) {
    setModalView('complete')
  } else if (exportStatus.status === 'failed') {
    setModalView('error')
  }
}, [exportStatus])
```

### Pattern 6: Export Button in Header (admin-only)

**What:** Follows the existing Edit button pattern with `isAdmin &&` guard. Button is disabled (not hidden) when `exportId` is non-null (export in progress).

```typescript
// Existing header pattern from page.tsx lines 111-133, extended:
{isAdmin && (
  <div className="flex items-center gap-2">
    {/* Export button — between Edit and Delete */}
    <button
      type="button"
      onClick={() => setExportOpen(true)}
      disabled={!!exportId}
      title={exportId ? 'Export in progress' : undefined}
      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-surface border border-border text-gray-300 hover:text-white hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download size={14} />
      Export
    </button>
    {/* Edit button (existing) */}
    {/* Delete button (existing) */}
  </div>
)}
```

### Anti-Patterns to Avoid

- **Storing exportId inside the modal:** State is lost on close. Always lift to parent.
- **Using SSE for campaign exports:** CONTEXT.md explicitly mandates polling (`useCampaignExportStatus`), not SSE. The guild-level `export-tab.tsx` uses SSE — campaign exports do not.
- **Resetting exportId inside modal:** Only the parent resets exportId. The modal calls `onExportDone()` which triggers the parent reset.
- **Hiding (not disabling) the Export button during active export:** Button must be disabled with tooltip, not hidden.
- **Showing export history in the modal or on the campaign detail page:** No export history section here — out of scope.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal shell | Custom overlay div | `Dialog`/`DialogPanel` from `@headlessui/react` | Focus trap, Escape key, ARIA roles all handled |
| Export mutation | Custom fetch | `useTriggerExport` from `use-campaigns.ts` | Already built and tested in Phase 25 |
| Export polling | Custom setInterval | `useCampaignExportStatus` from `use-campaigns.ts` | Already built with 3s refetchInterval |
| Quota display | Separate API call | `useExportHistory(guildId, 1, 1)` | Already cached at 2min staleTime |
| Icon | SVG from scratch | `Download` from `lucide-react` | Project-wide icon system |
| Conditional classes | String concatenation | `cn()` from `@/lib/utils` | Project standard |

---

## Common Pitfalls

### Pitfall 1: exportId State Reset Location
**What goes wrong:** Resetting `exportId` to null inside the modal (e.g., on close) destroys progress tracking — re-opening the modal starts from options view instead of resuming.
**Why it happens:** Natural instinct to keep all modal state co-located.
**How to avoid:** exportId is owned by the parent page. Modal calls `onExportDone()` callback; parent decides when to clear.
**Warning signs:** User closes modal mid-export, re-opens, and sees options view instead of progress.

### Pitfall 2: Polling Continues After Modal Unmounts
**What goes wrong:** `useCampaignExportStatus` keeps refetching even after export completes because `exportId` is never cleared.
**Why it happens:** `enabled: !!exportId && !!exportId` is always truthy once set; refetchInterval stays at 3000.
**How to avoid:** Parent clears `exportId = null` when modal view reaches `complete` and user closes, or when `error` and user closes. This disables the hook.
**Warning signs:** Network tab shows repeated GET `.../export/[exportId]` requests after download.

### Pitfall 3: Guild Quota Shared Across Export Types
**What goes wrong:** Treating campaign exports as having their own quota counter. They consume from the same guild-level daily pool of 10.
**Why it happens:** "Campaign export" sounds like a separate feature.
**How to avoid:** Always read quota from `useExportHistory(guildId, 1, 1)` — same query used by the guild-level Data Management tab. Do not track campaign-specific counts.
**Warning signs:** Quota display diverges from what the guild export tab shows.

### Pitfall 4: toast.success Duplication
**What goes wrong:** `useTriggerExport` already calls `toast.success('Export queued')` in `onSuccess`. If the modal also shows a toast, users see duplicates.
**Why it happens:** Modal wants to confirm the action with feedback.
**How to avoid:** The hook handles success toasting. The modal transitions to progress view — that IS the feedback. Suppress no-op toasts in the modal's submit handler.

### Pitfall 5: `expiresAt` Relative Time Calculation
**What goes wrong:** Displaying a fixed "24h" string vs. calculating the actual remaining time from `expiresAt`.
**Why it happens:** CONTEXT.md says "Link expires in 24h (calculated from `expiresAt` in response)" — the "24h" is an example, not a hardcoded value.
**How to avoid:** Calculate: `const hoursLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 3600000)`. Display as "Link expires in Xh".

### Pitfall 6: Radio Button Accessibility
**What goes wrong:** Two radio groups (format, scope) share `name` attribute — selecting CSV for format accidentally changes scope selection.
**Why it happens:** Both groups use `name="radio"` generically.
**How to avoid:** Use distinct `name` attributes: `name="export-format"` and `name="export-scope"`.

---

## Code Examples

### Complete ExportCampaignModal Props Interface
```typescript
// Derived from state persistence rules in CONTEXT.md
interface ExportCampaignModalProps {
  open: boolean
  onClose: () => void
  guildId: string
  campaignId: string
  exportId: string | null
  onExportStarted: (id: string) => void  // parent sets exportId
  onExportDone: () => void               // parent clears exportId
}
```

### Modal View Type
```typescript
type ModalView = 'options' | 'progress' | 'complete' | 'error'
```

Note: "submitting" is not a separate view — it's represented by `triggerExport.isPending` while the view is still `options`. The radios and Export button are disabled; button text changes to "Exporting..." with spinner.

### Polling Hook Usage with Effect
```typescript
// Source: src/hooks/use-campaigns.ts — useCampaignExportStatus
const { data: exportStatus } = useCampaignExportStatus(guildId, campaignId, exportId)

useEffect(() => {
  if (!exportStatus) return
  if (exportStatus.status === 'completed' && exportStatus.downloadUrl) {
    setView('complete')
  } else if (exportStatus.status === 'failed') {
    setView('error')
  }
}, [exportStatus?.status])
```

### Expiry Calculation
```typescript
function formatExpiresIn(expiresAt: string): string {
  const hoursLeft = Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)
  )
  if (hoursLeft <= 0) return 'Link expired'
  return `Link expires in ${hoursLeft}h`
}
```

### Campaign Detail Page — State Additions
```typescript
// Add to existing page.tsx state declarations
const [exportOpen, setExportOpen] = useState(false)
const [exportId, setExportId] = useState<string | null>(null)

// Handler for onExportDone:
const handleExportDone = () => {
  setExportId(null)
  setExportOpen(false)
}
```

---

## What Already Exists (Do Not Rebuild)

| Asset | Location | Status |
|-------|----------|--------|
| `POST .../campaigns/[campaignId]/export` proxy | `src/app/api/.../export/route.ts` | EXISTS — Phase 25 |
| `GET .../campaigns/[campaignId]/export/[exportId]` proxy | `src/app/api/.../export/[exportId]/route.ts` | EXISTS — Phase 25 |
| `useTriggerExport` hook | `src/hooks/use-campaigns.ts` | EXISTS — Phase 25 |
| `useCampaignExportStatus` hook | `src/hooks/use-campaigns.ts` | EXISTS — Phase 25 |
| `ExportTriggerResponse` type | `src/types/campaign.ts` | EXISTS — Phase 25 |
| `ExportStatusResponse` type | `src/types/campaign.ts` | EXISTS — Phase 25 |
| `campaignKeys.exportStatus` key factory | `src/hooks/use-campaigns.ts` | EXISTS — Phase 25 |
| Headless UI Dialog modal shell | `src/components/ui/confirmation-modal.tsx` | EXISTS — reference |
| `useExportHistory` for quota | `src/hooks/use-exports.ts` | EXISTS |
| `isAdmin` guard pattern | `page.tsx` lines 46-48 | EXISTS |

---

## Validation Architecture

> `nyquist_validation` key is absent from `.planning/config.json` — treat as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected (no jest.config.*, no vitest.config.*, no pytest.ini, no test/ directory) |
| Config file | None — see Wave 0 if tests are required |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXP-01 | Admin sees Export button in header; non-admin does not | manual-only | No test framework configured | N/A |
| EXP-01 | Modal opens with format/scope radios; CSV + Payment summary default | manual-only | No test framework configured | N/A |
| EXP-01 | Clicking Export calls POST `.../export` with correct body | manual-only | No test framework configured | N/A |
| EXP-01 | 429 response shows quota exceeded message | manual-only | No test framework configured | N/A |
| EXP-02 | After exportId received, modal shows progress view | manual-only | No test framework configured | N/A |
| EXP-02 | Polling resolves to complete view with download link | manual-only | No test framework configured | N/A |
| EXP-02 | Export button disabled while exportId is active | manual-only | No test framework configured | N/A |

### Sampling Rate

- **Per task commit:** TypeScript check — `npx tsc --noEmit -p "/Users/gabrielleal/Desktop/dashboard-tracking-bot/tsconfig.json"`
- **Per wave merge:** Full TypeScript check passes; manual smoke test of export modal flow
- **Phase gate:** TypeScript clean + manual end-to-end verification before `/gsd:verify-work`

### Wave 0 Gaps

No test framework is installed in this project. This is consistent with all prior phases. Testing is done through TypeScript type checks and manual verification.

---

## Sources

### Primary (HIGH confidence)
- `src/hooks/use-campaigns.ts` — `useTriggerExport`, `useCampaignExportStatus`, `campaignKeys.exportStatus` — read directly
- `src/types/campaign.ts` — `ExportTriggerResponse`, `ExportStatusResponse` — read directly
- `src/app/api/.../export/route.ts` — proxy route implementation — read directly
- `src/app/api/.../export/[exportId]/route.ts` — status route implementation — read directly
- `src/components/ui/confirmation-modal.tsx` — Headless UI Dialog shell pattern — read directly
- `src/components/campaigns/edit-campaign-modal.tsx` — Edit modal shell pattern — read directly
- `src/app/(dashboard)/guilds/[guildId]/campaigns/[campaignId]/page.tsx` — integration target — read directly
- `src/components/import-export/export-tab.tsx` — ProgressSection state machine reference — read directly
- `src/hooks/use-exports.ts` — `useExportHistory` quota pattern — read directly
- `.planning/phases/29-campaign-export/29-CONTEXT.md` — all locked decisions — read directly

### Secondary (MEDIUM confidence)
- None — all findings come from direct code inspection

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use; no new dependencies
- Architecture: HIGH — modal shell, polling, admin guard all have existing code references
- Pitfalls: HIGH — derived from CONTEXT.md decisions and existing code patterns
- Integration points: HIGH — all proxy routes and hooks exist and were read directly

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable — no external dependencies to track)
