import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
// import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, ActivityIndicator } from 'react-native';

import '../global.css';

const queryClient = new QueryClient();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const fontsLoaded = true;

  const { isAuthenticated, hydrate } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  
  const segments = useSegments();
  const router = useRouter();

  // Root initialization
  useEffect(() => {
    async function init() {
      // Failsafe: Continue after 10 seconds even if hydrate is stuck
      const timeout = setTimeout(() => {
        if (!isReady) {
          console.warn('[RootLayout] Hydration took too long, forcing ready state');
          setIsReady(true);
          SplashScreen.hideAsync();
        }
      }, 10000);

      try {
        await hydrate();
      } finally {
        clearTimeout(timeout);
        setIsReady(true);
      }
    }
    init();
  }, [hydrate]);

  // Handle routing based on Auth state
  useEffect(() => {
    if (!isReady || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Not logged in -> Redirect to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Logged in but trying to access auth -> Redirect home
      router.replace('/(tabs)/home');
    }
    
    // Hide splash screen once we've decided where to route
    SplashScreen.hideAsync();
  }, [isAuthenticated, isReady, fontsLoaded, segments, router]);

  if (!isReady || !fontsLoaded) {
    return (
      <View className="flex-1 bg-dark items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={DarkTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
