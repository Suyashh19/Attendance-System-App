import React from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { useDeviceId } from '../../hooks/useDeviceId';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const deviceId = useDeviceId();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          }
        },
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-dark" contentContainerStyle={{ padding: 16 }}>
      
      <View className="items-center py-8">
        <View className="w-24 h-24 bg-primary/20 rounded-full items-center justify-center mb-4 border-2 border-primary/30">
          <Text className="text-4xl font-bold text-primary">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text className="text-2xl font-bold text-white mb-1">{user?.name}</Text>
        <Text className="text-dark-muted font-medium bg-dark-card px-3 py-1 rounded-full border border-dark-border mt-2 text-xs uppercase tracking-wider">
          {user?.role} Account
        </Text>
      </View>

      <View className="bg-dark-card rounded-2xl border border-dark-border overflow-hidden mb-6 shadow-sm">
        
        <View className="p-4 border-b border-dark-border flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-[#0F172A] items-center justify-center mr-4">
            <Ionicons name="mail-outline" size={20} color="#64748B" />
          </View>
          <View className="flex-1">
            <Text className="text-dark-muted text-xs font-bold mb-1">EMAIL ADDRESS</Text>
            <Text className="text-white font-medium">{user?.email}</Text>
          </View>
        </View>

        <View className="p-4 flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-[#0F172A] items-center justify-center mr-4">
            <Ionicons name="hardware-chip-outline" size={20} color="#6366F1" />
          </View>
          <View className="flex-1">
            <Text className="text-primary text-xs font-bold mb-1">SECURE DEVICE ID</Text>
            <Text className="text-white font-medium text-xs font-mono" numberOfLines={1}>
              {deviceId || 'Loading...'}
            </Text>
            <Text className="text-dark-muted flex-wrap text-xs mt-2">
              This ID binds your attendance to this physical device to prevent proxy fraud.
            </Text>
          </View>
        </View>

      </View>

      <Button
        title="Sign Out"
        variant="danger"
        icon="log-out-outline"
        onPress={handleLogout}
        className="mt-4"
      />
      
      <Text className="text-center text-dark-muted text-xs mt-8">
        Attendance System v1.0.0
      </Text>

    </ScrollView>
  );
}
