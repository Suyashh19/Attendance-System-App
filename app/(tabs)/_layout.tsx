import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

export default function TabLayout() {
  return (
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
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
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
      
      {/* Attendance Tab is hidden from the bar. It's triggered by incoming events */}
      <Tabs.Screen
        name="attendance"
        options={{
          href: null, // Hides it from bottom tab bar
          title: 'Active Session',
          headerShown: false, // We use custom header in the screen
        }}
      />
      
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <Ionicons name="time" size={24} color={color} />,
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
  );
}
