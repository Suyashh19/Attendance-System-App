import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Subject } from '../types';
import { useAuthStore } from '../store/authStore';
import { colors, classesNeeded, shadow, MIN_ATTENDANCE_PERCENT } from '../constants/theme';
import { StatusPill } from './StatusPill';
import { Text } from './Text';
import { PressableScale } from './PressableScale';
import { ProgressRing } from './ProgressRing';

interface SubjectCardProps {
  subject: Subject;
  sessionActive?: boolean;
  /** Student only: classes attended so far in this subject */
  attendance?: { present: number; total: number };
  /** Opens the subject's own page */
  onPress?: () => void;
  onStartSession?: () => void;
}

export function SubjectCard({
  subject,
  sessionActive = false,
  attendance,
  onPress,
  onStartSession,
}: SubjectCardProps) {
  const user = useAuthStore((s) => s.user);
  const isFaculty = user?.role === 'faculty';
  const isPractical = subject.type === 'practical';
  const notApproved = !isFaculty && !!subject.enrollmentStatus && subject.enrollmentStatus !== 'APPROVED';

  const percentage = attendance && attendance.total > 0
    ? Math.round((attendance.present / attendance.total) * 100)
    : null;
  const belowMinimum = percentage !== null && percentage < MIN_ATTENDANCE_PERCENT;
  const needed = attendance ? classesNeeded(attendance.present, attendance.total) : 0;
  const showAttendance = !isFaculty && !notApproved && !!attendance;

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`Open ${subject.name}`}
      className="mb-3"
      contentClassName={`bg-light-card rounded-3xl p-4 border ${sessionActive ? 'border-success' : 'border-light-border'}`}
      contentStyle={shadow.card}
    >
      <View className="flex-row items-center">
        <View className={`w-[52px] h-[52px] rounded-2xl items-center justify-center mr-3 ${isPractical ? 'bg-gold-bg' : 'bg-light-primaryBg'}`}>
          <Ionicons
            name={isPractical ? 'flask' : 'book'}
            size={22}
            color={isPractical ? colors.gold : colors.primary}
          />
        </View>

        <View className="flex-1 mr-2">
          <Text className="text-light-text font-bold text-[16px]" numberOfLines={1}>{subject.name}</Text>
          <View className="flex-row items-center mt-1">
            <View className="bg-light px-2 py-0.5 rounded-md mr-2">
              <Text className="text-light-muted text-[11px] font-bold tracking-wide">{subject.code}</Text>
            </View>
            <Text className="text-light-muted text-xs font-medium flex-1" numberOfLines={1}>
              {isPractical ? 'Practical' : 'Theory'}{subject.span ? ` · ${subject.span}` : ''}
            </Text>
          </View>
        </View>

        {sessionActive ? (
          <View className="bg-success-bg px-3 h-8 rounded-full flex-row items-center mr-1">
            <View className="w-2 h-2 rounded-full bg-success mr-2" />
            <Text className="text-success text-[11px] font-bold tracking-wide">LIVE</Text>
          </View>
        ) : notApproved ? (
          <View className="mr-1">
            <StatusPill status={subject.enrollmentStatus!} showIcon />
          </View>
        ) : showAttendance && percentage !== null ? (
          <View className="mr-1">
            <ProgressRing
              percent={percentage}
              size={48}
              strokeWidth={5}
              color={belowMinimum ? colors.danger : colors.success}
            >
              <Text className={`text-[11px] font-extrabold ${belowMinimum ? 'text-danger' : 'text-success'}`}>
                {percentage}%
              </Text>
            </ProgressRing>
          </View>
        ) : null}

        <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
      </View>

      {/* Student: attendance so far */}
      {showAttendance && (
        <View className="mt-4 pt-3 border-t border-light-border">
          {percentage === null ? (
            <Text className="text-light-muted text-xs font-medium">No classes held yet.</Text>
          ) : (
            <>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-light-muted text-xs font-medium">
                  {attendance.present} of {attendance.total} classes attended
                </Text>
                <Text className={`text-xs font-bold ${belowMinimum ? 'text-danger' : 'text-success'}`}>
                  {belowMinimum ? 'Needs attention' : 'On track'}
                </Text>
              </View>
              <View className="h-2 rounded-full bg-light-border overflow-hidden">
                <View
                  className={`h-full rounded-full ${belowMinimum ? 'bg-danger' : 'bg-success'}`}
                  style={{ width: `${percentage}%` }}
                />
              </View>
              {belowMinimum && (
                <View className="flex-row items-center mt-3 bg-danger-bg rounded-xl px-3 py-2">
                  <Ionicons name="alert-circle" size={14} color={colors.danger} style={{ marginRight: 6 }} />
                  <Text className="text-danger text-xs font-semibold flex-1">
                    Below {MIN_ATTENDANCE_PERCENT}%. Attend the next {needed} {needed === 1 ? 'class' : 'classes'} to recover.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Faculty: open the class, or start attendance straight away */}
      {isFaculty && (
        <View className="flex-row items-center mt-4 pt-3 border-t border-light-border">
          <Ionicons name="people-outline" size={18} color={colors.muted} style={{ marginRight: 6 }} />
          <Text className="text-light-muted text-sm font-medium flex-1">Students and lectures</Text>

          {!sessionActive && (
            <TouchableOpacity
              onPress={onStartSession}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Start attendance for ${subject.name}`}
              className="bg-primary h-10 pl-3 pr-4 rounded-full flex-row items-center"
              style={shadow.glow}
            >
              <View className="w-6 h-6 rounded-full bg-white/20 items-center justify-center mr-2">
                <Ionicons name="play" size={11} color={colors.white} />
              </View>
              <Text className="text-white text-sm font-bold">Start</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </PressableScale>
  );
}
