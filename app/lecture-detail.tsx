import React from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSessionDetails, editAttendanceRecord } from '../services/attendance';
import { colors, MIN_ATTENDANCE_PERCENT } from '../constants/theme';
import { StatusPill } from '../components/StatusPill';
import { ScreenHeader } from '../components/ScreenHeader';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { ProgressRing } from '../components/ProgressRing';
import { EmptyState, SectionLabel } from '../components/EmptyState';

export default function LectureDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionId = Number(id);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['session-details', sessionId],
    queryFn: () => getSessionDetails(sessionId),
    enabled: !!sessionId,
  });

  const editMutation = useMutation({
    mutationFn: ({ studentId, status }: { studentId: number, status: string }) =>
      editAttendanceRecord(sessionId, studentId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-details', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['recent-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['subject-analytics'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update attendance');
    }
  });

  const toggleStatus = (studentId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT';
    editMutation.mutate({ studentId, status: newStatus });
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-light items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View className="flex-1 bg-light justify-center px-4">
        <EmptyState
          icon="alert-circle-outline"
          tone="danger"
          title="Failed to load details"
          text="Check your internet connection and open this lecture again."
          action={<Button title="Go Back" icon="arrow-back" onPress={() => router.back()} />}
        />
      </View>
    );
  }

  const { session, students } = data;
  const presentCount = students.filter(s => s.status === 'PRESENT').length;
  const rate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;
  const rateTone = rate >= MIN_ATTENDANCE_PERCENT ? colors.success : colors.danger;

  return (
    <View className="flex-1 bg-light">
      <ScreenHeader
        title={session.subjectName}
        subtitle={new Date(session.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
      />

      <FlatList
        data={students}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Stats Card */}
            <Card className="p-5 mb-6 flex-row items-center">
              <ProgressRing percent={rate} size={96} strokeWidth={10} color={rateTone}>
                <Text className="text-2xl font-extrabold" style={{ color: rateTone }}>{rate}%</Text>
              </ProgressRing>
              <View className="flex-1 ml-5">
                <Text className="text-light-muted font-bold text-xs uppercase tracking-widest mb-1">Attendance Rate</Text>
                <Text className="text-success text-[28px] font-extrabold">
                  {presentCount}
                  <Text className="text-light-muted text-base font-semibold"> / {students.length}</Text>
                </Text>
                <Text className="text-light-muted text-[11px] font-bold tracking-wide">STUDENTS PRESENT</Text>
              </View>
            </Card>

            <SectionLabel className="mb-3 ml-1">STUDENTS · TAP A STATUS TO CHANGE IT</SectionLabel>
          </View>
        }
        renderItem={({ item }) => (
          <Card className="p-4 mb-3 flex-row items-center">
            <Avatar name={item.name} size={44} />
            <View className="flex-1 mx-3">
              <Text className="text-light-text font-bold text-[15px]" numberOfLines={1}>{item.name}</Text>
              <View className="flex-row items-center mt-1">
                {item.rollNo && (
                  <View className="bg-light px-2 py-0.5 rounded-md mr-2">
                    <Text className="text-light-muted text-[10px] font-bold">Roll: {item.rollNo}</Text>
                  </View>
                )}
                {item.prn && (
                  <Text className="text-light-muted text-[11px] font-medium">PRN: {item.prn}</Text>
                )}
              </View>
              {item.status === 'INVALID' && item.reason ? (
                <Text className="text-warning text-[11px] font-medium mt-1" numberOfLines={2}>{item.reason}</Text>
              ) : item.editedByFaculty ? (
                <Text className="text-light-muted text-[11px] font-medium mt-1">Edited by you</Text>
              ) : null}
            </View>

            <TouchableOpacity
              onPress={() => toggleStatus(item.id, item.status)}
              disabled={editMutation.isPending}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`${item.name} is ${item.status}. Tap to change.`}
              style={{ opacity: editMutation.isPending ? 0.6 : 1 }}
            >
              <StatusPill status={item.status} edited={item.editedByFaculty} />
            </TouchableOpacity>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState icon="people-outline" text="No students enrolled in this subject." />
        }
      />
    </View>
  );
}
