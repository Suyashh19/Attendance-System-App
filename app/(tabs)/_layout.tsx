import { Tabs } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../hooks/useSocket';
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
  const user = useAuthStore(s => s.user);
  const isFaculty = user?.role === 'faculty';
  const queryClient = useQueryClient();

  // A leave request was sent or answered: refresh the lists, and the attendance an approval changed
  useSocket({
    onLeaveUpdated: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['subject-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
              title: isFaculty ? 'Reports' : 'Attendance',
              tabBarIcon: ({ color, focused, size }) => (
                <Ionicons
                  name={isFaculty ? (focused ? 'bar-chart' : 'bar-chart-outline') : (focused ? 'calendar' : 'calendar-outline')}
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
    </GestureHandlerRootView>
  );
}
