# Phase 7: Data Management - Research

**Researched:** 2026-02-07
**Domain:** Data export, bulk operations, soft delete patterns
**Confidence:** HIGH

## Summary

Phase 7 implements data export functionality (CSV, JSON, XLSX), bulk operations (delete, export, reassign), and soft-delete with trash recovery. The backend already has comprehensive export infrastructure using ExcelJS 4.4.0, AWS S3 storage, and Prisma DataExport model. The dashboard will integrate with these existing systems.

**Key finding:** The backend has a complete export service (`shared/src/lib/exportService.ts`) and S3 storage layer (`shared/src/lib/s3Storage.ts`) ready to reuse. ExcelJS is already generating multi-sheet workbooks with platform separation for metrics exports. The infrastructure supports both S3 and local storage fallback.

**Primary recommendation:** Reuse existing backend export infrastructure. Add soft-delete columns (`deletedAt`) to ClientAccount and Post models. Implement shift-click range selection with React hooks. Use Server-Sent Events (already proven in the project) for progress tracking on large exports.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
**Export format & scope:**
- Three export formats: CSV, JSON, and XLSX
- Exportable data: accounts and posts (not brands, settings, or audit log)
- Two export modes: "Export current view" (respects active filters) and "Export all" (full data)
- Export button on each data page (Accounts, Posts) in the filter bar area
- Dedicated export page in sidebar for full configuration and export history
- User-editable filename with descriptive default (e.g., "sonuhaempire-accounts-2026-02-07.csv")

**Selection & bulk actions:**
- Checkboxes on each card with shift-click for range selection
- Select-all selects visible items first, then offers "Select all X items" link for full selection (Gmail pattern)
- Three bulk operations: Delete, Export selected, Reassign (to different group/brand)
- Sticky bottom bar appears when items are selected showing "X selected" with action buttons

**Download experience:**
- Smart download: instant for small exports (<1000 items), background job for large exports
- Progress bar with item count for exports ("Exporting 450/1,200 items...")
- Background exports: toast notification if user is on the page + always available in export history
- Export history lives on the dedicated export page with download links

**Bulk confirmation flow:**
- Type-to-confirm pattern for ALL bulk operations (delete, reassign, export) — user types count or "DELETE"
- Partial failure handling: show results summary ("12 deleted, 3 failed") with details on which items failed
- Audit logging: one summary entry + individual entries per affected item

**Soft delete & trash:**
- Deleted items are soft-deleted, moved to trash (not permanently removed)
- Trash accessible under guild settings as "Deleted Items" sub-page
- Auto-purge after 30 days with warning when items approach expiry
- Users can permanently delete from trash with type-to-confirm
- Users can restore items from trash back to their original location

### Claude's Discretion
- Whether to reuse existing S3 bucket and `/exportdata` backend infrastructure or build separate export logic (existing AWS S3 bucket already available in backend API)
- XLSX generation library choice
- Exact progress tracking implementation for exports
- Trash UI layout and item grouping within settings

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ExcelJS | 4.4.0 | XLSX file generation | Industry standard for Node.js Excel generation, supports styling, multiple sheets, formulas, hyperlinks |
| @aws-sdk/client-s3 | Latest | S3 file storage | Official AWS SDK v3 for file storage and pre-signed URLs |
| @tanstack/react-query | 5.90.20 | Server state management | Modern React data fetching with built-in caching, mutations, optimistic updates |
| Prisma Client | 5.22.0 | Database ORM | Type-safe database access with schema migration support |

### Supporting
| Library | Purpose | When to Use |
|---------|---------|-------------|
| @aws-sdk/s3-request-presigner | Generate signed download URLs | For S3 exports (already in use) |
| date-fns | Date formatting | Already in dashboard for consistent date handling |

### NOT Needed (Already Built)
| Feature | Existing Solution | Location |
|---------|------------------|----------|
| CSV generation | Custom implementation in exportService.ts | `shared/src/lib/exportService.ts` lines 883-919 |
| JSON export | Native JSON.stringify | `shared/src/lib/exportService.ts` lines 1069-1072 |
| S3 upload/download | Complete S3Storage service | `shared/src/lib/s3Storage.ts` |
| Export job tracking | DataExport Prisma model | `shared/prisma/schema.prisma` lines 849-882 |
| Rate limiting | ExportRateLimit model | `shared/prisma/schema.prisma` lines 885-895 |

**Installation:**
```bash
# No new packages needed! Everything is already installed in the backend.
# For soft delete extension (optional, if middleware approach is too complex):
cd ~/Desktop/Tracking\ Data\ Bot/api
pnpm add prisma-extension-soft-delete
```

## Architecture Patterns

### Existing Backend Export Flow (REUSE THIS)
```
Client Request → Dashboard API Route → Backend Export Endpoint
  → Create DataExport record
  → Process export (fetch data, generate file)
  → Upload to S3 or local storage
  → Generate signed download URL
  → Return download URL to client
```

**Current implementation:** `shared/src/lib/exportService.ts`
- `createExport()` - Creates export record, checks rate limits
- `processExport()` - Fetches data, generates file, uploads to storage
- `getExportStatus()` - Polls for completion status
- `listUserExports()` - Export history

### Pattern 1: Soft Delete with deletedAt
**What:** Add nullable `deletedAt` timestamp column to models that need soft delete
**When to use:** For reversible deletions (accounts, posts)
**Example:**
```prisma
// Source: Prisma soft delete best practices
model ClientAccount {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  // Soft delete fields
  deletedAt DateTime? @db.Timestamptz(6)
  deletedBy String?   @db.VarChar(32) // Discord user ID who deleted

  // ... existing fields
}

model Post {
  url       String    @id
  createdAt DateTime  @default(now())

  // Soft delete fields
  deletedAt DateTime? @db.Timestamptz(6)
  deletedBy String?   @db.VarChar(32)

  // ... existing fields
}
```

**Query pattern:**
```typescript
// Exclude soft-deleted by default
const accounts = await prisma.clientAccount.findMany({
  where: {
    brandId: brandId,
    deletedAt: null, // ← Filter out soft-deleted
  },
})

// Fetch only soft-deleted (for trash view)
const trashedAccounts = await prisma.clientAccount.findMany({
  where: {
    brandId: brandId,
    deletedAt: { not: null },
  },
  orderBy: { deletedAt: 'desc' },
})
```

### Pattern 2: Shift-Click Range Selection
**What:** Allow users to select multiple checkboxes by holding Shift
**When to use:** Multi-select in lists (accounts, posts)
**Example:**
```typescript
// Source: React shift-click selection pattern
function useShiftSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)

  const handleSelect = (id: string, index: number, event: React.MouseEvent) => {
    const newSelected = new Set(selectedIds)

    if (event.shiftKey && lastSelectedIndex !== null) {
      // Range selection
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)
      for (let i = start; i <= end; i++) {
        newSelected.add(items[i].id)
      }
    } else {
      // Toggle single item
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
    }

    setSelectedIds(newSelected)
    setLastSelectedIndex(index)
  }

  const selectAll = () => setSelectedIds(new Set(items.map(i => i.id)))
  const clearSelection = () => {
    setSelectedIds(new Set())
    setLastSelectedIndex(null)
  }

  return { selectedIds, handleSelect, selectAll, clearSelection }
}
```

### Pattern 3: Type-to-Confirm Deletion (GitHub Pattern)
**What:** Require users to type confirmation text before destructive actions
**When to use:** All bulk operations (delete, reassign) and permanent trash deletion
**Example:**
```typescript
// Source: GitHub repository deletion pattern
function BulkDeleteConfirmation({ count, onConfirm, onCancel }: Props) {
  const [input, setInput] = useState('')
  const expectedText = count.toString() // or "DELETE" for permanent deletion
  const isValid = input === expectedText

  return (
    <Dialog>
      <p>You are about to delete {count} items. This action cannot be undone.</p>
      <p>Type <strong>{expectedText}</strong> to confirm:</p>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={expectedText}
      />
      <button disabled={!isValid} onClick={onConfirm}>
        Delete {count} items
      </button>
    </Dialog>
  )
}
```

### Pattern 4: Server-Sent Events for Progress Tracking
**What:** Stream progress updates from server to client for long-running exports
**When to use:** Exports >1000 items (per user decision)
**Example:**
```typescript
// Source: React SSE implementation for background jobs
// Backend (Express route)
router.get('/exports/:exportId/progress', async (req, res) => {
  const { exportId } = req.params

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const interval = setInterval(async () => {
    const exportRecord = await prisma.dataExport.findUnique({
      where: { id: exportId },
    })

    if (!exportRecord) {
      clearInterval(interval)
      res.end()
      return
    }

    const data = {
      progress: exportRecord.progress,
      status: exportRecord.status,
      recordCount: exportRecord.recordCount,
      message: exportRecord.status === 'processing'
        ? `Exporting ${exportRecord.recordCount}/... items`
        : undefined,
    }

    res.write(`data: ${JSON.stringify(data)}\n\n`)

    if (exportRecord.status === 'completed' || exportRecord.status === 'failed') {
      clearInterval(interval)
      res.end()
    }
  }, 1000) // Poll every second
})

// Frontend (React hook)
function useExportProgress(exportId: string) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('pending')

  useEffect(() => {
    const eventSource = new EventSource(`/api/exports/${exportId}/progress`)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setProgress(data.progress)
      setStatus(data.status)
    }

    eventSource.onerror = () => eventSource.close()

    return () => eventSource.close()
  }, [exportId])

  return { progress, status }
}
```

### Pattern 5: Partial Failure Handling (207 Multi-Status)
**What:** Return detailed results when bulk operations partially succeed
**When to use:** Bulk delete, bulk reassign operations
**Example:**
```typescript
// Source: Bulk operations partial failure pattern
// Backend response
type BulkOperationResult = {
  total: number
  succeeded: number
  failed: number
  results: Array<{
    id: string
    status: 'success' | 'error'
    error?: string
  }>
}

// POST /api/guilds/:guildId/accounts/bulk-delete
async function bulkDeleteAccounts(req, res) {
  const { accountIds } = req.body
  const results: BulkOperationResult = {
    total: accountIds.length,
    succeeded: 0,
    failed: 0,
    results: [],
  }

  for (const id of accountIds) {
    try {
      await prisma.clientAccount.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: req.user.id,
        },
      })
      results.succeeded++
      results.results.push({ id, status: 'success' })
    } catch (error) {
      results.failed++
      results.results.push({
        id,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // Log bulk operation to audit log
  await prisma.dashboardAuditLog.create({
    data: {
      actorId: req.user.id,
      actorType: 'user',
      guildId: req.params.guildId,
      targetType: 'accounts_bulk_delete',
      action: 'delete',
      changes: results as any,
      source: 'dashboard',
    },
  })

  res.status(results.failed > 0 ? 207 : 200).json(results)
}

// Frontend display
function BulkResultsToast({ results }: { results: BulkOperationResult }) {
  if (results.failed === 0) {
    return <Toast type="success">Deleted {results.succeeded} items</Toast>
  }

  return (
    <Toast type="warning">
      <p>Deleted {results.succeeded} items</p>
      <p>{results.failed} items failed:</p>
      <ul>
        {results.results
          .filter(r => r.status === 'error')
          .map(r => <li key={r.id}>{r.error}</li>)}
      </ul>
    </Toast>
  )
}
```

### Pattern 6: Sticky Selection Bar (Gmail Pattern)
**What:** Bottom bar that appears when items are selected, showing count and actions
**When to use:** When user selects 1+ items in accounts or posts list
**Example:**
```typescript
// Source: Sticky bottom bar pattern
function SelectionBar({ selectedCount, onDelete, onExport, onReassign, onClear }: Props) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-medium">{selectedCount} selected</span>
          <button onClick={onClear} className="text-sm text-gray-600">
            Clear selection
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onExport} className="btn-secondary">
            Export selected
          </button>
          <button onClick={onReassign} className="btn-secondary">
            Reassign
          </button>
          <button onClick={onDelete} className="btn-danger">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Hard deleting data without confirmation:** Always use soft delete for user-created content (accounts, posts)
- **Generic "Are you sure?" modals:** Use type-to-confirm pattern instead (per user decision)
- **Silent failures in bulk operations:** Always show which items failed and why (207 Multi-Status pattern)
- **Client-side only selection state:** Track selection state but verify on backend before operations
- **Blocking UI during exports:** Use background jobs + SSE for exports >1000 items

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excel file generation | Custom XLSX writer | ExcelJS 4.4.0 (already installed) | Handles styling, formulas, multiple sheets, hyperlinks, data validation. Already generating multi-sheet exports in backend. |
| CSV generation | Third-party library | Custom implementation in exportService.ts | CSV is simple enough. Existing implementation handles escaping, null values, formatting correctly. |
| S3 file upload | Raw AWS SDK calls | s3Storage.ts service layer | Existing service handles upload, download URLs, cleanup, local fallback, MIME types. 400+ lines of tested code. |
| Soft delete queries | Manual deletedAt checks everywhere | Prisma middleware or extension | Prevents accidental data leaks. Auto-filters soft-deleted records. Handles cascading relations. |
| Export progress polling | setInterval on client | Server-Sent Events | SSE prevents polling overhead, provides real-time updates, auto-reconnects on disconnect. Dashboard already uses SSE elsewhere. |
| Pre-signed download URLs | Custom HMAC signing | S3 getSignedUrl or generateSignedLocalUrl | S3 SDK handles expiry, IAM validation. Local fallback in s3Storage.ts uses HMAC with expiry checking. |

**Key insight:** The backend export infrastructure is production-ready with 1100+ lines of tested code. Reusing it eliminates weeks of work and edge case debugging. CSV, JSON, XLSX generation is already implemented with proper escaping, styling, and multi-sheet support.

## Common Pitfalls

### Pitfall 1: Forgetting to Filter Soft-Deleted Records
**What goes wrong:** Queries return soft-deleted items, leaking "deleted" data to users
**Why it happens:** Soft delete requires adding `deletedAt: null` to every query
**How to avoid:** Use Prisma Client Extension to automatically filter
**Warning signs:** Users see "deleted" accounts/posts in lists

**Prevention:**
```typescript
// WRONG: Forgets to filter soft-deleted
const accounts = await prisma.clientAccount.findMany({
  where: { brandId },
})

// RIGHT: Explicitly filters soft-deleted
const accounts = await prisma.clientAccount.findMany({
  where: {
    brandId,
    deletedAt: null, // ← Don't forget this
  },
})

// BETTER: Use Prisma extension to auto-filter
import { PrismaClient } from '@prisma/client'
import softDelete from 'prisma-extension-soft-delete'

const prisma = new PrismaClient().$extends(
  softDelete({
    models: {
      ClientAccount: { field: 'deletedAt', createValue: () => new Date() },
      Post: { field: 'deletedAt', createValue: () => new Date() },
    },
  })
)
```

### Pitfall 2: CSV/Excel Injection Vulnerability
**What goes wrong:** Excel interprets cell values starting with `=`, `+`, `@`, `-` as formulas
**Why it happens:** User data contains special characters that Excel treats as formula prefixes
**How to avoid:** Prefix dangerous values with single quote `'` in CSV/XLSX generation
**Warning signs:** Security scanners flag CSV injection, Excel shows formula warnings

**Prevention:**
```typescript
// WRONG: Raw value might execute formulas
const csvValue = `=1+1` // Excel executes this!

// RIGHT: Escape formula prefixes
function escapeCsvValue(value: string): string {
  if (value.startsWith('=') || value.startsWith('+') ||
      value.startsWith('-') || value.startsWith('@')) {
    return `'${value}` // Prefix with single quote
  }
  return value
}

// ExcelJS already handles this, but verify:
worksheet.getCell('A1').value = '=1+1' // ExcelJS stores as string, not formula
```

### Pitfall 3: Race Condition in Shift-Click Selection
**What goes wrong:** Shift-click selects wrong range if items list reorders between clicks
**Why it happens:** Selection uses array indices, but list can change (new items, sorting)
**How to avoid:** Track last selected ID, not index; find range using stable IDs
**Warning signs:** Shift-click selects unexpected items, especially after filtering/sorting

**Prevention:**
```typescript
// WRONG: Uses indices (breaks on reorder)
const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)
if (event.shiftKey && lastSelectedIndex !== null) {
  const start = Math.min(lastSelectedIndex, index)
  const end = Math.max(lastSelectedIndex, index)
  // ❌ Indices change when list reorders!
}

// RIGHT: Uses stable IDs
const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
if (event.shiftKey && lastSelectedId) {
  const lastIndex = items.findIndex(i => i.id === lastSelectedId)
  const currentIndex = index
  if (lastIndex !== -1) {
    const start = Math.min(lastIndex, currentIndex)
    const end = Math.max(lastIndex, currentIndex)
    for (let i = start; i <= end; i++) {
      newSelected.add(items[i].id) // ✅ Uses stable IDs
    }
  }
}
```

### Pitfall 4: Not Handling S3 Upload Failures Gracefully
**What goes wrong:** Export fails silently or leaves orphaned database records
**Why it happens:** S3 upload throws error but DataExport record remains "processing"
**How to avoid:** Wrap S3 operations in try/catch, update status to "failed" on error
**Warning signs:** Exports stuck in "processing" state forever

**Prevention:**
```typescript
// WRONG: Doesn't handle S3 failure
const s3Key = generateExportKey(exportId, format, exportType)
await uploadFile(tempFile, s3Key) // ❌ Throws error, record stuck

// RIGHT: Catches errors and updates status
try {
  const s3Key = generateExportKey(exportId, format, exportType)
  await uploadFile(tempFile, s3Key)

  await prisma.dataExport.update({
    where: { id: exportId },
    data: { status: 'completed', filePath: s3Key },
  })
} catch (error) {
  await prisma.dataExport.update({
    where: { id: exportId },
    data: {
      status: 'failed',
      errorMessage: error.message,
    },
  })
  throw error // Re-throw after updating status
}
```

### Pitfall 5: Missing Audit Logs for Bulk Operations
**What goes wrong:** No record of who deleted what, can't trace data loss
**Why it happens:** Forgot to log bulk operations to DashboardAuditLog
**How to avoid:** Create ONE summary audit entry + individual entries per item
**Warning signs:** Audit log doesn't show bulk deletes, compliance issues

**Prevention:**
```typescript
// WRONG: No audit logging
await prisma.clientAccount.updateMany({
  where: { id: { in: accountIds } },
  data: { deletedAt: new Date() },
})

// RIGHT: Summary entry + individual entries
const results = await bulkSoftDelete(accountIds)

// Summary entry
await prisma.dashboardAuditLog.create({
  data: {
    actorId: req.user.id,
    actorType: 'user',
    guildId: req.params.guildId,
    targetType: 'accounts_bulk_delete',
    action: 'delete',
    changes: {
      total: results.total,
      succeeded: results.succeeded,
      failed: results.failed,
    } as any,
    source: 'dashboard',
  },
})

// Individual entries for each success
for (const result of results.results.filter(r => r.status === 'success')) {
  await prisma.dashboardAuditLog.create({
    data: {
      actorId: req.user.id,
      actorType: 'user',
      guildId: req.params.guildId,
      targetType: 'account',
      targetId: result.id,
      action: 'delete',
      source: 'dashboard',
    },
  })
}
```

### Pitfall 6: 30-Day Purge Not Automated
**What goes wrong:** Trash fills up with old items, never auto-purges
**Why it happens:** No cron job or scheduled task for auto-purge
**How to avoid:** Create scheduled job (daily cron) to hard-delete items older than 30 days
**Warning signs:** Database grows unbounded, trash shows items from months ago

**Prevention:**
```typescript
// Create scheduled purge job (run daily)
async function purgeExpiredTrashItems() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Hard delete accounts older than 30 days
  const deletedAccounts = await prisma.clientAccount.deleteMany({
    where: {
      deletedAt: { lt: thirtyDaysAgo, not: null },
    },
  })

  // Hard delete posts older than 30 days
  const deletedPosts = await prisma.post.deleteMany({
    where: {
      deletedAt: { lt: thirtyDaysAgo, not: null },
    },
  })

  logger.info({ deletedAccounts, deletedPosts }, 'Purged expired trash items')
  return { accounts: deletedAccounts.count, posts: deletedPosts.count }
}

// Register cron job
// In backend: Add to cron scheduler or use node-cron
import cron from 'node-cron'
cron.schedule('0 2 * * *', purgeExpiredTrashItems) // 2 AM daily
```

## Code Examples

Verified patterns from existing codebase and official sources:

### Existing Backend Export - Multi-Sheet Excel Generation
```typescript
// Source: ~/Desktop/Tracking Data Bot/shared/src/lib/exportService.ts lines 932-1002
// ExcelJS already generates platform-specific sheets for metrics exports

async function writeExcelFile(data: any[], filePath: string, exportType?: ExportType): Promise<string> {
  const workbook = new ExcelJS.Workbook()

  // For metrics exports, create separate sheets per platform
  if (exportType === "metrics" && data.length > 0 && data[0].platform) {
    const platforms = ["tiktok", "instagram", "youtube", "x"]
    const dataByPlatform = new Map<string, any[]>()

    for (const row of data) {
      const platform = (row.platform || "other").toLowerCase()
      if (!dataByPlatform.has(platform)) {
        dataByPlatform.set(platform, [])
      }
      dataByPlatform.get(platform)!.push(row)
    }

    for (const platform of platforms.filter((p) => dataByPlatform.has(p))) {
      const platformData = dataByPlatform.get(platform) || []
      if (platformData.length === 0) continue

      const sheetName = platform === "x" ? "X" : platform.charAt(0).toUpperCase() + platform.slice(1)
      const worksheet = workbook.addWorksheet(sheetName)

      // Auto-width columns
      const headers = Object.keys(platformData[0]).filter((h) => h !== "platform")
      worksheet.columns = headers.map((key) => ({
        header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1"),
        key,
        width: Math.max(key.length + 5, Math.min(50, ...platformData.slice(0, 100).map((row) => String(row[key] ?? "").length + 2))),
      }))

      // Style header row
      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } }

      // Add hyperlinks for link column
      const linkColIndex = headers.indexOf("link") + 1
      for (const row of platformData) {
        const addedRow = worksheet.addRow(row)
        if (linkColIndex > 0 && row.link) {
          const cell = addedRow.getCell(linkColIndex)
          cell.value = { text: row.link, hyperlink: row.link }
          cell.font = { color: { argb: "FF0066CC" }, underline: true }
        }
      }
    }
  }

  await workbook.xlsx.writeFile(filePath)
  return filePath
}
```

### Existing Backend - S3 Upload with Local Fallback
```typescript
// Source: ~/Desktop/Tracking Data Bot/shared/src/lib/s3Storage.ts
import { isS3Configured, uploadFile, generateDownloadUrl, localStorage, generateSignedLocalUrl } from './s3Storage'

// Smart storage: S3 if configured, local fallback otherwise
if (isS3Configured()) {
  // Use S3
  const s3Key = generateExportKey(exportId, format, exportType)
  await uploadFile(tempFile, s3Key)
  const urlResult = await generateDownloadUrl(s3Key, EXPORT_URL_EXPIRY_HOURS * 60 * 60)
  downloadUrl = urlResult.url
  expiresAt = urlResult.expiresAt
  filePath = s3Key
  fs.unlinkSync(tempFile) // Clean up
} else {
  // Use local storage
  const filename = path.basename(tempFile)
  filePath = await localStorage.saveFile(fs.readFileSync(tempFile), filename)
  const urlResult = generateSignedLocalUrl(exportId, filename, EXPORT_URL_EXPIRY_HOURS * 60 * 60)
  downloadUrl = urlResult.url
  expiresAt = urlResult.expiresAt
}
```

### Existing Backend - Export Rate Limiting
```typescript
// Source: ~/Desktop/Tracking Data Bot/shared/src/lib/exportService.ts lines 79-110
const MAX_EXPORTS_PER_DAY = 10
const MAX_GDPR_EXPORTS_PER_DAY = 3

export async function canCreateExport(userId: string, isGdpr: boolean = false): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const rateLimit = await prisma.exportRateLimit.findUnique({
    where: { userId_date: { userId, date: today } },
  })

  const currentCount = isGdpr ? rateLimit?.gdprExportsToday ?? 0 : rateLimit?.exportsToday ?? 0
  const limit = isGdpr ? MAX_GDPR_EXPORTS_PER_DAY : MAX_EXPORTS_PER_DAY
  const remaining = Math.max(0, limit - currentCount)

  const resetAt = new Date(today)
  resetAt.setDate(resetAt.getDate() + 1)

  return { allowed: currentCount < limit, remaining, resetAt }
}
```

### React Query Mutation for Bulk Delete
```typescript
// Pattern for dashboard implementation
import { useMutation, useQueryClient } from '@tanstack/react-query'

function useBulkDelete(guildId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (accountIds: string[]) => {
      const response = await fetch(`/api/guilds/${guildId}/accounts/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountIds }),
      })

      if (!response.ok) {
        throw new Error('Bulk delete failed')
      }

      return response.json() as Promise<BulkOperationResult>
    },
    onSuccess: (result) => {
      // Invalidate accounts query to refresh list
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'accounts'] })

      // Show toast with results
      if (result.failed === 0) {
        toast.success(`Deleted ${result.succeeded} accounts`)
      } else {
        toast.warning(`Deleted ${result.succeeded} accounts, ${result.failed} failed`)
      }
    },
  })
}
```

### Select All with "Select all X items" Link (Gmail Pattern)
```typescript
// Source: Gmail-style selection pattern
function AccountsList({ accounts, totalCount }: Props) {
  const { selectedIds, handleSelect, selectAll, clearSelection } = useShiftSelection(accounts)
  const [selectAllMode, setSelectAllMode] = useState<'visible' | 'all'>('visible')

  const handleHeaderCheckbox = () => {
    if (selectedIds.size > 0) {
      clearSelection()
      setSelectAllMode('visible')
    } else {
      selectAll() // Select visible items
      setSelectAllMode('visible')
    }
  }

  const selectAllItems = () => {
    // Fetch all account IDs (not just visible)
    // This would require a backend endpoint to return all IDs
    setSelectAllMode('all')
    // Update selectedIds to include all items
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={selectedIds.size > 0}
          indeterminate={selectedIds.size > 0 && selectedIds.size < accounts.length}
          onChange={handleHeaderCheckbox}
        />
        {selectedIds.size > 0 && selectedIds.size === accounts.length && selectAllMode === 'visible' && totalCount > accounts.length && (
          <div className="text-sm">
            All {accounts.length} items on this page are selected.{' '}
            <button onClick={selectAllItems} className="text-blue-600 underline">
              Select all {totalCount} items
            </button>
          </div>
        )}
      </div>

      {/* Account cards with checkboxes */}
      {accounts.map((account, index) => (
        <AccountCard
          key={account.id}
          account={account}
          selected={selectedIds.has(account.id)}
          onSelect={(e) => handleSelect(account.id, index, e)}
        />
      ))}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma Middleware for soft delete | Prisma Client Extensions | Prisma 4.16+ (2023) | Middleware deprecated. Extensions provide better type safety and composition. Use `prisma-extension-soft-delete` library. |
| Custom CSV libraries (csv-parser, fast-csv) | Built-in CSV generation | 2024+ | CSV is simple enough to implement in 100 lines. Existing backend has custom implementation with proper escaping. |
| Polling for export progress | Server-Sent Events (SSE) | Modern standard | SSE provides real-time updates without polling overhead. Dashboard already uses SSE elsewhere (bot status). |
| Generic confirmation modals | Type-to-confirm pattern | GitHub popularized 2020+ | Prevents accidental destructive actions. User must type count or "DELETE" to confirm. |
| 200 OK with errors array | 207 Multi-Status | RFC 4918 (WebDAV) | Proper HTTP status for partial success. Shows exactly which items failed and why. |
| Hard deletes | Soft deletes with trash | Standard for SaaS 2020+ | Allows undo, meets compliance requirements (GDPR), prevents accidental data loss. |

**Deprecated/outdated:**
- **Prisma Middleware:** Use Prisma Client Extensions instead for soft delete auto-filtering
- **react-sticky library:** Use CSS `position: sticky` instead (native browser support)
- **Polling for progress:** Use Server-Sent Events (EventSource API)

## Open Questions

Things that couldn't be fully resolved:

1. **S3 Bucket Configuration**
   - What we know: `.env` has AWS credentials, backend has S3 infrastructure
   - What's unclear: Is S3 bucket actually created? Does it need additional configuration?
   - Recommendation: Verify S3 bucket exists in AWS console. If not, create `tracking-bot-exports` bucket in us-east-1. Enable versioning and lifecycle policy (delete after 30 days).

2. **Prisma Extension vs. Manual Filtering**
   - What we know: Prisma deprecated middleware in favor of extensions
   - What's unclear: Does existing backend use extensions? Will adding extension break existing queries?
   - Recommendation: Test `prisma-extension-soft-delete` in development first. If it conflicts, use manual `deletedAt: null` filtering with TypeScript helper function.

3. **Trash UI Grouping**
   - What we know: Trash lives under "Deleted Items" sub-page in guild settings
   - What's unclear: Should trash group by type (accounts, posts), date, or show mixed list?
   - Recommendation: Group by type with tabs ("Accounts", "Posts"). Show deletion date and "expires in X days" countdown. Highlight items expiring in <7 days.

4. **Export Button Placement on Mobile**
   - What we know: Export button in filter bar area
   - What's unclear: Does filter bar collapse on mobile? Where does export button go?
   - Recommendation: On mobile, show export button in sticky header or overflow menu. Don't hide critical export functionality.

## Sources

### Primary (HIGH confidence)
- **Existing codebase:**
  - `~/Desktop/Tracking Data Bot/shared/src/lib/exportService.ts` - Complete export service with CSV, JSON, XLSX generation
  - `~/Desktop/Tracking Data Bot/shared/src/lib/s3Storage.ts` - S3 upload/download with local fallback
  - `~/Desktop/Tracking Data Bot/shared/prisma/schema.prisma` - DataExport and ExportRateLimit models
  - `~/Desktop/Tracking Data Bot/api/src/routes/exports.ts` - Download endpoint with signed URLs
  - `~/Desktop/dashboard-tracking-bot/src/hooks/use-tracking.ts` - React Query patterns

- **Official Documentation:**
  - [ExcelJS GitHub Repository](https://github.com/exceljs/exceljs) - Official ExcelJS documentation
  - [ExcelJS npm Package](https://www.npmjs.com/package/exceljs) - Installation and API reference
  - [Prisma Soft Delete Middleware](https://www.prisma.io/docs/orm/prisma-client/client-extensions/middleware/soft-delete-middleware) - Official Prisma documentation

### Secondary (MEDIUM confidence)
- [How to Implement Server-Sent Events in React (2026)](https://oneuptime.com/blog/post/2026-01-15-server-sent-events-sse-react/view) - Recent SSE implementation guide
- [How to Implement Bulk Operations in REST APIs (2026)](https://oneuptime.com/blog/post/2026-01-27-rest-api-bulk-operations/view) - Bulk operations best practices
- [Design Patterns for Partial Success in Bulk Operations](https://medium.com/api-catalyst/design-patterns-for-handling-mixed-success-and-failure-scenarios-in-http-200-ok-responses-07e26684f1ec) - 207 Multi-Status pattern
- [Database Soft Deletes with Prisma](https://www.jeffedmondson.dev/database-soft-deletes-with-prisma/) - Soft delete implementation guide
- [Bulk Actions UX: 8 Design Guidelines](https://www.eleken.co/blog-posts/bulk-actions-ux) - UX patterns for bulk operations
- [UX Movement: Type-to-Confirm Deletion](https://uxmovement.com/buttons/how-to-make-sure-users-dont-accidentally-delete/) - GitHub deletion pattern analysis
- [React Multi-Select Checkboxes](https://tj.ie/multi-select-checkboxes-with-react/) - Shift-click selection pattern

### Tertiary (LOW confidence - requires verification)
- [CSV vs JSON vs XLSX Comparison (2026)](https://sonra.io/csv-vs-json-vs-xml/) - Format selection guidance
- [CSV vs JSON for Web Scraping](https://infatica.io/blog/json-csv-xlsx-overview/) - Format tradeoffs
- [Mobile Navigation Patterns in 2026](https://phone-simulator.com/blog/mobile-navigation-patterns-in-2026) - Bottom bar UI patterns
- [prisma-extension-soft-delete GitHub](https://github.com/olivierwilkinson/prisma-extension-soft-delete) - Third-party extension (verify compatibility)

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - ExcelJS 4.4.0 already installed and used in backend. AWS S3 SDK in use. React Query 5.90.20 installed.
- Architecture: **HIGH** - Existing backend export service is production-ready with 1100+ lines. S3 storage layer handles upload/download/cleanup.
- Pitfalls: **MEDIUM** - Common issues documented but need testing (CSV injection, soft delete filtering, S3 failures).
- Soft delete: **MEDIUM** - Pattern well-documented but Prisma extension needs compatibility testing with existing backend.

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days - stable domain, mature libraries)

**Recommendations for planner:**
1. **Reuse backend export infrastructure completely** - Don't rebuild what exists
2. **Add soft delete columns to schema** - `deletedAt`, `deletedBy` on ClientAccount and Post
3. **Implement Prisma extension for auto-filtering** - Prevents accidentally showing deleted items
4. **Use SSE for progress tracking** - Dashboard already uses SSE, proven pattern
5. **Create scheduled job for 30-day purge** - Don't let trash fill up
6. **Test S3 bucket configuration** - Verify bucket exists before implementation
