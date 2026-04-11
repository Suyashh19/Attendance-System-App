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
 
 const statusStyle = isPresent 
   ? { bg: '#ECFDF5', text: '#059669' } 
   : isAbsent 
     ? { bg: '#F7F9FC', text: '#1A1D1F' } 
     : { bg: '#F7F9FC', text: '#6B7280' };

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
 <View className="bg-light-card shadow-sm rounded-2xl p-4 mb-3 border border-light-border flex-row items-center justify-between ">
 <View className="flex-1 mr-4">
 <Text className="text-light-text font-bold text-lg mb-1" numberOfLines={1}>
 {record.subjectName}
 </Text>
 <Text className="text-light-muted font-medium text-sm">
 {formattedDate} • {formattedTime}
 </Text>
 </View>

 <View className="items-center justify-center">
 <View 
 className="flex-row items-center justify-center px-3 py-1.5 rounded-full"
 style={{ backgroundColor: statusStyle.bg }}
 >
 <Ionicons name={iconName} size={16} color={statusStyle.text} className="mr-1.5" />
 <Text 
 className="font-bold text-xs"
 style={{ color: statusStyle.text }}
 >
 {record.status}
 </Text>
 </View>
 </View>
 </View>
 );
}
