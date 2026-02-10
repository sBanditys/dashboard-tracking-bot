import { fetchWithRetry } from '@/lib/fetch-with-retry'
import type { Post, PostsResponse } from '@/types/tracking'

const POSTS_EXPORT_PAGE_LIMIT = 200
const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const XLSX_HEADER_SIGNATURE = 0x04034b50
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50

type PlatformKey = Post['platform']

type PostExportRow = {
  Link: string
  Views: number | ''
  'Posted At': string
  Likes: number | ''
  Comments: number | ''
  Shares: number | ''
}

type PlatformSheet = {
  name: string
  rows: PostExportRow[]
}

type ZipEntry = {
  name: string
  data: Uint8Array
}

const PLATFORM_SHEETS: Array<{ platform: PlatformKey; name: string }> = [
  { platform: 'instagram', name: 'IG' },
  { platform: 'tiktok', name: 'TikTok' },
  { platform: 'youtube', name: 'YouTube' },
  { platform: 'x', name: 'X' },
]

const ROW_HEADERS: Array<keyof PostExportRow> = [
  'Link',
  'Views',
  'Posted At',
  'Likes',
  'Comments',
  'Shares',
]

const textEncoder = new TextEncoder()

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c >>> 0
  }
  return table
})()

function encodeUtf8(value: string): Uint8Array {
  return textEncoder.encode(value)
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toNumberOrEmpty(value: unknown): number | '' {
  return typeof value === 'number' && Number.isFinite(value) ? value : ''
}

function toPostExportRow(post: Post): PostExportRow {
  return {
    Link: post.url ?? '',
    Views: toNumberOrEmpty(post.metrics?.views),
    'Posted At': post.posted_at ?? post.submitted_at ?? '',
    Likes: toNumberOrEmpty(post.metrics?.likes),
    Comments: toNumberOrEmpty(post.metrics?.comments),
    Shares: toNumberOrEmpty(post.metrics?.shares),
  }
}

function columnToLetter(index: number): string {
  let value = index + 1
  let label = ''
  while (value > 0) {
    const remainder = (value - 1) % 26
    label = String.fromCharCode(65 + remainder) + label
    value = Math.floor((value - 1) / 26)
  }
  return label
}

function cellReference(columnIndex: number, rowIndex: number): string {
  return `${columnToLetter(columnIndex)}${rowIndex + 1}`
}

function createCellXml(columnIndex: number, rowIndex: number, value: string | number | ''): string {
  const ref = cellReference(columnIndex, rowIndex)

  if (typeof value === 'number') {
    return `<c r="${ref}"><v>${value}</v></c>`
  }

  const safeValue = escapeXml(value)
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${safeValue}</t></is></c>`
}

function createSheetXml(rows: PostExportRow[]): string {
  const headerRowXml = `<row r="1">${ROW_HEADERS.map((header, index) => createCellXml(index, 0, header)).join('')}</row>`

  const bodyRowsXml = rows.map((row, rowIndex) => {
    const xmlRowIndex = rowIndex + 1
    const cells = ROW_HEADERS.map((header, columnIndex) => createCellXml(columnIndex, xmlRowIndex, row[header]))
    return `<row r="${xmlRowIndex + 1}">${cells.join('')}</row>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${headerRowXml}${bodyRowsXml}</sheetData>
</worksheet>`
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function concatUint8Arrays(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function createZip(entries: ZipEntry[]): Uint8Array {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const fileNameBytes = encodeUtf8(entry.name)
    const entryCrc32 = crc32(entry.data)

    const localHeader = new Uint8Array(30 + fileNameBytes.length)
    const localHeaderView = new DataView(localHeader.buffer)

    localHeaderView.setUint32(0, XLSX_HEADER_SIGNATURE, true)
    localHeaderView.setUint16(4, 20, true)
    localHeaderView.setUint16(6, 0, true)
    localHeaderView.setUint16(8, 0, true)
    localHeaderView.setUint16(10, 0, true)
    localHeaderView.setUint16(12, 0, true)
    localHeaderView.setUint32(14, entryCrc32, true)
    localHeaderView.setUint32(18, entry.data.length, true)
    localHeaderView.setUint32(22, entry.data.length, true)
    localHeaderView.setUint16(26, fileNameBytes.length, true)
    localHeaderView.setUint16(28, 0, true)
    localHeader.set(fileNameBytes, 30)

    localParts.push(localHeader, entry.data)

    const centralHeader = new Uint8Array(46 + fileNameBytes.length)
    const centralHeaderView = new DataView(centralHeader.buffer)

    centralHeaderView.setUint32(0, ZIP_CENTRAL_DIRECTORY_SIGNATURE, true)
    centralHeaderView.setUint16(4, 20, true)
    centralHeaderView.setUint16(6, 20, true)
    centralHeaderView.setUint16(8, 0, true)
    centralHeaderView.setUint16(10, 0, true)
    centralHeaderView.setUint16(12, 0, true)
    centralHeaderView.setUint16(14, 0, true)
    centralHeaderView.setUint32(16, entryCrc32, true)
    centralHeaderView.setUint32(20, entry.data.length, true)
    centralHeaderView.setUint32(24, entry.data.length, true)
    centralHeaderView.setUint16(28, fileNameBytes.length, true)
    centralHeaderView.setUint16(30, 0, true)
    centralHeaderView.setUint16(32, 0, true)
    centralHeaderView.setUint16(34, 0, true)
    centralHeaderView.setUint16(36, 0, true)
    centralHeaderView.setUint32(38, 0, true)
    centralHeaderView.setUint32(42, offset, true)
    centralHeader.set(fileNameBytes, 46)
    centralParts.push(centralHeader)

    offset += localHeader.length + entry.data.length
  }

  const centralDirectoryOffset = offset
  const centralDirectorySize = centralParts.reduce((sum, part) => sum + part.length, 0)

  const endOfCentralDirectory = new Uint8Array(22)
  const endOfCentralDirectoryView = new DataView(endOfCentralDirectory.buffer)
  endOfCentralDirectoryView.setUint32(0, ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE, true)
  endOfCentralDirectoryView.setUint16(4, 0, true)
  endOfCentralDirectoryView.setUint16(6, 0, true)
  endOfCentralDirectoryView.setUint16(8, entries.length, true)
  endOfCentralDirectoryView.setUint16(10, entries.length, true)
  endOfCentralDirectoryView.setUint32(12, centralDirectorySize, true)
  endOfCentralDirectoryView.setUint32(16, centralDirectoryOffset, true)
  endOfCentralDirectoryView.setUint16(20, 0, true)

  return concatUint8Arrays([...localParts, ...centralParts, endOfCentralDirectory])
}

function buildWorkbookBytes(sheets: PlatformSheet[]): Uint8Array {
  const worksheetEntries: ZipEntry[] = sheets.map((sheet, index) => ({
    name: `xl/worksheets/sheet${index + 1}.xml`,
    data: encodeUtf8(createSheetXml(sheet.rows)),
  }))

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}
  </sheets>
</workbook>`

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}
</Relationships>`

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`

  const packageRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: encodeUtf8(contentTypesXml) },
    { name: '_rels/.rels', data: encodeUtf8(packageRelsXml) },
    { name: 'xl/workbook.xml', data: encodeUtf8(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: encodeUtf8(workbookRelsXml) },
    ...worksheetEntries,
  ]

  return createZip(entries)
}

function ensureXlsxFilename(filename: string): string {
  const trimmed = filename.trim()
  if (!trimmed) {
    return `export_metrics_${Date.now()}.xlsx`
  }
  return trimmed.toLowerCase().endsWith('.xlsx') ? trimmed : `${trimmed}.xlsx`
}

function downloadXlsx(filename: string, bytes: Uint8Array): void {
  const blobBytes = new Uint8Array(bytes.byteLength)
  blobBytes.set(bytes)
  const blob = new Blob([blobBytes], { type: XLSX_MIME_TYPE })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function fetchPostsPage(guildId: string, page: number, limit: number): Promise<PostsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })

  const response = await fetchWithRetry(`/api/guilds/${guildId}/posts?${params.toString()}`)

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.message || payload?.error || 'Failed to fetch posts for export')
  }

  return response.json() as Promise<PostsResponse>
}

export async function exportAllPostsMetricsWorkbook(
  guildId: string,
  filename: string
): Promise<{ recordCount: number; sheetCount: number }> {
  const rowsByPlatform: Record<PlatformKey, PostExportRow[]> = {
    instagram: [],
    tiktok: [],
    youtube: [],
    x: [],
  }

  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const data = await fetchPostsPage(guildId, page, POSTS_EXPORT_PAGE_LIMIT)
    for (const post of data.posts ?? []) {
      if (post.platform in rowsByPlatform) {
        rowsByPlatform[post.platform as PlatformKey].push(toPostExportRow(post))
      }
    }

    totalPages = Math.max(1, data.pagination?.total_pages ?? 1)
    page += 1
  }

  const sheets: PlatformSheet[] = PLATFORM_SHEETS
    .map(({ platform, name }) => ({ name, rows: rowsByPlatform[platform] }))
    .filter((sheet) => sheet.rows.length > 0)

  const recordCount = sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0)
  if (recordCount === 0) {
    throw new Error('No posts available to export')
  }

  const workbookBytes = buildWorkbookBytes(sheets)
  downloadXlsx(ensureXlsxFilename(filename), workbookBytes)

  return {
    recordCount,
    sheetCount: sheets.length,
  }
}
