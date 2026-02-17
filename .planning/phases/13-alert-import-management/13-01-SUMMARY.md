---
phase: 13-alert-import-management
plan: 01
subsystem: api
tags: [alerts, email-alerts, csv-import, sse, proxy-routes, typescript]

# Dependency graph
requires:
  - phase: 10-frontend-security
    provides: backendFetch, sanitizeError, internalError utilities used by all proxy routes
  - phase: 11-session-management
    provides: auth_token cookie pattern used by all proxy routes

provides:
  - Backend cross-guild GET alert-thresholds endpoint with pagination and filters
  - Backend PATCH threshold toggle endpoint with audit logging
  - Backend export dataType enum accepting all 6 types (accounts, posts, metrics, analytics, audit, gdpr)
  - TypeScript types: AlertThreshold, AlertSettings, ThresholdPage, EmailConfig, EmailRecipient (src/types/alert.ts)
  - TypeScript types: ImportPreview, ImportProgressEvent, ImportResult, ImportHistoryEntry (src/types/import.ts)
  - ExportDataType named type + extended ExportRequest/ExportRecord types (src/types/export.ts)
  - 11 proxy API routes covering alert thresholds, alert settings, email config, email recipients, CSV import/export
affects: [13-02, 13-03, future alert UI plans]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cross-guild paginated Prisma queries with dynamic where clause construction"
    - "POST-SSE streaming proxy: pipe backend response.body directly via new NextResponse(response.body)"
    - "Multipart forwarding: request.arrayBuffer() + pass original Content-Type header to preserve boundary"
    - "CSV stream proxy: preserve Content-Disposition header from backend, return new NextResponse with text/csv"
    - "Platform enum type safety: validate string against Object.values(Platform) before casting"

key-files:
  created:
    - ~/Desktop/Tracking Data Bot/api/src/routes/dashboard/guilds/guildAlerts.ts
    - src/types/alert.ts
    - src/types/import.ts
    - src/app/api/guilds/[guildId]/alert-thresholds/route.ts
    - src/app/api/guilds/[guildId]/groups/[groupId]/alert-thresholds/route.ts
    - src/app/api/guilds/[guildId]/groups/[groupId]/alert-thresholds/[thresholdId]/route.ts
    - src/app/api/guilds/[guildId]/groups/[groupId]/alert-settings/route.ts
    - src/app/api/guilds/[guildId]/email-config/route.ts
    - src/app/api/guilds/[guildId]/email-recipients/route.ts
    - src/app/api/guilds/[guildId]/email-recipients/[recipientId]/route.ts
    - src/app/api/guilds/[guildId]/email-recipients/[recipientId]/resend-verification/route.ts
    - src/app/api/guilds/[guildId]/accounts/template/route.ts
    - src/app/api/guilds/[guildId]/accounts/import/route.ts
    - src/app/api/guilds/[guildId]/accounts/import/confirm/route.ts
  modified:
    - ~/Desktop/Tracking Data Bot/api/src/routes/dashboard/exports.ts
    - src/types/export.ts

key-decisions:
  - "Platform enum cast: validate string against Object.values(Platform) before casting to Platform enum type to satisfy Prisma.AlertThresholdWhereInput"
  - "Import Prisma and Platform from @prisma/client in guildAlerts.ts for type-safe where clause construction"
  - "SSE streaming proxy uses new NextResponse(response.body) to pipe backend SSE stream directly, not buffering"
  - "Multipart upload proxy uses request.arrayBuffer() to capture raw body and passes original Content-Type (with boundary) to backend"
  - "Template download proxy preserves Content-Disposition from backend response for filename passthrough"

patterns-established:
  - "SSE streaming proxy: new NextResponse(response.body, { headers: { 'Content-Type': 'text/event-stream', ... } })"
  - "Binary/multipart proxy: arrayBuffer() + original Content-Type header forwarding"

requirements-completed: [ALERT-01, ALERT-02, ALERT-03, ALERT-04, IMPEX-01, IMPEX-02, IMPEX-03, IMPEX-04]

# Metrics
duration: 3m 49s
completed: 2026-02-17
---

# Phase 13 Plan 01: Alert & Import Management — Data Layer Summary

**Backend alert threshold cross-guild GET + toggle PATCH endpoints, TypeScript types for alerts/imports/exports, and 11 proxy API routes covering threshold CRUD, email config, CSV template/import/SSE streaming**

## Performance

- **Duration:** 3m 49s
- **Started:** 2026-02-17T16:32:20Z
- **Completed:** 2026-02-17T16:36:09Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments
- Added 2 missing backend endpoints to guildAlerts.ts: cross-guild paginated GET and per-threshold PATCH toggle with audit log
- Extended backend exports.ts dataType enum from 2 to 6 types (metrics, analytics, audit, gdpr added)
- Created src/types/alert.ts and src/types/import.ts type definitions; expanded src/types/export.ts with ExportDataType named type
- Created all 11 proxy API routes: 4 alert threshold routes, 1 alert settings route, 4 email config/recipients routes, 1 CSV template stream route, 1 multipart import route, 1 POST-SSE import confirm streaming proxy

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix backend gaps** - `b0c53db` (feat — backend repo)
2. **Task 2: Create TypeScript types** - `52ed576` (feat)
3. **Task 3: Create proxy routes** - `c8b1247` (feat)

**Plan metadata:** (created after this summary)

## Files Created/Modified

**Backend (~/Desktop/Tracking Data Bot/):**
- `api/src/routes/dashboard/guilds/guildAlerts.ts` - Added GET /:guildId/alert-thresholds (cross-guild paginated) and PATCH /:guildId/groups/:groupId/alert-thresholds/:thresholdId (toggle with audit log)
- `api/src/routes/dashboard/exports.ts` - Extended dataType enum to ['accounts','posts','metrics','analytics','audit','gdpr']

**Dashboard types:**
- `src/types/alert.ts` - AlertThreshold, AlertSettings, ThresholdFilters, ThresholdPage, CreateThresholdRequest, EmailConfig, EmailRecipient, EmailConfigResponse
- `src/types/import.ts` - ImportPreview, ImportPreviewRow, ImportProgressEvent, ImportResult, ImportHistoryEntry
- `src/types/export.ts` - Added ExportDataType named type; extended ExportRequest.dataType and ExportRecord.dataType to all 6 types

**Dashboard proxy routes:**
- `src/app/api/guilds/[guildId]/alert-thresholds/route.ts` - GET cross-guild with query passthrough
- `src/app/api/guilds/[guildId]/groups/[groupId]/alert-thresholds/route.ts` - GET + POST
- `src/app/api/guilds/[guildId]/groups/[groupId]/alert-thresholds/[thresholdId]/route.ts` - DELETE + PATCH
- `src/app/api/guilds/[guildId]/groups/[groupId]/alert-settings/route.ts` - PATCH
- `src/app/api/guilds/[guildId]/email-config/route.ts` - GET + PUT
- `src/app/api/guilds/[guildId]/email-recipients/route.ts` - POST
- `src/app/api/guilds/[guildId]/email-recipients/[recipientId]/route.ts` - DELETE
- `src/app/api/guilds/[guildId]/email-recipients/[recipientId]/resend-verification/route.ts` - POST
- `src/app/api/guilds/[guildId]/accounts/template/route.ts` - GET with CSV stream + Content-Disposition passthrough
- `src/app/api/guilds/[guildId]/accounts/import/route.ts` - POST with arrayBuffer multipart forwarding
- `src/app/api/guilds/[guildId]/accounts/import/confirm/route.ts` - POST-SSE streaming proxy

## Decisions Made
- Platform enum cast: validate string against `Object.values(Platform)` before casting to satisfy Prisma's AlertThresholdWhereInput type (string is not assignable to Platform enum directly)
- Import `Platform` and `Prisma` from `@prisma/client` in guildAlerts.ts for typed where clause construction
- SSE streaming proxy uses `new NextResponse(response.body)` to pipe the backend SSE stream — no buffering
- Multipart upload uses `request.arrayBuffer()` and passes the original Content-Type header (with boundary) to backend
- Template download proxy preserves `Content-Disposition` header from backend response for correct filename in browser download

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Platform enum type error in cross-guild alert-thresholds where clause**
- **Found during:** Task 1 (backend gaps)
- **Issue:** TypeScript rejected `platform: string | undefined` in Prisma `AlertThresholdWhereInput` — Platform is an enum, not a string
- **Fix:** Added validation against `Object.values(Platform)`, then cast to `Platform` type; imported `Platform` and `Prisma` from `@prisma/client`
- **Files modified:** `~/Desktop/Tracking Data Bot/api/src/routes/dashboard/guilds/guildAlerts.ts`
- **Verification:** `npx tsc --noEmit` backend check passes (excluding pre-existing test file error)
- **Committed in:** b0c53db (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type bug)
**Impact on plan:** Fix necessary for correct Prisma type safety. No scope creep.

## Issues Encountered
- Pre-existing TypeScript error in `api/src/__tests__/integration/exportEdgeCases.integration.test.ts` (line 30): missing `STREAMING_THRESHOLD` export from `@lx/shared/lib/exportService`. This is out of scope (pre-existing, unrelated to our changes). Logged for deferred attention.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All data layer types and proxy routes are ready for 13-02 and 13-03 hook/UI plans
- Alert threshold hooks can use ThresholdPage, AlertThreshold, CreateThresholdRequest types
- Import flow hooks can use ImportPreview, ImportProgressEvent, ImportResult types
- Email config hooks can use EmailConfig, EmailRecipient, EmailConfigResponse types
- SSE import confirm proxy correctly streams from backend using response.body piping

---
*Phase: 13-alert-import-management*
*Completed: 2026-02-17*
