import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AttendanceRecord } from '../types';

interface HistoryItemProps {
  record: AttendanceRecord;
}

export function HistoryItem({ record }: HistoryItemProps) {
  const isPresent = record.status === 'PRESENT';
  const isAbsent = record.status === 'ABSENT';
  
  const statusColor = isPresent ? '#10B981' : isAbsent ? '#EF4444' : '#F59E0B';
  const iconName = isPresent ? 'checkmark-circle' : isAbsent ? 'close-circle' : 'warning';
  
  const formattedTime = new Date(record.markedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedDate = new Date(record.date).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View className="bg-dark-card rounded-2xl p-4 mb-3 border border-dark-border flex-row items-center justify-between shadow-sm">
      <View className="flex-1 mr-4">
        <Text className="text-white font-bold text-lg mb-1" numberOfLines={1}>
          {record.subjectName}
        </Text>
        <Text className="text-dark-muted font-medium text-sm">
          {formattedDate} • {formattedTime}
        </Text>
      </View>

      <View className="items-center justify-center">
        <View 
          className="flex-row items-center justify-center px-3 py-1.5 rounded-full"
          style={{ backgroundColor: `${statusColor}20` }}
        >
          <Ionicons name={iconName} size={16} color={statusColor} className="mr-1.5" />
          <Text 
            className="font-bold text-xs"
            style={{ color: statusColor }}
          >
            {record.status}
          </Text>
        </View>
      </View>
    </View>
  );
}
