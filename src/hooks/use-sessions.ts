'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithRetry } from '@/lib/fetch-with-retry';
import { ParsedSession } from '@/types/session';
import { toast } from 'sonner';

/**
 * Hook to fetch active sessions for the current user
 *
 * Fetches session data with server-side parsed device/browser/OS information.
 * Auto-refetches every 60 seconds for background updates.
 */
export function useSessions() {
  const query = useQuery<ParsedSession[]>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const response = await fetchWithRetry('/api/auth/sessions');

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data = await response.json();
      return data.sessions;
    },
    staleTime: 30 * 1000, // 30 seconds - sessions change infrequently but need reasonable freshness
    refetchInterval: 60 * 1000, // Refetch every 60 seconds for background updates
  });

  return {
    sessions: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook to revoke a specific session by ID
 *
 * Invalidates the sessions cache on success.
 * Shows error toast on failure.
 */
export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetchWithRetry(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke session');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate sessions query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: () => {
      toast.error('Failed to revoke session');
    },
  });
}

/**
 * Hook to logout from all devices
 *
 * Clears all React Query cache and redirects to login page on success.
 * Shows error toast on failure.
 */
export function useLogoutAll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetchWithRetry('/api/auth/logout-all', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to logout from all devices');
      }

      return response.json();
    },
    onSuccess: () => {
      // Clear all React Query cache
      queryClient.removeQueries();

      // Redirect to login (full page redirect to clear all state)
      window.location.href = '/login';
    },
    onError: () => {
      toast.error('Failed to logout from all devices');
    },
  });
}
