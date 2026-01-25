'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User } from '@/types/user';

/**
 * Hook to fetch and manage current user session
 */
export function useUser() {
  const query = useQuery<User>({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await fetch('/api/user');

      if (!response.ok) {
        throw new Error('Not authenticated');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry auth failures
  });

  return {
    user: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

/**
 * Hook to handle user logout
 */
export function useLogout() {
  const queryClient = useQueryClient();

  const logout = async () => {
    try {
      // Call logout endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
      });

      // Clear React Query cache
      queryClient.removeQueries();

      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Still redirect even on error
      window.location.href = '/login';
    }
  };

  return { logout };
}
