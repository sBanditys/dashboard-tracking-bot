---
phase: 26
slug: campaign-list-detail
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright ^1.58.2 |
| **Config file** | playwright.config.ts |
| **Quick run command** | `npx playwright test --grep "campaign"` |
| **Full suite command** | `npm run test:e2e` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Visual verification in browser (localhost:3001) + `npx tsc --noEmit`
- **After every plan wave:** `npm run test:e2e` (if e2e tests exist)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | CAMP-01 | e2e | `npx playwright test tests/campaigns-list.spec.ts -x` | ❌ W0 | ⬜ pending |
| 26-01-02 | 01 | 1 | CAMP-02 | e2e | `npx playwright test tests/campaigns-list.spec.ts --grep "filter" -x` | ❌ W0 | ⬜ pending |
| 26-01-03 | 01 | 1 | CAMP-04 | manual | Visual verification | N/A | ⬜ pending |
| 26-02-01 | 02 | 1 | CAMP-03 | e2e | `npx playwright test tests/campaign-detail.spec.ts -x` | ❌ W0 | ⬜ pending |
| 26-02-02 | 02 | 1 | CAMP-08 | e2e | `npx playwright test tests/campaign-detail.spec.ts --grep "rate" -x` | ❌ W0 | ⬜ pending |
| 26-02-03 | 02 | 1 | CAMP-09 | e2e | `npx playwright test tests/campaign-detail.spec.ts --grep "budget" -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/campaigns-list.spec.ts` — stubs for CAMP-01, CAMP-02
- [ ] `tests/campaign-detail.spec.ts` — stubs for CAMP-03, CAMP-08, CAMP-09
- Note: E2E tests require running backend with test data; may be deferred if test infrastructure is not set up for campaign endpoints.

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Color-coded status badges | CAMP-04 | Visual color accuracy cannot be reliably asserted in e2e | Verify Draft=gray, Active=green, Paused=yellow, SubmissionsClosed=orange, Completed=blue badges on list cards and detail view |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
