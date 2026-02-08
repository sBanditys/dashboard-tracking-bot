'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GuildError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Guild error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 text-center">
        <svg
          className="mx-auto mb-6 h-12 w-12 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h1 className="mb-4 text-2xl font-semibold text-text-primary">
          Guild Error
        </h1>
        <p className="mb-6 text-sm text-text-secondary">
          {error.message || 'Failed to load guild data. Please try again.'}
        </p>
        <button
          onClick={reset}
          className="w-full rounded-md bg-accent-purple px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-purple/90"
        >
          Try Again
        </button>
        <Link
          href="/guilds"
          className="mt-4 inline-block text-sm text-accent-purple hover:text-accent-purple/90"
        >
          Back to Guilds
        </Link>
      </div>
    </div>
  );
}
