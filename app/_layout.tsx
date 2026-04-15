import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View } from 'react-native';

import '../global.css';

const queryClient = new QueryClient();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => null);

function AuthRedirectHandler() {
 const { isAuthenticated, isHydrated } = useAuthStore();
 const segments = useSegments();
 const router = useRouter();
 const navigationState = useRootNavigationState();

 useEffect(() => {
 // Wait until navigation is mounted and auth state is hydrated
 if (!navigationState?.key || !isHydrated) return;

 const inAuthGroup = segments[0] === '(auth)';
 const isForgotPassword = segments[segments.length - 1] === 'forgot-password';

 if (!isAuthenticated && !inAuthGroup) {
 if (segments[segments.length - 1] !== 'login') {
 const timer = setTimeout(() => {
 router.replace('/(auth)/login');
 }, 1);
 return () => clearTimeout(timer);
 }
 } else if (isAuthenticated && inAuthGroup && !isForgotPassword) {
 const timer = setTimeout(() => {
 router.replace('/(tabs)/home');
 }, 1);
 return () => clearTimeout(timer);
 }
 }, [isAuthenticated, segments, navigationState?.key, isHydrated]);

 return null;
}

function RootLayoutNav() {
 return (
 <ThemeProvider value={DefaultTheme}>
 <AuthRedirectHandler />
 <Stack screenOptions={{ headerShown: false }}>
 <Stack.Screen name="(auth)" options={{ headerShown: false }} />
 <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
 <Stack.Screen name="index" options={{ headerShown: false }} />
 </Stack>
 </ThemeProvider>
 );
}

export default function RootLayout() {
 const [isReady, setIsReady] = useState(false);
 const { hydrate } = useAuthStore();

 useEffect(() => {
 async function init() {
 try {
 await hydrate();
 } catch (err) {
 console.warn('[RootLayout] Hydration error:', err);
 } finally {
 setIsReady(true);
 // Hide splash screen only after hydration
 SplashScreen.hideAsync().catch(() => null);
 }
 }
 init();
 }, [hydrate]);

 if (!isReady) {
 return null;
 }

 return (
 <View className="flex-1">
 <QueryClientProvider client={queryClient}>
 <RootLayoutNav />
 </QueryClientProvider>
 </View>
 );
}
