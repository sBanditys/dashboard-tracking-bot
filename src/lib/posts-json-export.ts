import { fetchWithRetry } from '@/lib/fetch-with-retry'
import type { Post, PostsResponse } from '@/types/tracking'

const POSTS_EXPORT_PAGE_LIMIT = 200

type PlatformKey = Post['platform']

type PostExportRow = {
  Link: string
  Views: number | ''
  'Posted At': string
  Likes: number | ''
  Comments: number | ''
  Shares: number | ''
}

const PLATFORM_GROUPS: Array<{ platform: PlatformKey; key: string }> = [
  { platform: 'instagram', key: 'IG' },
  { platform: 'tiktok', key: 'TikTok' },
  { platform: 'youtube', key: 'YouTube' },
  { platform: 'x', key: 'X' },
]

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function toNumberOrEmpty(value: unknown): number | '' {
  return typeof value === 'number' && Number.isFinite(value) ? value : ''
}

function formatPostedAt(value: string | null): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return DATE_FORMATTER.format(parsed)
}

function toPostExportRow(post: Post): PostExportRow {
  return {
    Link: post.url ?? '',
    Views: toNumberOrEmpty(post.metrics?.views),
    'Posted At': formatPostedAt(post.posted_at ?? post.submitted_at ?? null),
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

function ensureJsonFilename(filename: string): string {
  const trimmed = filename.trim()
  if (!trimmed) {
    return `export_metrics_${Date.now()}.json`
  }

  const sanitized = trimmed
    .replace(/\.zip$/i, '')
    .replace(/\.csv$/i, '')
    .replace(/\.xlsx$/i, '')
    .replace(/\.json$/i, '')

  return `${sanitized}.json`
}

function downloadJson(filename: string, payload: unknown): void {
  const content = JSON.stringify(payload, null, 2)
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
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

export async function exportAllPostsMetricsJson(
  guildId: string,
  filename: string
): Promise<{ recordCount: number; platformCount: number }> {
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

  const grouped = PLATFORM_GROUPS
    .map(({ platform, key }) => ({
      key,
      rows: sortRowsByViewsDesc(rowsByPlatform[platform]),
    }))
    .filter((group) => group.rows.length > 0)

  const recordCount = grouped.reduce((sum, group) => sum + group.rows.length, 0)
  if (recordCount === 0) {
    throw new Error('No posts available to export')
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    totalRecords: recordCount,
    platforms: Object.fromEntries(grouped.map((group) => [group.key, group.rows])),
  }

  downloadJson(ensureJsonFilename(filename), payload)

  return {
    recordCount,
    platformCount: grouped.length,
  }
}
