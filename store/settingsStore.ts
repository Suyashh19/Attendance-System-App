import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { setSemesterCalendar } from '../utils/academicYear';
import { DEFAULT_SETTINGS, parseSettings, type AppSettings } from '../utils/settings';

// Settings belong to the phone, not the account, so they survive signing out
const SETTINGS_KEY = 'app_settings';
const READ_TIMEOUT_MS = 3000;

interface SettingsStore extends AppSettings {
  hydrate: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,

  // Called once at start-up, before the first screen is drawn, so the right semester is already known
  hydrate: async () => {
    try {
      const raw = await Promise.race<string | null>([
        SecureStore.getItemAsync(SETTINGS_KEY),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), READ_TIMEOUT_MS)),
      ]);
      const saved = parseSettings(raw);
      setSemesterCalendar(saved.calendar);
      set(saved);
    } catch {
      // Unreadable storage just means the standard settings
    }
  },

  update: (patch) => {
    const { calendar, confirmStart, homeStart, sessionSeconds } = get();
    const next: AppSettings = { calendar, confirmStart, homeStart, sessionSeconds, ...patch };
    // The calendar is read by plain functions all over the app, so it is switched before anything re-draws
    setSemesterCalendar(next.calendar);
    set(next);
    SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(next)).catch(() => null);
  },

  reset: () => get().update(DEFAULT_SETTINGS),
}));
