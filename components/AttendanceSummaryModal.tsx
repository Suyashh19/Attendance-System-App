import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { editAttendanceRecord } from '../services/attendance';
import { colors } from '../constants/theme';
import { Button } from './Button';
import { Text } from './Text';
import { Avatar } from './Avatar';
import { BottomSheet } from './BottomSheet';
import { StatusPill } from './StatusPill';

interface AttendanceSummaryModalProps {
  visible: boolean;
  sessionId: number | null;
  attendances: any[];
  onClose: () => void;
}

export function AttendanceSummaryModal({
  visible,
  sessionId,
  attendances: initialAttendances,
  onClose,
}: AttendanceSummaryModalProps) {
  const [attendances, setAttendances] = useState(initialAttendances);
  // Default selected tab is iOS Users as requested
  const [selectedPlatform, setSelectedPlatform] = useState<'ios' | 'android'>('ios');

  // Sync internal state if props change when opening
  React.useEffect(() => {
    if (visible) {
      setAttendances(initialAttendances);
      setSelectedPlatform('ios');
    }
  }, [visible, initialAttendances]);

  const { mutate: editStatus, isPending } = useMutation({
    mutationFn: ({ studentId, status }: { studentId: number; status: string }) =>
      editAttendanceRecord(sessionId!, studentId, status, 'Manually updated by faculty'),
    onSuccess: (data, variables) => {
      setAttendances((prev) =>
        prev.map((a) =>
          a.studentId === variables.studentId
            ? { ...a, status: variables.status, editedByFaculty: true }
            : a
        )
      );
    },
  });

  const getNextStatus = (currentStatus: string) => {
    if (currentStatus === 'PRESENT') return 'ABSENT';
    if (currentStatus === 'ABSENT') return 'PRESENT';
    return 'PRESENT'; // default fallback for INVALID
  };

  const presentCount = attendances.filter((a) => a.status === 'PRESENT').length;
  const absentCount = attendances.filter((a) => a.status === 'ABSENT').length;

  const iosStudents = useMemo(
    () => attendances.filter((a) => a.student?.devicePlatform === 'ios'),
    [attendances]
  );

  const androidStudents = useMemo(
    () => attendances.filter((a) => a.student?.devicePlatform !== 'ios'),
    [attendances]
  );

  const displayedStudents = selectedPlatform === 'ios' ? iosStudents : androidStudents;

  if (!visible) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Lecture Summary"
      subtitle={`${attendances.length} ${attendances.length === 1 ? 'student' : 'students'} in this class`}
      style={{ height: '88%' }}
    >
      {/* Present / Absent Count Cards (Unchanged Design) */}
      <View className="flex-row mb-3">
        <View className="flex-1 bg-success-bg rounded-2xl p-4 mr-3 flex-row items-center">
          <View className="w-10 h-10 rounded-xl bg-white items-center justify-center mr-3">
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          </View>
          <View>
            <Text className="text-success text-2xl font-extrabold">{presentCount}</Text>
            <Text className="text-success text-[11px] font-bold tracking-widest">PRESENT</Text>
          </View>
        </View>
        <View className="flex-1 bg-danger-bg rounded-2xl p-4 flex-row items-center">
          <View className="w-10 h-10 rounded-xl bg-white items-center justify-center mr-3">
            <Ionicons name="close-circle" size={22} color={colors.danger} />
          </View>
          <View>
            <Text className="text-danger text-2xl font-extrabold">{absentCount}</Text>
            <Text className="text-danger text-[11px] font-bold tracking-widest">ABSENT</Text>
          </View>
        </View>
      </View>

      {/* Selectable Platform Tabs (iOS Users default) */}
      <View className="flex-row bg-light-bg p-1 rounded-2xl mb-3 border border-light-border">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setSelectedPlatform('ios')}
          accessibilityRole="tab"
          accessibilityState={{ selected: selectedPlatform === 'ios' }}
          className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
            selectedPlatform === 'ios' ? 'bg-primary' : 'bg-transparent'
          }`}
        >
          <Ionicons
            name="logo-apple"
            size={16}
            color={selectedPlatform === 'ios' ? colors.white : colors.muted}
            style={{ marginRight: 6 }}
          />
          <Text
            className={`text-xs font-bold ${
              selectedPlatform === 'ios' ? 'text-white' : 'text-light-muted'
            }`}
          >
            iOS Users ({iosStudents.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setSelectedPlatform('android')}
          accessibilityRole="tab"
          accessibilityState={{ selected: selectedPlatform === 'android' }}
          className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
            selectedPlatform === 'android' ? 'bg-primary' : 'bg-transparent'
          }`}
        >
          <Ionicons
            name="logo-android"
            size={16}
            color={selectedPlatform === 'android' ? colors.white : colors.muted}
            style={{ marginRight: 6 }}
          />
          <Text
            className={`text-xs font-bold ${
              selectedPlatform === 'android' ? 'text-white' : 'text-light-muted'
            }`}
          >
            Android Users ({androidStudents.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Helper Banner */}
      <View className="bg-light-primaryBg rounded-2xl px-4 py-3 mb-2 flex-row items-center">
        <Ionicons name="hand-left-outline" size={16} color={colors.primary} style={{ marginRight: 10 }} />
        <Text className="text-primary text-[13px] font-medium flex-1 leading-[18px]">
          {selectedPlatform === 'ios'
            ? 'Tap the status pill next to any iOS student to manually mark them present.'
            : 'Tap the status pill next to any student to adjust their attendance before closing.'}
        </Text>
      </View>

      {/* Filtered Student List */}
      <FlatList
        data={displayedStudents}
        keyExtractor={(item) => String(item.studentId)}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="py-10 items-center justify-center">
            <Ionicons
              name={selectedPlatform === 'ios' ? 'logo-apple' : 'logo-android'}
              size={36}
              color={colors.subtle}
              style={{ marginBottom: 8 }}
            />
            <Text className="text-light-muted text-sm font-semibold text-center">
              {selectedPlatform === 'ios'
                ? 'No iOS students enrolled in this subject.\nYou can add one under Subject → Add Student.'
                : 'No Android students enrolled in this subject.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="flex-row items-center py-3 border-b border-light-border">
            <Avatar name={item.student.name} size={40} />
            <View className="flex-1 mx-3">
              <Text className="text-light-text text-[15px] font-bold" numberOfLines={1}>
                {item.student.name}
              </Text>
              <Text className="text-light-muted text-xs font-medium mt-0.5">
                {item.student.prn ? `PRN: ${item.student.prn}` : item.student.id}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                editStatus({
                  studentId: item.studentId,
                  status: getNextStatus(item.status),
                })
              }
              disabled={isPending}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`${item.student.name} is ${item.status}. Tap to change.`}
              style={{ opacity: isPending ? 0.6 : 1 }}
            >
              <StatusPill status={item.status} edited={item.editedByFaculty} />
            </TouchableOpacity>
          </View>
        )}
      />

      <Button title="Done" onPress={onClose} className="mt-4" />
    </BottomSheet>
  );
}
