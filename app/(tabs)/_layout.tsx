import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  runOnJS 
} from 'react-native-reanimated';
import { useAuthStore } from '../../store/authStore';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore(s => s.user);
  const isFaculty = user?.role === 'faculty';

  // Define tab order for gesture navigation
  const tabs = ['/home', '/history', '/profile'];
  const currentIndex = tabs.findIndex(tab => pathname.includes(tab));

  const navigateToTab = (index: number) => {
    if (index >= 0 && index < tabs.length) {
      router.push(`/(tabs)${tabs[index]}` as any);
    }
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20]) // Avoid vertical scroll interference
    .onEnd((event) => {
      const { velocityX, translationX } = event;
      const swipeThreshold = 50;
      const velocityThreshold = 500;

      if (Math.abs(velocityX) > velocityThreshold || Math.abs(translationX) > swipeThreshold) {
        if (translationX > 0 && currentIndex > 0) {
          // Swipe Right (Finger moves right) -> Go Left (Previous Tab)
          runOnJS(navigateToTab)(currentIndex - 1);
        } else if (translationX < 0 && currentIndex < tabs.length - 1) {
          // Swipe Left (Finger moves left) -> Go Right (Next Tab)
          runOnJS(navigateToTab)(currentIndex + 1);
        }
      }
    });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={panGesture}>
        <View style={{ flex: 1 }}>
          <Tabs
            screenOptions={{
              headerShown: true,
              headerStyle: {
                backgroundColor: '#0F172A', // dark bg
                borderBottomWidth: 1,
                borderBottomColor: '#1E293B',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
              tabBarStyle: {
                backgroundColor: '#0F172A',
                borderTopWidth: 1,
                borderTopColor: '#1E293B',
                height: 75 + insets.bottom,
                paddingBottom: insets.bottom + 15,
                paddingTop: 12,
              },
              tabBarActiveTintColor: '#6366F1', // primary
              tabBarInactiveTintColor: '#64748B', // muted
            }}
          >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Classes',
          tabBarIcon: ({ color }) => <Ionicons name="library" size={24} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="attendance"
        options={{
          href: null,
          title: 'Active Session',
          headerShown: false,
        }}
      />
      
      <Tabs.Screen
        name="history"
        options={{
          title: isFaculty ? 'Reports' : 'History',
          tabBarIcon: ({ color }) => (
            <Ionicons 
              name={isFaculty ? "analytics" : "time"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
      </Tabs>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
