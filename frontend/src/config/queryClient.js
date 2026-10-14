import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds default
      gcTime: 10 * 60 * 1000, // 10 minutes cache garbage collection
      refetchOnWindowFocus: false, // Prevent jarring refetches on window switch
      refetchOnReconnect: true,
      retry: 1, // Only 1 retry on network failure
    },
    mutations: {
      retry: 0, // Never automatically retry order or payment mutations
    },
  },
});

/**
 * Clears all cached queries when a user logs out or switches tenants/roles.
 * Ensures zero cross-tenant or cross-user data leakage.
 */
export const clearUserQueryCache = () => {
  queryClient.clear();
};

export default queryClient;
