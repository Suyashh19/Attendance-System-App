import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { useAuthStore } from '../store/authStore';

const DEVICE_ID_KEY = 'device_id';

export function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const setStoreDeviceId = useAuthStore((s) => s.setDeviceId);

  useEffect(() => {
    (async () => {
      try {
        let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
        if (!id) {
          // Generate a new UUID v4 and persist it
          id = Crypto.randomUUID();
          await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
        }
        setDeviceId(id);
        setStoreDeviceId(id);
      } catch {
        // Fallback: use timestamp-based ID
        const fallback = `dev_${Date.now()}`;
        setDeviceId(fallback);
        setStoreDeviceId(fallback);
      }
    })();
  }, [setStoreDeviceId]);

  return deviceId;
}
