---
phase: 29
slug: campaign-export
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (no test framework configured — consistent with all prior phases) |
| **Config file** | None |
| **Quick run command** | `npx tsc --noEmit -p "/Users/gabrielleal/Desktop/dashboard-tracking-bot/tsconfig.json"` |
| **Full suite command** | `npx tsc --noEmit -p "/Users/gabrielleal/Desktop/dashboard-tracking-bot/tsconfig.json"` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit -p "/Users/gabrielleal/Desktop/dashboard-tracking-bot/tsconfig.json"`
- **After every plan wave:** Run full TypeScript check + manual smoke test of export modal flow
- **Before `/gsd:verify-work`:** Full suite must be green + manual end-to-end verification
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 1 | EXP-01 | manual | `npx tsc --noEmit` | N/A | ⬜ pending |
| 29-01-02 | 01 | 1 | EXP-01 | manual | `npx tsc --noEmit` | N/A | ⬜ pending |
| 29-01-03 | 01 | 1 | EXP-01 | manual | `npx tsc --noEmit` | N/A | ⬜ pending |
| 29-02-01 | 02 | 1 | EXP-02 | manual | `npx tsc --noEmit` | N/A | ⬜ pending |
| 29-02-02 | 02 | 1 | EXP-02 | manual | `npx tsc --noEmit` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework installation needed — this is consistent with all 28 prior phases.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin sees Export button; non-admin does not | EXP-01 | UI permission gating — no test framework | Log in as admin, verify button visible; switch to non-admin, verify hidden |
| Modal opens with format/scope radios; CSV + Payment summary default | EXP-01 | UI interaction | Click Export, verify modal renders with correct defaults |
| Clicking Export calls POST `.../export` with correct body | EXP-01 | API integration | Open Network tab, trigger export, verify request body |
| 429 response shows quota exceeded message | EXP-01 | Error state | Exhaust daily quota, attempt export, verify error toast |
| After exportId received, modal shows progress view | EXP-02 | Async state transition | Trigger export, verify modal transitions to progress |
| Polling resolves to complete view with download link | EXP-02 | Async completion | Wait for export to finish, verify download link appears |
| Export button disabled while exportId is active | EXP-02 | State persistence | Start export, close modal, verify button shows disabled/resume state |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
