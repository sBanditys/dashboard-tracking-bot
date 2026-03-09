---
phase: 27
slug: campaign-mutations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual browser testing + TypeScript type checking |
| **Config file** | tsconfig.json |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit && npx next build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx tsc --noEmit && npx next build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | CAMP-05 | type-check + manual | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 27-01-02 | 01 | 1 | CAMP-05 | type-check + manual | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 27-01-03 | 01 | 1 | CAMP-06 | type-check + manual | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 27-01-04 | 01 | 1 | CAMP-06 | type-check + manual | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 27-01-05 | 01 | 1 | CAMP-07 | type-check + manual | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 27-01-06 | 01 | 1 | CAMP-07 | type-check + manual | `npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No additional test framework setup needed — project uses TypeScript type checking and manual browser verification.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Create campaign form submits and new campaign appears in list | CAMP-05 | UI interaction, visual confirmation | 1. Click "+ Create Campaign" 2. Fill required fields 3. Submit 4. Verify campaign in list |
| Edit campaign saves changes, 409 shows toast | CAMP-06 | UI interaction, toast notification | 1. Open campaign detail 2. Click Edit 3. Change fields 4. Submit 5. Verify changes persisted |
| Delete Draft/Completed shows confirm, Active/Paused hides button | CAMP-07 | UI interaction, conditional rendering | 1. Open Draft campaign 2. Verify Delete visible 3. Click Delete 4. Confirm 5. Verify redirect to list |
| Non-admin users don't see mutation buttons | All | Permission-based rendering | 1. Log in as non-admin 2. Verify no Create/Edit/Delete buttons visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
