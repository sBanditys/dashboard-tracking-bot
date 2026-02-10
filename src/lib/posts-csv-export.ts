import { downloadCsv } from '@/lib/csv-download'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import type { Post, PostsResponse } from '@/types/tracking'

const POSTS_EXPORT_PAGE_LIMIT = 200

type PostExportRow = {
  Link: string
  Views: number | ''
  'Posted At': string
  Likes: number | ''
  Comments: number | ''
  Shares: number | ''
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

function ensureCsvFilename(filename: string): string {
  const trimmed = filename.trim()
  if (!trimmed) {
    return `export_metrics_${Date.now()}.csv`
  }
  return trimmed.toLowerCase().endsWith('.csv') ? trimmed : `${trimmed}.csv`
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

export async function exportAllPostsMetricsCsv(guildId: string, filename: string): Promise<number> {
  const rows: PostExportRow[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const data = await fetchPostsPage(guildId, page, POSTS_EXPORT_PAGE_LIMIT)
    const pageRows = (data.posts ?? []).map(toPostExportRow)
    rows.push(...pageRows)

    totalPages = Math.max(1, data.pagination?.total_pages ?? 1)
    page += 1
  }

  if (rows.length === 0) {
    throw new Error('No posts available to export')
  }

  downloadCsv(ensureCsvFilename(filename), rows)
  return rows.length
}
