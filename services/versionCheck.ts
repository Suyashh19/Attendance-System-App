import { create } from 'zustand';
import axios from 'axios';
import { Linking } from 'react-native';
import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { BASE_URL } from './api';

export interface AppVersionInfo {
  latestVersion: string;
  latestVersionCode: number;
  minSupportedVersion: string;
  minSupportedVersionCode: number;
  forceUpdate: boolean;
  storeUrl: string;
  title: string;
  message: string;
  releaseNotes: string[];
}

export interface VersionCheckResult {
  isOutdated: boolean;
  isMandatory: boolean;
  currentVersion: string;
  currentVersionCode: number;
  info: AppVersionInfo | null;
}

export function isVersionOlder(current: string, target: string): boolean {
  const cParts = current.split('.').map((p) => parseInt(p, 10) || 0);
  const tParts = target.split('.').map((p) => parseInt(p, 10) || 0);
  const len = Math.max(cParts.length, tParts.length);
  for (let i = 0; i < len; i++) {
    const c = cParts[i] || 0;
    const t = tParts[i] || 0;
    if (c < t) return true;
    if (c > t) return false;
  }
  return false;
}

export function getCurrentAppVersion(): string {
  const isExpoGo =
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (isExpoGo) {
    return Constants.expoConfig?.version || '1.2.6';
  }
  return Application.nativeApplicationVersion || Constants.expoConfig?.version || '1.2.6';
}

export function getCurrentVersionCode(): number {
  const isExpoGo =
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (isExpoGo) {
    return Constants.expoConfig?.android?.versionCode || 13;
  }
  const codeStr = Application.nativeBuildVersion || String(Constants.expoConfig?.android?.versionCode || '13');
  const parsed = parseInt(codeStr, 10);
  return isNaN(parsed) ? 13 : parsed;
}

export async function fetchAppVersionInfo(): Promise<AppVersionInfo | null> {
  try {
    const response = await axios.get<AppVersionInfo>(`${BASE_URL}/app-version`, {
      timeout: 6000,
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    return response.data;
  } catch {
    // Fail silently so offline or poor connectivity never blocks regular app usage
    return null;
  }
}

export async function openAppStore(storeUrl?: string): Promise<void> {
  const targetUrl = storeUrl || 'https://play.google.com/store/apps/details?id=com.suyashpatil.attendance';
  const marketUrl = 'market://details?id=com.suyashpatil.attendance';
  try {
    const supported = await Linking.canOpenURL(marketUrl);
    if (supported) {
      await Linking.openURL(marketUrl);
      return;
    }
  } catch {
    // ignore and fall back to web link
  }

  try {
    await Linking.openURL(targetUrl);
  } catch (err) {
    console.warn('[VersionCheck] Could not open store URL:', err);
  }
}

interface AppUpdateState {
  isVisible: boolean;
  updateInfo: AppVersionInfo | null;
  isMandatory: boolean;
  isChecking: boolean;
  lastChecked: number | null;
  dismissedVersion: string | null;
  triggerCheck: (manual?: boolean) => Promise<VersionCheckResult>;
  dismiss: () => void;
  openStore: () => Promise<void>;
}

export const useAppUpdateStore = create<AppUpdateState>((set, get) => ({
  isVisible: false,
  updateInfo: null,
  isMandatory: false,
  isChecking: false,
  lastChecked: null,
  dismissedVersion: null,

  triggerCheck: async (manual = false) => {
    set({ isChecking: true });
    try {
      const currentVersion = getCurrentAppVersion();
      const currentVersionCode = getCurrentVersionCode();
      const info = await fetchAppVersionInfo();

      if (!info) {
        set({ isChecking: false, lastChecked: Date.now() });
        return {
          isOutdated: false,
          isMandatory: false,
          currentVersion,
          currentVersionCode,
          info: null,
        };
      }

      const codeOutdated = info.latestVersionCode > 0 && currentVersionCode < info.latestVersionCode;
      const semverOutdated = isVersionOlder(currentVersion, info.latestVersion);
      const isOutdated = codeOutdated || semverOutdated;

      const codeBelowMin = info.minSupportedVersionCode > 0 && currentVersionCode < info.minSupportedVersionCode;
      const semverBelowMin = isVersionOlder(currentVersion, info.minSupportedVersion);
      const isMandatory = info.forceUpdate || codeBelowMin || semverBelowMin;

      const previouslyDismissed = get().dismissedVersion === info.latestVersion;

      // Show update modal if outdated AND (is mandatory OR hasn't been dismissed in this session OR manual check)
      if (isOutdated && (isMandatory || !previouslyDismissed || manual)) {
        set({
          isVisible: true,
          updateInfo: info,
          isMandatory,
          isChecking: false,
          lastChecked: Date.now(),
        });
      } else {
        set({
          isChecking: false,
          lastChecked: Date.now(),
        });
      }

      return {
        isOutdated,
        isMandatory,
        currentVersion,
        currentVersionCode,
        info,
      };
    } catch {
      set({ isChecking: false, lastChecked: Date.now() });
      return {
        isOutdated: false,
        isMandatory: false,
        currentVersion: getCurrentAppVersion(),
        currentVersionCode: getCurrentVersionCode(),
        info: null,
      };
    }
  },

  dismiss: () => {
    const { updateInfo, isMandatory } = get();
    // Cannot dismiss if mandatory
    if (isMandatory) return;
    set({
      isVisible: false,
      dismissedVersion: updateInfo?.latestVersion || null,
    });
  },

  openStore: async () => {
    const { updateInfo } = get();
    await openAppStore(updateInfo?.storeUrl);
  },
}));
