import React, { useState } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getAttendanceHistory } from '../../services/attendance';
import { HistoryItem } from '../../components/HistoryItem';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import type { AttendanceRecord } from '../../types';

export default function HistoryScreen() {
  const { data: history = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['history'],
    queryFn: getAttendanceHistory,
  });

  const user = useAuthStore((s) => s.user);

  // Stats calculation
  const total = history.length;
  const present = history.filter((r) => r.status === 'PRESENT').length;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  if (isLoading) {
    return (
      <View className="flex-1 bg-dark items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const renderHeader = () => (
    <View className="mb-6">
      <View className="flex-row justify-between items-end mb-6">
        <View>
          <Text className="text-3xl font-bold text-white mb-1">History</Text>
          <Text className="text-dark-muted text-base">Your attendance records.</Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View className="flex-row justify-between mb-4">
        
        <View className="w-[48%] bg-dark-card p-4 rounded-3xl border border-dark-border shadow-sm">
          <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center mb-3">
            <Ionicons name="pie-chart" size={20} color="#6366F1" />
          </View>
          <Text className="text-white text-3xl font-black mb-1">{percentage}%</Text>
          <Text className="text-dark-muted font-bold text-xs tracking-wider">TOTAL RATE</Text>
        </View>

        <View className="w-[48%] flex-col justify-between">
          <View className="bg-success/10 p-3 rounded-2xl border border-success/20 flex-row items-center mb-3 flex-1 px-4">
            <Ionicons name="checkmark-circle" size={18} color="#10B981" className="mr-3" />
            <View>
              <Text className="text-success font-bold text-lg">{present}</Text>
              <Text className="text-success/70 text-xs font-bold">PRESENT</Text>
            </View>
          </View>
          
          <View className="bg-danger/10 p-3 rounded-2xl border border-danger/20 flex-row items-center flex-1 px-4">
            <Ionicons name="close-circle" size={18} color="#EF4444" className="mr-3" />
            <View>
              <Text className="text-danger font-bold text-lg">{total - present}</Text>
              <Text className="text-danger/70 text-xs font-bold">MISSED</Text>
            </View>
          </View>
        </View>

      </View>
      <Text className="text-white font-bold text-lg mt-4 mb-2">Recent Records</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-dark">
      <FlatList
        data={history}
        keyExtractor={(item) => item.id || item.sessionId + item.markedAt}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center mt-10 p-6">
            <Ionicons name="document-text-outline" size={64} color="#334155" className="mb-4" />
            <Text className="text-dark-muted font-medium text-lg text-center">
              {isError 
                ? 'Failed to load history' 
                : 'No attendance records found yet.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => <HistoryItem record={item} />}
      />
    </View>
  );
}
