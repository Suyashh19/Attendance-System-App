import { Tabs } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../hooks/useSocket';
import { Text } from '../../components/Text';
import { colors, shadow } from '../../constants/theme';
import { TourTarget } from '../../components/onboarding/TourTarget';
import { useOnboardingStore } from '../../store/onboardingStore';

// The code screen is opened by a live session, not from the bar
const HIDDEN_ROUTES = ['attendance'];

/** Tab bar with a highlighted pill behind the active icon. */
function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const isFaculty = useAuthStore(s => s.user?.role === 'faculty');
  if (HIDDEN_ROUTES.includes(state.routes[state.index].name)) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        elevation: 8,
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        paddingBottom: Math.max(insets.bottom, 10),
        paddingTop: 6,
      }}
    >
      <View
        className="flex-row items-center justify-around px-2 py-2"
        style={{
          backgroundColor: '#F7F5FC',
          borderRadius: 36,
          borderWidth: 1,
          borderColor: 'rgba(89, 56, 183, 0.08)',
          shadowColor: '#17132B',
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}
      >
        {state.routes.map((route, index) => {
          if (HIDDEN_ROUTES.includes(route.name)) return null;

          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const tint = focused ? '#5938B7' : '#858194';
          const label = options.title ?? route.name;

          const isReportsTab = isFaculty && route.name === 'history';

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            if (isReportsTab && useOnboardingStore.getState().isActive) {
              useOnboardingStore.getState().advanceActionStep('navigate_to_reports');
            }
          };

          const tabContent = (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              android_ripple={{ color: 'transparent' }}
              style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
            >
              <View
                style={{
                  width: 76,
                  height: 46,
                  borderRadius: 23,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: focused ? '#EAE5F8' : 'transparent',
                  overflow: 'hidden',
                }}
              >
                {options.tabBarIcon?.({ focused, color: tint, size: 20 })}
                <Text
                  className={`text-[10.5px] mt-0.5 ${focused ? 'font-bold' : 'font-semibold'}`}
                  style={{ color: tint }}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </View>
            </Pressable>
          );

          if (isReportsTab) {
            return (
              <TourTarget
                key={route.key}
                targetKey="tour_reports_tab"
                borderRadius={28}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                {tabContent}
              </TourTarget>
            );
          }

          return (
            <View key={route.key} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              {tabContent}
            </View>
          );
        })}
      </View>
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
      queryClient.invalidateQueries({ queryKey: ['pending-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        // Every screen draws its own gradient header
        screenOptions={{
          headerShown: false,
          tabBarPosition: 'bottom',
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
          },
        }}
      >
          <Tabs.Screen
            name="home"
            options={{
              title: 'Subjects',
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
  );
}
