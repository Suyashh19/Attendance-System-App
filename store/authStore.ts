import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User, AuthState } from '../types';
import { storeToken, clearToken, getStoredToken } from '../services/auth';
import { initSocket, disconnectSocket } from '../services/socket';

const ABORT_TIMEOUT = 3000; // 3 seconds timeout for disk storage

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

interface AuthStore extends AuthState {
  login: (token: string, user?: User) => Promise<void>;
  logout: () => Promise<void>;
  setDeviceId: (deviceId: string) => void;
  hydrate: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  deviceId: null,
  isAuthenticated: false,
  isHydrated: false,

  login: async (token: string, user?: User) => {
    await storeToken(token);
    // Initialize socket on login
    initSocket(token);

    let finalUser = user;
    if (!finalUser) {
      try {
        const { getProfile } = await import('../services/auth');
        const profile = await getProfile();
        finalUser = profile.user ?? profile;
      } catch (err) {
        console.error('Failed to fetch user profile after login', err);
      }
    }

    set({ token, user: finalUser, isAuthenticated: true });
  },

  logout: async () => {
    await clearToken();
    await SecureStore.deleteItemAsync('device_id').catch(() => null);
    disconnectSocket();
    set({ token: null, user: null, isAuthenticated: false, deviceId: null });
  },

  setDeviceId: (deviceId: string) => {
    set({ deviceId });
  },

  hydrate: async () => {
    try {
      // Use timeout to prevent hanging on SecureStore (can happen in APK if Keystore is slow)
      const token = await withTimeout(getStoredToken(), ABORT_TIMEOUT).catch(() => null);
      const deviceId = await withTimeout(SecureStore.getItemAsync('device_id'), ABORT_TIMEOUT).catch(() => null);

      if (token) {
        set({
          token,
          deviceId: deviceId ?? null,
          isAuthenticated: true,
        });

        // Initialize socket (async, non-blocking)
        initSocket(token);

        // Fetch user profile in background without awaiting the entire hydration
        (async () => {
          try {
            const { getProfile } = await import('../services/auth');
            const user = await getProfile();
            set({
              user: user.user ?? user,
            });
          } catch (err) {
            console.warn('[AuthStore] Background profile update failed:', err);
          }
        })();
      } else {
        set({ isAuthenticated: false });
      }
    } finally {
      set({ isHydrated: true });
    }
  },
  setUser: (user: User) => {
    set({ user });
  },
}));
