import React from 'react';
import { View } from 'react-native';
import type { AttendanceRecord } from '../types';
import { StatusPill } from './StatusPill';
import { Text } from './Text';
import { Card } from './Card';

interface HistoryItemProps {
  record: AttendanceRecord;
}

export function HistoryItem({ record }: HistoryItemProps) {
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
    <Card className="p-4 mb-3 flex-row items-center justify-between">
      <View className="flex-1 mr-4">
        <Text className="text-light-text font-bold text-base mb-1" numberOfLines={1}>
          {record.subjectName}
        </Text>
        <Text className="text-light-muted font-medium text-sm">
          {formattedDate} • {formattedTime}
        </Text>
      </View>

      <StatusPill status={record.status} showIcon />
    </Card>
  );
}
