import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
 useFonts,
 PlusJakartaSans_400Regular,
 PlusJakartaSans_500Medium,
 PlusJakartaSans_600SemiBold,
 PlusJakartaSans_700Bold,
 PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { colors } from '../constants/theme';
import { queryClient, queryPersister, CACHE_MAX_AGE } from '../services/queryClient';
import { warmUpServer } from '../services/api';
import { ServerWakeBanner } from '../components/ServerWakeBanner';
import { DialogHost } from '../components/DialogHost';

import '../global.css';

// Wake the free-tier server while the splash screen is still up
warmUpServer();

// Same page colour behind every screen, so nothing flashes white during transitions
const appTheme = {
 ...DefaultTheme,
 colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.card, text: colors.text, border: colors.border, primary: colors.primary },
};

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
 <ThemeProvider value={appTheme}>
 <AuthRedirectHandler />
 <Stack screenOptions={{ headerShown: false }}>
 <Stack.Screen name="(auth)" options={{ headerShown: false }} />
 <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
 <Stack.Screen name="index" options={{ headerShown: false }} />
 <Stack.Screen name="subject/[id]" options={{ animation: 'slide_from_right' }} />
 <Stack.Screen name="lecture-detail" options={{ animation: 'slide_from_right' }} />
 <Stack.Screen name="leave" options={{ animation: 'slide_from_right' }} />
 </Stack>
 </ThemeProvider>
 );
}

export default function RootLayout() {
 const [isReady, setIsReady] = useState(false);
 const { hydrate } = useAuthStore();
 // If the fonts fail to load the app still opens, in the system font
 const [fontsLoaded, fontError] = useFonts({
 PlusJakartaSans_400Regular,
 PlusJakartaSans_500Medium,
 PlusJakartaSans_600SemiBold,
 PlusJakartaSans_700Bold,
 PlusJakartaSans_800ExtraBold,
 });
 const fontsReady = fontsLoaded || !!fontError;

 useEffect(() => {
 async function init() {
 try {
 await hydrate();
 } catch (err) {
 console.warn('[RootLayout] Hydration error:', err);
 } finally {
 setIsReady(true);
 }
 }
 init();
 }, [hydrate]);

 // Hide the splash screen only after hydration, and once the fonts are in
 useEffect(() => {
 if (isReady && fontsReady) SplashScreen.hideAsync().catch(() => null);
 }, [isReady, fontsReady]);

 if (!isReady || !fontsReady) {
 return null;
 }

 return (
 <View className="flex-1 bg-light">
 <StatusBar style="light" />
 <PersistQueryClientProvider
 client={queryClient}
 persistOptions={{ persister: queryPersister, maxAge: CACHE_MAX_AGE }}
 >
 <RootLayoutNav />
 </PersistQueryClientProvider>
 <ServerWakeBanner />
 <DialogHost />
 </View>
 );
}
