import { fetchWithRetry } from '@/lib/fetch-with-retry'
import type { Post, PostsResponse } from '@/types/tracking'

const POSTS_EXPORT_PAGE_LIMIT = 200
const ZIP_MIME_TYPE = 'application/zip'
const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50
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

type ZipEntry = {
  name: string
  data: Uint8Array
}

type PlatformFile = {
  platform: PlatformKey
  fileSuffix: string
}

const PLATFORM_FILES: PlatformFile[] = [
  { platform: 'instagram', fileSuffix: 'ig' },
  { platform: 'tiktok', fileSuffix: 'tiktok' },
  { platform: 'youtube', fileSuffix: 'youtube' },
  { platform: 'x', fileSuffix: 'x' },
]

const CSV_HEADERS: Array<keyof PostExportRow> = [
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

function getRowViews(row: PostExportRow): number {
  return typeof row.Views === 'number' && Number.isFinite(row.Views) ? row.Views : -1
}

function sortRowsByViewsDesc(rows: PostExportRow[]): PostExportRow[] {
  return [...rows].sort((a, b) => getRowViews(b) - getRowViews(a))
}

function ensureZipBaseFilename(filename: string): string {
  const trimmed = filename.trim()
  if (!trimmed) {
    return `export_metrics_${Date.now()}`
  }
  return trimmed
    .replace(/\.zip$/i, '')
    .replace(/\.csv$/i, '')
    .replace(/\.xlsx$/i, '')
}

function escapeCsvValue(value: string | number | '' | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const stringValue = String(value)
  const needsQuotes =
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')

  if (!needsQuotes) {
    return stringValue
  }

  return `"${stringValue.replace(/"/g, '""')}"`
}

function rowsToCsv(rows: PostExportRow[]): string {
  const csvLines: string[] = [
    CSV_HEADERS.map((header) => escapeCsvValue(header)).join(','),
    ...rows.map((row) => CSV_HEADERS.map((header) => escapeCsvValue(row[header])).join(',')),
  ]
  return '\uFEFF' + csvLines.join('\n')
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
    const fileNameBytes = textEncoder.encode(entry.name)
    const entryCrc32 = crc32(entry.data)

    const localHeader = new Uint8Array(30 + fileNameBytes.length)
    const localHeaderView = new DataView(localHeader.buffer)
    localHeaderView.setUint32(0, ZIP_LOCAL_FILE_HEADER_SIGNATURE, true)
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

function downloadZip(filename: string, bytes: Uint8Array): void {
  const blobBytes = new Uint8Array(bytes.byteLength)
  blobBytes.set(bytes)
  const blob = new Blob([blobBytes], { type: ZIP_MIME_TYPE })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function fetchPostsPage(guildId: string, cursor: string | null, limit: number): Promise<PostsResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
  })
  if (cursor) params.set('cursor', cursor)

  const response = await fetchWithRetry(`/api/guilds/${guildId}/posts?${params.toString()}`)

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.message || payload?.error || 'Failed to fetch posts for export')
  }

  return response.json() as Promise<PostsResponse>
}

export async function exportAllPostsMetricsCsv(
  guildId: string,
  filename: string
): Promise<{ recordCount: number; fileCount: number }> {
  const rowsByPlatform: Record<PlatformKey, PostExportRow[]> = {
    instagram: [],
    tiktok: [],
    youtube: [],
    x: [],
  }

  let cursor: string | null = null
  let hasMore = true

  while (hasMore) {
    const data = await fetchPostsPage(guildId, cursor, POSTS_EXPORT_PAGE_LIMIT)
    for (const post of data.posts ?? []) {
      if (post.platform in rowsByPlatform) {
        rowsByPlatform[post.platform as PlatformKey].push(toPostExportRow(post))
      }
    }

    hasMore = data.has_more
    cursor = data.next_cursor
  }

  const files = PLATFORM_FILES
    .map(({ platform, fileSuffix }) => ({
      fileSuffix,
      rows: sortRowsByViewsDesc(rowsByPlatform[platform]),
    }))
    .filter((file) => file.rows.length > 0)

  const recordCount = files.reduce((sum, file) => sum + file.rows.length, 0)
  if (recordCount === 0) {
    throw new Error('No posts available to export')
  }

  const baseFilename = ensureZipBaseFilename(filename)
  const zipEntries: ZipEntry[] = files.map((file) => ({
    name: `${baseFilename}-${file.fileSuffix}.csv`,
    data: textEncoder.encode(rowsToCsv(file.rows)),
  }))

  const zipBytes = createZip(zipEntries)
  downloadZip(`${baseFilename}.zip`, zipBytes)

  return {
    recordCount,
    fileCount: files.length,
  }
}
