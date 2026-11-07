import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getMyLeaves } from '../services/leaves';
import { colors, shadow } from '../constants/theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

/** A row on the student's Attendance tab that opens the leave screen, with how many requests are waiting. */
export function LeaveEntryCard() {
  const router = useRouter();
  const { data: leaves = [] } = useQuery({ queryKey: ['my-leaves'], queryFn: getMyLeaves });

  const waiting = leaves.filter((l) => l.status === 'PENDING').length;
  const subtitle = waiting > 0
    ? `${waiting} ${waiting === 1 ? 'request is' : 'requests are'} waiting for approval`
    : leaves.length > 0
      ? 'See your requests or apply again'
      : 'Need time off? Ask your faculty here';

  return (
    <PressableScale
      onPress={() => router.push('/leave' as any)}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`Leave. ${subtitle}`}
      className="mb-6"
      contentClassName="bg-light-card rounded-2xl border border-light-border px-4 py-3 flex-row items-center"
      contentStyle={shadow.card}
    >
      <View className="w-10 h-10 rounded-xl bg-info-bg items-center justify-center mr-3">
        <Ionicons name="calendar-clear-outline" size={20} color={colors.info} />
      </View>
      <View className="flex-1 mr-2">
        <Text className="text-light-text font-bold text-[15px]">Leave</Text>
        <Text className="text-light-muted text-xs font-medium mt-0.5" numberOfLines={1}>{subtitle}</Text>
      </View>
      {waiting > 0 && (
        <View className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-gold items-center justify-center mr-2">
          <Text className="text-[11px] font-bold text-white">{waiting}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
    </PressableScale>
  );
}
