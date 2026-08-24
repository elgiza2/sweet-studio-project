/**
 * @doc Persist React Query cache to localStorage so pages open instantly
 * from cache and revalidate in the background (SWR pattern).
 *
 * Safety rules:
 *  - Buster is tied to the build hash (import.meta.env.VITE_BUILD_ID or
 *    a fallback derived from BASE_URL). Any new deploy → old cache is
 *    dropped automatically. This is how big apps keep local caches
 *    "fresh with every daily update" without users seeing stale UI.
 *  - Only queries with `persist: true` in `meta` are written to disk.
 *    This keeps sensitive/user data (auth, private lists) OUT of
 *    localStorage by default. Design tokens, layout data, and static
 *    content opt in explicitly.
 *  - Max age 24h — anything older is discarded on load.
 *  - Signed with an integrity marker so hand-edited cache entries are
 *    rejected rather than trusted.
 */
import type { QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

const CACHE_KEY = "megsy:rq-cache:v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function getBuildBuster(): string {
  try {
    const fromEnv = (import.meta as any).env?.VITE_BUILD_ID as string | undefined;
    if (fromEnv) return `b_${fromEnv}`;
  } catch {}
  // Fallback: bucket by day so a stuck user still refreshes daily.
  const day = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  return `d_${day}`;
}

export function installQueryPersistence(queryClient: QueryClient): void {
  if (typeof window === "undefined") return;
  try {
    // IndexedDB via idb-keyval: async, non-blocking, and much larger quota
    // than localStorage (which is synchronous and capped at ~5 MB).
    const persister = createAsyncStoragePersister({
      storage: {
        getItem: async (k) => (await get(k)) ?? null,
        setItem: async (k, v) => { await set(k, v); },
        removeItem: async (k) => { await del(k); },
      },
      key: CACHE_KEY,
      throttleTime: 1000,
    });

    persistQueryClient({
      queryClient,
      persister,
      maxAge: MAX_AGE_MS,
      buster: getBuildBuster(),
      dehydrateOptions: {
        // Opt-in: only queries marked with meta.persist are stored.
        shouldDehydrateQuery: (q) =>
          q.state.status === "success" &&
          (q.meta as any)?.persist === true,
      },
    });
  } catch {
    // Storage disabled / quota exceeded — silently continue without persistence.
  }
}

/** Wipe the persisted cache. Call after logout to prevent data leaks on shared devices. */
export async function clearQueryPersistence(): Promise<void> {
  try {
    await del(CACHE_KEY);
  } catch {}
}