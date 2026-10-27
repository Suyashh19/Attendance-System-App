import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow, MIN_ATTENDANCE_PERCENT } from '../constants/theme';
import { PressableScale } from './PressableScale';
import { ProgressRing } from './ProgressRing';
import { Text } from './Text';

interface AcademicYearCardProps {
  label: string;
  subjectCount: number;
  /** Odd and Even subject counts, shown under the title */
  odd: number;
  even: number;
  /** Present and total classes across the year's approved subjects, if known */
  attendance?: { present: number; total: number };
  isCurrent: boolean;
  onPress: () => void;
}

/** One academic year on the student's Classes tab. Tapping it opens the year's subjects. */
export function AcademicYearCard({ label, subjectCount, odd, even, attendance, isCurrent, onPress }: AcademicYearCardProps) {
  const percentage = attendance && attendance.total > 0
    ? Math.round((attendance.present / attendance.total) * 100)
    : null;
  const belowMinimum = percentage !== null && percentage < MIN_ATTENDANCE_PERCENT;
  const terms = [odd > 0 ? `Odd ${odd}` : '', even > 0 ? `Even ${even}` : ''].filter(Boolean).join(' · ');

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`Open academic year ${label}, ${subjectCount} ${subjectCount === 1 ? 'subject' : 'subjects'}`}
      className="mb-3"
      contentClassName={`bg-light-card rounded-3xl p-4 border ${isCurrent ? 'border-primary' : 'border-light-border'}`}
      contentStyle={shadow.card}
    >
      <View className="flex-row items-center">
        <View className={`w-[52px] h-[52px] rounded-2xl items-center justify-center mr-3 ${isCurrent ? 'bg-light-primaryBg' : 'bg-light'}`}>
          <Ionicons name="calendar" size={22} color={isCurrent ? colors.primary : colors.muted} />
        </View>

        <View className="flex-1 mr-2">
          <View className="flex-row items-center">
            <Text className="text-light-text font-extrabold text-[18px]">{label}</Text>
            {isCurrent && (
              <View className="ml-2 bg-light-primaryBg px-2 py-0.5 rounded-md">
                <Text className="text-primary text-[10px] font-bold tracking-wide">CURRENT</Text>
              </View>
            )}
          </View>
          <Text className="text-light-muted text-xs font-medium mt-1" numberOfLines={1}>
            {subjectCount} {subjectCount === 1 ? 'subject' : 'subjects'}{terms ? ` · ${terms}` : ''}
          </Text>
        </View>

        {percentage !== null && (
          <View className="mr-2">
            <ProgressRing
              percent={percentage}
              size={44}
              strokeWidth={5}
              color={belowMinimum ? colors.danger : colors.success}
            >
              <Text className={`text-[10px] font-extrabold ${belowMinimum ? 'text-danger' : 'text-success'}`}>
                {percentage}%
              </Text>
            </ProgressRing>
          </View>
        )}

        <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
      </View>
    </PressableScale>
  );
}
