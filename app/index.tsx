import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
 const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

 // This root index file is mandatory for Expo Router to match the "/" route.
 // We use a Redirect for a smooth transition to the appropriate group.
 if (isAuthenticated) {
 return <Redirect href="/(tabs)/home" />;
 }

 return <Redirect href="/(auth)/login" />;
}
