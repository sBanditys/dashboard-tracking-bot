---
phase: 22-performance-optimization
plan: "03"
subsystem: ui
tags: [next.js, bundle-analysis, webpack, dynamic-imports, performance]

# Dependency graph
requires:
  - phase: 22-02
    provides: dynamic imports applied to CreateRoundModal, LeaderboardTab, EmailConfigSection via next/dynamic
provides:
  - Formal bundle analysis run confirming PERF-03 dynamic import chunks are separate
  - Documented chunk sizes for CreateRoundModal, LeaderboardTab, EmailConfigSection
  - PERF-03 requirement fully verified and closed
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bundle analysis requires --webpack flag in Next.js 16 with Turbopack as default; ANALYZE=true npm run build -- --webpack"

key-files:
  created: []
  modified: []

key-decisions:
  - "Bundle analysis requires --webpack flag in Next.js 16 because @next/bundle-analyzer wraps webpack config only; Turbopack builds produce no report"
  - "ANALYZE=true npm run build -- --webpack is the correct invocation for Next.js 16 with Turbopack default"

patterns-established:
  - "Bundle analysis pattern: ANALYZE=true npm run build -- --webpack (not --no-turbo)"

requirements-completed: [PERF-03]

# Metrics
duration: 4min
completed: 2026-03-04
---

# Phase 22 Plan 03: Bundle Analysis Verification Summary

**PERF-03 gap closed: ANALYZE=true npm run build --webpack confirms CreateRoundModal (22.8KB parsed), LeaderboardTab (9.5KB parsed), and EmailConfigSection (12.0KB parsed) as separate client-side chunks**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-04T17:10:01Z
- **Completed:** 2026-03-04T17:14:00Z
- **Tasks:** 1
- **Files modified:** 0 (bundle analysis artifacts are gitignored ephemeral output)

## Accomplishments

- Executed `ANALYZE=true npm run build -- --webpack` successfully, generating `.next/analyze/client.html`, `edge.html`, and `nodejs.html`
- Confirmed all three dynamically-imported components appear as separate chunks in the webpack client bundle
- Documented exact chunk labels, parent chunk names, and parsed/gzip sizes for each component
- Closed the PERF-03 verification gap — dynamic imports were already applied in Phase 22-02, but the formal bundle analysis run had never been executed

## Bundle Analysis Results

The following components are confirmed as separate chunks in the client bundle:

| Component | Top-level Chunk | Stat Size | Parsed Size | Gzip Size |
|-----------|----------------|-----------|-------------|-----------|
| `CreateRoundModal` | `static/chunks/3605.8b7696a8c8fe944b.js` | 76,782B (75KB) | 22,817B (22.3KB) | 6,194B (6.1KB) |
| `EmailConfigSection` | `static/chunks/5736.aff195d416f0ff97.js` | 34,302B (33.5KB) | 11,953B (11.7KB) | 3,077B (3.0KB) |
| `LeaderboardTab` | `static/chunks/8492.dfa488df86ad1c80.js` | 23,863B (23.3KB) | 9,489B (9.3KB) | 2,434B (2.4KB) |

**Module-level details (within parent chunks):**

| Module | Stat Size | Parsed Size | Gzip Size |
|--------|-----------|-------------|-----------|
| `create-round-modal.tsx + 3 modules (concatenated)` | 57,890B | 17,581B | 4,576B |
| `email-config-section.tsx + 1 modules (concatenated)` | 31,783B | 11,225B | 2,777B |
| `leaderboard-tab.tsx + 2 modules (concatenated)` | 23,863B | 9,402B | 2,379B |

**Total client bundle:** 130 chunks, 6,054KB stat / 1,957KB parsed.

## Build Invocation Note

Next.js 16 defaults to Turbopack, which is incompatible with `@next/bundle-analyzer`. The standard `ANALYZE=true npm run build` command shows a warning and skips report generation. The correct invocation is:

```bash
ANALYZE=true npm run build -- --webpack
```

This forces webpack mode and generates the HTML treemap reports in `.next/analyze/`.

## Task Commits

No source files were modified — this plan was a verification-only run. The deliverable is this SUMMARY documenting the analysis results.

1. **Task 1: Run bundle analysis build and confirm dynamic import chunks** - No commit (no source files changed; `.next/` is gitignored)

**Plan metadata:** (see final docs commit)

## Files Created/Modified

None — `.next/analyze/` is gitignored and ephemeral. No source changes required.

## Decisions Made

- **Bundle analysis requires --webpack flag in Next.js 16**: The `@next/bundle-analyzer` package wraps webpack config only. Turbopack builds emit a compatibility warning and produce no report. The correct invocation for Next.js 16 is `ANALYZE=true npm run build -- --webpack`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added --webpack flag to bundle analyzer command**
- **Found during:** Task 1 (running ANALYZE=true npm run build)
- **Issue:** The plan's primary command `ANALYZE=true npm run build` emitted a Turbopack incompatibility warning and produced no `.next/analyze/` output, because Next.js 16 defaults to Turbopack
- **Fix:** Re-ran with `ANALYZE=true npm run build -- --webpack` as suggested by the Next.js warning message. The plan explicitly anticipated this fallback and documented it in the task action.
- **Files modified:** None
- **Verification:** `.next/analyze/client.html` (715KB), `edge.html` (274KB), `nodejs.html` (794KB) all generated
- **Committed in:** N/A (no source files changed)

---

**Total deviations:** 1 auto-handled (plan anticipated the fallback, no unplanned work)
**Impact on plan:** Expected fallback path taken per plan instructions. All three components confirmed as separate chunks.

## Issues Encountered

The `@next/bundle-analyzer` package does not support Turbopack. Running `ANALYZE=true npm run build` (Turbopack default in Next.js 16) shows:

```
The Next Bundle Analyzer is not compatible with Turbopack builds, no report will be generated.
Consider trying the new Turbopack analyzer via `next experimental-analyze`.
To run this analysis pass the `--webpack` flag to `next build`
```

Adding `-- --webpack` resolves this immediately. The plan documented this exact fallback scenario.

## Next Phase Readiness

- PERF-03 is fully verified and complete
- Phase 22 (performance optimization) is now complete — all three plans (22-01 staleTime, 22-02 dynamic imports, 22-03 bundle analysis) are done
- No blockers for subsequent phases

---
*Phase: 22-performance-optimization*
*Completed: 2026-03-04*
