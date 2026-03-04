---
phase: 22
slug: performance-optimization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Static inspection + build-time (no unit test framework) |
| **Config file** | N/A — grep/build commands |
| **Quick run command** | `grep -rn "optimizePackageImports" next.config.mjs && grep -rn "staleTime: 30" src/hooks/` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick grep checks
- **After every plan wave:** Run `npm run build`
- **Before `/gsd:verify-work`:** Full build must succeed; all grep checks pass
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | PERF-01 | static-inspection | `grep -r "optimizePackageImports" next.config.mjs` | ❌ W0 | ⬜ pending |
| 22-01-02 | 01 | 1 | PERF-01 | manual-smoke | Dev server module count observation | manual-only | ⬜ pending |
| 22-02-01 | 02 | 1 | PERF-02 | static-inspection | `grep -rn "staleTime: 30" src/hooks/` (should return 0) | ❌ W0 | ⬜ pending |
| 22-03-01 | 03 | 2 | PERF-03 | file-exists | `ls -la .next/analyze/` | ❌ W0 | ⬜ pending |
| 22-03-02 | 03 | 2 | PERF-03 | static-inspection | `grep -rn "next/dynamic" src/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. All PERF validations are static-inspection or build-time — no new test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dev server lucide-react module count reduced | PERF-01 | Requires running dev server and observing compile output | Run `npm run dev`, navigate to page using lucide icons, check terminal for module count |
| Navigation refetch waterfall eliminated | PERF-02 | Requires browser observation of network tab | Navigate between pages, verify no visible refetch waterfall on recently loaded data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
