import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User, AuthState } from '../types';
import { storeToken, clearToken, getStoredToken } from '../services/auth';
import { initSocket, disconnectSocket } from '../services/socket';

interface AuthStore extends AuthState {
  login: (token: string, user?: User) => Promise<void>;
  logout: () => Promise<void>;
  setDeviceId: (deviceId: string) => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  deviceId: null,
  isAuthenticated: false,

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
      const token = await getStoredToken();
      const deviceId = await SecureStore.getItemAsync('device_id');

      if (token) {
        // Set initial state from storage immediately to unblock UI
        set({
          token,
          deviceId: deviceId ?? null,
          isAuthenticated: true,
        });

        // Initialize socket
        initSocket(token);

        // Fetch user profile in background to update user data
        const { getProfile } = await import('../services/auth');
        try {
          const user = await getProfile();
          set({
            user: user.user ?? user,
          });
        } catch (err) {
          console.warn('[AuthStore] Session invalid or server slow during hydration:', err);
          // If we can't get the profile, we check if it was a 401
          // We don't necessarily logout immediately on network error, 
          // but if it's definitely unauthorized, we clear it.
          // Note: Axois interceptor already handles 401s by clearing token.
        }
      } else {
        set({ isAuthenticated: false });
      }
    } catch {
      set({ token: null, user: null, isAuthenticated: false });
    }
  },
}));
