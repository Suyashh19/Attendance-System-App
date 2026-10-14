import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useAuthStore } from '../../store/authStore';
import { Text } from '../../components/Text';
import { colors, shadow } from '../../constants/theme';

// The code screen is opened by a live session, not from the bar
const HIDDEN_ROUTES = ['attendance'];

/** Tab bar with a highlighted pill behind the active icon. */
function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  if (HIDDEN_ROUTES.includes(state.routes[state.index].name)) return null;

  return (
    <View
      className="flex-row bg-light-card rounded-t-[28px] px-3 pt-3"
      style={[shadow.raised, { paddingBottom: Math.max(insets.bottom, 10) + 4 }]}
    >
      {state.routes.map((route, index) => {
        if (HIDDEN_ROUTES.includes(route.name)) return null;

        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const tint = focused ? colors.primary : colors.subtle;
        const label = options.title ?? route.name;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            className="flex-1 items-center"
          >
            <View className={`w-16 h-9 rounded-full items-center justify-center ${focused ? 'bg-light-primaryBg' : 'bg-transparent'}`}>
              {options.tabBarIcon?.({ focused, color: tint, size: 22 })}
            </View>
            <Text
              className={`text-[11px] mt-1 ${focused ? 'font-bold' : 'font-semibold'}`}
              style={{ color: tint }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
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
    // Off on the attendance code screen, where a stray swipe would throw the student out mid-session
    .enabled(currentIndex !== -1)
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
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <Tabs
            tabBar={(props) => <TabBar {...props} />}
            // Every screen draws its own gradient header
            screenOptions={{ headerShown: false }}
          >
            <Tabs.Screen
              name="home"
              options={{
                title: 'Classes',
                tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? 'library' : 'library-outline'} size={size} color={color} />,
              }}
            />

            <Tabs.Screen
              name="attendance"
              options={{
                href: null,
                title: 'Active Session',
              }}
            />

            <Tabs.Screen
              name="history"
              options={{
                title: isFaculty ? 'Reports' : 'History',
                tabBarIcon: ({ color, focused, size }) => (
                  <Ionicons
                    name={isFaculty ? (focused ? 'bar-chart' : 'bar-chart-outline') : (focused ? 'time' : 'time-outline')}
                    size={size}
                    color={color}
                  />
                ),
              }}
            />

            <Tabs.Screen
              name="profile"
              options={{
                title: 'Profile',
                tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />,
              }}
            />
          </Tabs>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
