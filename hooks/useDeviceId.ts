import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { useAuthStore } from '../store/authStore';

const DEVICE_ID_KEY = 'device_id';

export function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const setStoreDeviceId = useAuthStore((s) => s.setDeviceId);

  useEffect(() => {
    (async () => {
      try {
        let hardwareId: string | null = null;
        
        // 1. Try to fetch the physical hardware ID bound to this device
        if (Platform.OS === 'android') {
          hardwareId = Application.getAndroidId();
        } else if (Platform.OS === 'ios') {
          hardwareId = await Application.getIosIdForVendorAsync();
        }

        if (hardwareId) {
          setDeviceId(hardwareId);
          setStoreDeviceId(hardwareId);
          // Persist it into SecureStore strictly as a fallback measure
          await SecureStore.setItemAsync(DEVICE_ID_KEY, hardwareId).catch(() => null);
          return;
        }

        // 2. Original Fallback: auto-generate our own UUID and firmly root it in keystore
        let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
        if (!id) {
          id = Crypto.randomUUID();
          await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
        }
        setDeviceId(id);
        setStoreDeviceId(id);
      } catch (err) {
        console.error('[useDeviceId] Failed to fetch device ID:', err);
        // 3. Absolute fallback (Time-based session mock)
        const fallback = `dev_${Date.now()}`;
        setDeviceId(fallback);
        setStoreDeviceId(fallback);
      }
    })();
  }, [setStoreDeviceId]);

  return deviceId;
}
