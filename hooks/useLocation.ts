import { useCallback, useRef, useState } from 'react';
import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

interface UseLocationReturn {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  getLocation: () => Promise<LocationData | null>;
}

const CACHE_TTL_MS = 30_000; // 30 seconds

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  const getLocation = useCallback(async (): Promise<LocationData | null> => {
    // Return cached location if fresh
    const now = Date.now();
    if (location && now - lastFetchRef.current < CACHE_TTL_MS) {
      return location;
    }

    setLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied. Please enable location access in settings.');
      }

      // Try last known location first (fast)
      const last = await Location.getLastKnownPositionAsync({ maxAge: CACHE_TTL_MS });
      if (last) {
        const data: LocationData = {
          latitude: last.coords.latitude,
          longitude: last.coords.longitude,
          accuracy: last.coords.accuracy,
          timestamp: last.timestamp,
        };
        lastFetchRef.current = now;
        setLocation(data);
        setLoading(false);
        return data;
      }

      // Fall back to fresh GPS
      const fresh = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const data: LocationData = {
        latitude: fresh.coords.latitude,
        longitude: fresh.coords.longitude,
        accuracy: fresh.coords.accuracy,
        timestamp: fresh.timestamp,
      };
      lastFetchRef.current = now;
      setLocation(data);
      setLoading(false);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get location';
      setError(message);
      setLoading(false);
      return null;
    }
  }, [location]);

  return { location, loading, error, getLocation };
}
