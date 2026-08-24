import { QueryClient } from "@tanstack/react-query";
import { installQueryPersistence } from "@/lib/queryPersist";

/**
 * Single app-wide query client. Cached data stays fresh for 5 minutes and in
 * memory for 30 minutes so navigation between pages doesn't flash loaders.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

// Persist opt-in queries to localStorage so pages open instantly from cache
// while revalidating in the background. Cache auto-busts on every new build.
installQueryPersistence(queryClient);
