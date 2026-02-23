'use client';

import { AlertCircle } from 'lucide-react';

interface ConnectionIssuesBannerProps {
  /** Whether the polling query is currently in an error state */
  isError: boolean;
  /** Whether the query has previously succeeded (has data) — prevents showing on initial load failure */
  hasData: boolean;
}

/**
 * ConnectionIssuesBanner — shows an inline banner when a polling query fails
 * after previously succeeding (e.g., server 503 during background polling).
 *
 * Only visible when isError && hasData — this distinguishes transient polling
 * failures (show banner) from initial load failures (handled by error state).
 * Auto-dismisses when the parent stops passing isError=true.
 */
export function ConnectionIssuesBanner({ isError, hasData }: ConnectionIssuesBannerProps) {
  if (!isError || !hasData) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2.5 text-sm text-orange-300">
      <AlertCircle className="h-4 w-4 flex-shrink-0 text-orange-400" />
      <span>Connection issues &mdash; retrying...</span>
    </div>
  );
}
