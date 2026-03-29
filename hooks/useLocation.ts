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
  getHighAccuracyPosition: (onStatusChange?: (status: string) => void) => Promise<LocationData | null>;
  getHybridPosition: () => Promise<LocationData | null>;
}

const CACHE_TTL_MS = 120_000; // 2 minutes for stale check

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  const getLocation = useCallback(async (): Promise<LocationData | null> => {
    // Basic wrapper for backward compatibility or simple fetches
    const now = Date.now();
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission denied');
      
      const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const data: LocationData = {
        latitude: fresh.coords.latitude,
        longitude: fresh.coords.longitude,
        accuracy: fresh.coords.accuracy,
        timestamp: fresh.timestamp,
      };
      setLocation(data);
      lastFetchRef.current = now;
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Faculty Strategy: High Accuracy (<= 30m) with 3 retries
   */
  const getHighAccuracyPosition = useCallback(async (onStatusChange?: (status: string) => void): Promise<LocationData | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission denied');

      for (let attempt = 1; attempt <= 3; attempt++) {
        if (onStatusChange) onStatusChange(attempt > 1 ? `Improving accuracy (Attempt ${attempt}/3)...` : 'Fetching primary location...');
        
        const fresh = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });

        const data: LocationData = {
          latitude: fresh.coords.latitude,
          longitude: fresh.coords.longitude,
          accuracy: fresh.coords.accuracy,
          timestamp: fresh.timestamp,
        };

        if (data.accuracy && data.accuracy <= 30) {
          setLocation(data);
          return data;
        }

        if (attempt < 3) {
          // Wait 1s before retry to allow GPS to settle
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // Final attempt reached (3). Return the best available regardless of accuracy (>30m).
          setLocation(data);
          return data;
        }
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'High accuracy fetch failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Student Strategy: Hybrid GPS (Cached vs Fresh with 3s timeout)
   */
  const getHybridPosition = useCallback(async (): Promise<LocationData | null> => {
    setLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission denied');

      const now = Date.now();

      // 1. Check last known position (Cached)
      const last = await Location.getLastKnownPositionAsync({ maxAge: CACHE_TTL_MS });
      if (last) {
        const age = now - last.timestamp;
        const acc = last.coords.accuracy || 999;
        
        // Use cached if it's fresh enough (2 min) and accurate enough (50m)
        if (age <= CACHE_TTL_MS && acc <= 50) {
          const data: LocationData = {
            latitude: last.coords.latitude,
            longitude: last.coords.longitude,
            accuracy: last.coords.accuracy,
            timestamp: last.timestamp,
          };
          setLocation(data);
          return data;
        }
      }

      // 2. Fetch fresh GPS in parallel with a 3-second limit
      return await new Promise<LocationData | null>((resolve) => {
        let resolved = false;

        // Fresh GPS call
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
          .then((fresh) => {
            if (resolved) return;
            resolved = true;
            const data: LocationData = {
              latitude: fresh.coords.latitude,
              longitude: fresh.coords.longitude,
              accuracy: fresh.coords.accuracy,
              timestamp: fresh.timestamp,
            };
            setLocation(data);
            resolve(data);
          })
          .catch(() => {
            if (resolved) return;
            resolved = true;
            resolve(null);
          });

        // 3-second timeout fallback
        setTimeout(async () => {
          if (resolved) return;
          resolved = true;
          
          // Fallback to best available if fresh GPS is too slow
          const bestAvailable = await Location.getLastKnownPositionAsync();
          if (bestAvailable) {
            const data: LocationData = {
              latitude: bestAvailable.coords.latitude,
              longitude: bestAvailable.coords.longitude,
              accuracy: bestAvailable.coords.accuracy,
              timestamp: bestAvailable.timestamp,
            };
            setLocation(data);
            resolve(data);
          } else {
            resolve(null);
          }
        }, 3000);
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hybrid fetch failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { location, loading, error, getLocation, getHighAccuracyPosition, getHybridPosition };
}
