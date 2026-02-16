---
phase: 11-session-management
plan: 02
subsystem: session-management
tags: [ui, react, session-management, animations]

dependency_graph:
  requires:
    - session-types
    - sessions-api-routes
    - session-management-hooks
  provides:
    - session-card-component
    - revoke-dialog-component
    - sessions-page
  affects:
    - dashboard-settings-section

tech_stack:
  added: []
  patterns:
    - Card-based layout with device icons
    - Confirmation dialogs for destructive actions
    - CSS transition animations for card removal
    - Current session visual distinction with badge

key_files:
  created:
    - src/components/sessions/session-card.tsx
    - src/components/sessions/revoke-session-dialog.tsx
    - src/app/(dashboard)/settings/sessions/page.tsx
  modified: []

decisions:
  - title: "Always show revoke button"
    rationale: "Display revoke button even for current session - dialog will warn user they'll be logged out. Consistent UX pattern."
    alternatives: ["Hide revoke for current session (rejected - less discoverable)"]
  - title: "Animation before mutation"
    rationale: "Trigger fade/scale animation immediately on revoke click for responsive feel, clean up on mutation completion"
    alternatives: ["Wait for mutation then animate (rejected - feels sluggish)"]
  - title: "Logout-all button always visible"
    rationale: "Show logout-all even with single session - users may want to force-logout to invalidate tokens"
    alternatives: ["Hide when only 1 session (rejected - removes valid use case)"]

metrics:
  duration: 1m 38s
  completed_at: 2026-02-16T12:19:48Z
---

# Phase 11 Plan 02: Session Management UI Summary

**One-liner:** Session management UI with card-based layout, device icons, confirmation dialogs, animated card removal, and logout-all functionality at /settings/sessions

## Execution

### Tasks Completed

| Task | Name                                                      | Commit  | Files |
| ---- | --------------------------------------------------------- | ------- | ----- |
| 1    | Create session card and revoke session dialog components  | efdcb2c | 2     |
| 2    | Create sessions page with list, revocation, and logout-all| bde8a8d | 1     |

### Implementation Details

**Task 1: SessionCard and RevokeSessionDialog components**
- **SessionCard** (`src/components/sessions/session-card.tsx`):
  - Device icon mapping: Monitor (desktop), Smartphone (mobile), Tablet (tablet)
  - Displays device name, browser + version, OS + version, masked IP, last active timestamp
  - Current session badge with accent-purple/20 background
  - Revoke button shown for all sessions (dialog handles current session warning)
  - Follows existing component patterns: bg-surface, border-border, transition-all
- **RevokeSessionDialog** (`src/components/sessions/revoke-session-dialog.tsx`):
  - Supports two modes: 'single' (individual session) and 'all' (logout all devices)
  - Single mode messaging: warns if current session ("you will be logged out"), shows device/browser details for non-current
  - All mode messaging: "revoke all X sessions including current one"
  - Loading states: "Revoking..." / "Logging out..."
  - Built with Headless UI Dialog, follows confirmation-modal.tsx pattern exactly
  - Bold text in descriptions parsed inline (splits on ** markers)

**Task 2: Sessions management page**
- **Page structure** (`src/app/(dashboard)/settings/sessions/page.tsx`):
  - Header: "Active Sessions (X)" with description
  - Loading state: 3 skeleton cards with pulse animation
  - Empty state: informational message in surface-styled box
  - Session list: maps over sessions with animation wrapper
  - Logout-all section: at bottom, border-top separation, less prominent styling
- **Session list behavior**:
  - Sorts sessions: current pinned first, rest by createdAt desc (from API)
  - Each session wrapped in animated div with opacity/scale/max-height transitions
  - Animation triggered via `removingIds` Set - adds sessionId on revoke click
  - 300ms CSS transition duration, cleanup after animation completes
- **Revocation flow**:
  - Click revoke → opens dialog in 'single' mode with device details
  - Current session: mutation → redirect to /login on success
  - Non-current: add to removingIds → mutation → animate out → remove from set
  - Error: removes from removingIds (cancels animation)
- **Logout-all flow**:
  - Click "Logout All Devices" → opens dialog in 'all' mode with session count
  - Confirm → calls logoutAll.mutate() (hook handles cache clear + redirect)
- **Dialog close handling**: Only closes if not loading (checks both mutation states)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification checks passed:
- ✅ TypeScript compilation passes with no errors (initial + final checks)
- ✅ `npm run build` succeeds, validates /settings/sessions as Next.js route
- ✅ All 3 new files exist at expected paths
- ✅ SessionCard follows existing patterns (account-card.tsx reference)
- ✅ RevokeSessionDialog follows confirmation-modal.tsx pattern exactly
- ✅ Page uses established hooks (useSessions, useRevokeSession, useLogoutAll)

## Self-Check

**Files created:**
```
FOUND: src/components/sessions/session-card.tsx
FOUND: src/components/sessions/revoke-session-dialog.tsx
FOUND: src/app/(dashboard)/settings/sessions/page.tsx
```

**Commits verified:**
```
FOUND: efdcb2c (Task 1 - Session card and dialog components)
FOUND: bde8a8d (Task 2 - Sessions page)
```

**Component exports verified:**
```
✅ SessionCard from session-card.tsx
✅ RevokeSessionDialog from revoke-session-dialog.tsx
✅ default function SessionsPage from page.tsx
```

**Build validation:**
```
✅ /settings/sessions route appears in Next.js build output
✅ Build completes successfully (no errors)
```

## Self-Check: PASSED

## Success Criteria

- ✅ Session card renders device icon (Monitor/Smartphone/Tablet from lucide-react), device name, browser + OS, masked IP (font-mono), and last active time
- ✅ Current session badge visible with accent-purple styling
- ✅ Confirmation dialog shows before revocation with appropriate messaging for single vs all modes
- ✅ Revoked session card fades and scales out with 300ms CSS transition
- ✅ "Logout All Devices" button at bottom of list revokes all sessions and redirects to /login
- ✅ Loading state shows skeleton cards, empty state shows informational message
- ✅ Page follows existing dashboard styling (bg-surface, border-border, text-white/gray-400)

## Next Steps

Phase 11 session management is complete. The feature is ready for user testing. Next phase should focus on connecting the session management UI to user settings navigation or dashboard menu.
