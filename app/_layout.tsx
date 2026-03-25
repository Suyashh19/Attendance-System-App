import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
// import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, ActivityIndicator } from 'react-native';

import '../global.css';

const queryClient = new QueryClient();

// Prevent the splash screen from auto-hiding before asset loading is complete.
// SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const fontsLoaded = true;

  const { isAuthenticated, hydrate } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  
  const segments = useSegments();
  const router = useRouter();

  // Failsafe: Continue after 8 seconds even if hydration is stuck
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isReady) {
        console.warn('[RootLayout] Initialization timeout reached');
        setIsReady(true);
        SplashScreen.hideAsync().catch(() => null);
      }
    }, 8000);
    return () => clearTimeout(timeout);
  }, [isReady]);

  // Root initialization
  useEffect(() => {
    let mounted = true;
    
    async function init() {
      try {
        // Hydrate auth state from disk
        await hydrate();
      } catch (err) {
        console.error('[RootLayout] Hydration error:', err);
      } finally {
        if (mounted) {
          setIsReady(true);
        }
      }
    }

    init();
    return () => { mounted = false; };
  }, [hydrate]);

  const onLayoutRootView = useCallback(async () => {
    if (isReady && fontsLoaded) {
      await SplashScreen.hideAsync().catch(() => null);
    }
  }, [isReady, fontsLoaded]);

  // Handle routing based on Auth state
  useEffect(() => {
    if (!isReady || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, isReady, fontsLoaded, segments, router]);

  if (!isReady || !fontsLoaded) {
    return null; // Return null so onLayout triggers on the subsequent render
  }

  return (
    <View className="flex-1" onLayout={onLayoutRootView}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={DarkTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </View>
  );
}
