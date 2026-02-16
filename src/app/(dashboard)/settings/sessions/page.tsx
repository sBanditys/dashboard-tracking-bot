'use client'

import { useState } from 'react'
import { useSessions, useRevokeSession, useLogoutAll } from '@/hooks/use-sessions'
import { SessionCard } from '@/components/sessions/session-card'
import { RevokeSessionDialog } from '@/components/sessions/revoke-session-dialog'
import { ParsedSession } from '@/types/session'
import { cn } from '@/lib/utils'

export default function SessionsPage() {
  const { sessions, isLoading } = useSessions();
  const revokeSession = useRevokeSession();
  const logoutAll = useLogoutAll();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'single' | 'all'>('single');
  const [sessionToRevoke, setSessionToRevoke] = useState<ParsedSession | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  // Sort sessions: current first, rest as-is (backend already sorted by createdAt desc)
  const sortedSessions = sessions
    ? [...sessions].sort((a, b) => {
        if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
        return 0;
      })
    : [];

  const handleRevokeClick = (session: ParsedSession) => {
    setSessionToRevoke(session);
    setDialogMode('single');
    setDialogOpen(true);
  };

  const handleLogoutAllClick = () => {
    setDialogMode('all');
    setDialogOpen(true);
  };

  const handleConfirmRevoke = () => {
    if (dialogMode === 'single' && sessionToRevoke) {
      if (sessionToRevoke.isCurrent) {
        // Current session revocation - redirect to login after success
        revokeSession.mutate(sessionToRevoke.id, {
          onSuccess: () => {
            setDialogOpen(false);
            window.location.href = '/login';
          },
        });
      } else {
        // Non-current session - animate out and remove
        setRemovingIds(prev => new Set(prev).add(sessionToRevoke.id));
        revokeSession.mutate(sessionToRevoke.id, {
          onSuccess: () => {
            setDialogOpen(false);
            setSessionToRevoke(null);
            // Clear from removingIds after animation completes
            setTimeout(() => {
              setRemovingIds(prev => {
                const next = new Set(prev);
                next.delete(sessionToRevoke.id);
                return next;
              });
            }, 300);
          },
          onError: () => {
            // Remove from animating set on error
            setRemovingIds(prev => {
              const next = new Set(prev);
              next.delete(sessionToRevoke.id);
              return next;
            });
          },
        });
      }
    } else if (dialogMode === 'all') {
      // Logout all - handled by the hook (redirects on success)
      logoutAll.mutate();
    }
  };

  const handleDialogClose = () => {
    if (!revokeSession.isPending && !logoutAll.isPending) {
      setDialogOpen(false);
      setSessionToRevoke(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Active Sessions ({sessions?.length || 0})
        </h1>
        <p className="text-gray-400 mt-1">
          Manage your active sessions across different devices. Sessions that you don&apos;t recognize can be revoked.
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-surface border border-border rounded-sm p-6 h-32"
            />
          ))}
        </div>
      )}

      {/* Session list */}
      {!isLoading && sortedSessions.length > 0 && (
        <div className="space-y-4">
          {sortedSessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                'transition-all duration-300 ease-in-out',
                removingIds.has(session.id)
                  ? 'opacity-0 scale-95 max-h-0 overflow-hidden'
                  : 'opacity-100 scale-100 max-h-96'
              )}
            >
              <SessionCard session={session} onRevoke={() => handleRevokeClick(session)} />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sessions && sessions.length === 0 && (
        <div className="bg-surface border border-border rounded-sm p-6">
          <p className="text-gray-400">No active sessions found.</p>
        </div>
      )}

      {/* Logout all devices section */}
      {sessions && sessions.length > 0 && (
        <div className="pt-6 border-t border-border">
          <button
            onClick={handleLogoutAllClick}
            className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/50 rounded-md transition-colors"
          >
            Logout All Devices
          </button>
          <p className="text-sm text-gray-500 mt-2">
            This will log you out of all devices including this one.
          </p>
        </div>
      )}

      {/* Revoke Session Dialog */}
      <RevokeSessionDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onConfirm={handleConfirmRevoke}
        mode={dialogMode}
        deviceName={sessionToRevoke?.device.name}
        browserInfo={
          sessionToRevoke
            ? `${sessionToRevoke.browser.name} ${sessionToRevoke.browser.version} on ${sessionToRevoke.os.name}`
            : undefined
        }
        isCurrent={sessionToRevoke?.isCurrent}
        sessionCount={sessions?.length}
        isLoading={revokeSession.isPending || logoutAll.isPending}
      />
    </div>
  );
}
