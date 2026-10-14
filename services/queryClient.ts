import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { File, Paths } from 'expo-file-system';

// Cached data is kept for a day, so the app opens with the last subjects and history
// on screen while the (possibly sleeping) server answers in the background.
export const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      // Must outlive the persisted cache, or restored data is dropped straight away
      gcTime: CACHE_MAX_AGE,
      // One retry: the request timeout already covers a server waking up
      retry: 1,
    },
  },
});

// A file in the cache folder: expo-file-system is already in the app, so no new native module
function cacheFile(key: string) {
  return new File(Paths.cache, `${key}.json`);
}

const fileStorage = {
  getItem: async (key: string) => {
    try {
      const file = cacheFile(key);
      return file.exists ? await file.text() : null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      const file = cacheFile(key);
      if (!file.exists) file.create();
      file.write(value);
    } catch {
      // Not being able to cache only costs a fresh fetch next launch
    }
  },
  removeItem: async (key: string) => {
    try {
      const file = cacheFile(key);
      if (file.exists) file.delete();
    } catch {
      // Nothing to remove
    }
  },
};

export const queryPersister = createAsyncStoragePersister({
  storage: fileStorage,
  key: 'query-cache',
  throttleTime: 2000,
});

/** Forget every cached response, in memory and on disk (on logout, so the next user starts clean). */
export async function clearQueryCache(): Promise<void> {
  queryClient.clear();
  await queryPersister.removeClient();
}
