import React, { useState } from 'react';
import { View, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { showAlert } from '../store/dialogStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSessionDetails, editAttendanceRecord } from '../services/attendance';
import type { SessionDetailsResponse } from '../types';
import { colors, MIN_ATTENDANCE_PERCENT } from '../constants/theme';
import { StatusPill } from '../components/StatusPill';
import { ScreenHeader } from '../components/ScreenHeader';
import { ListSkeleton } from '../components/Skeleton';
import { Text } from '../components/Text';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { ProgressRing } from '../components/ProgressRing';
import { EmptyState, SectionLabel } from '../components/EmptyState';
import { Chip } from '../components/Chip';
import { Ionicons } from '@expo/vector-icons';

export default function LectureDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionId = Number(id);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['session-details', sessionId],
    queryFn: () => getSessionDetails(sessionId),
    enabled: !!sessionId,
  });

  // Students whose change is still on its way to the server; their button waits so taps cannot overlap
  const [saving, setSaving] = useState<Set<number>>(new Set());
  const setSavingFor = (studentId: number, on: boolean) =>
    setSaving((prev) => {
      const next = new Set(prev);
      if (on) next.add(studentId);
      else next.delete(studentId);
      return next;
    });

  const detailsKey = ['session-details', sessionId];

  // Finding students quickly: search by name, PRN or roll, and show only the ones that need a look
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'INVALID' | 'ABSENT' | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  // The new status shows at once; the server catches up in the background and the old one returns if it refuses
  const editMutation = useMutation({
    mutationKey: ['edit-attendance'],
    mutationFn: ({ studentId, status }: { studentId: number, status: string }) =>
      editAttendanceRecord(sessionId, studentId, status),
    onMutate: async ({ studentId, status }) => {
      setSavingFor(studentId, true);
      await queryClient.cancelQueries({ queryKey: detailsKey });
      const previous = queryClient.getQueryData<SessionDetailsResponse>(detailsKey);
      queryClient.setQueryData<SessionDetailsResponse>(detailsKey, (old) =>
        old
          ? {
              ...old,
              students: old.students.map((st) =>
                st.id === studentId ? { ...st, status: status as typeof st.status, editedByFaculty: true, reason: null } : st
              ),
            }
          : old
      );
      return { previous };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(detailsKey, context.previous);
      showAlert('Error', err.response?.data?.error || 'Failed to update attendance');
    },
    onSettled: (_data, _err, { studentId }) => {
      setSavingFor(studentId, false);
      // Refetch once the last pending change has landed, so an older answer cannot undo a newer tap
      if (queryClient.isMutating({ mutationKey: ['edit-attendance'] }) <= 1) {
        queryClient.invalidateQueries({ queryKey: detailsKey });
      }
      queryClient.invalidateQueries({ queryKey: ['recent-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['subject-analytics'] });
    },
  });

  const toggleStatus = (studentId: number, currentStatus: string, name?: string) => {
    const newStatus = currentStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT';
    // An excused student has approved leave: do not overwrite that with a stray tap
    if (currentStatus === 'EXCUSED') {
      showAlert(
        'Student is excused',
        `${name || 'This student'} has approved leave for this lecture. Mark them present anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Mark present', onPress: () => editMutation.mutate({ studentId, status: 'PRESENT' }) },
        ]
      );
      return;
    }
    editMutation.mutate({ studentId, status: newStatus });
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-light">
        <ScreenHeader title="Lecture" />
        <ListSkeleton />
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

  const needle = query.trim().toLowerCase();
  const shown = students.filter((s) => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (!needle) return true;
    return [s.name, s.prn, s.rollNo].some((v) => v && String(v).toLowerCase().includes(needle));
  });
  const invalidCount = students.filter((s) => s.status === 'INVALID').length;
  const absentCount = students.filter((s) => s.status === 'ABSENT').length;

  return (
    <View className="flex-1 bg-light">
      <ScreenHeader
        title={session.subjectName}
        subtitle={new Date(session.date).toLocaleString('en-GB', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
      />

      <FlatList
        data={shown}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
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

            {students.length > 0 && (
              <View className="mb-4">
                <View className="flex-row items-center bg-light-card border border-light-border rounded-2xl px-4 h-[52px] mb-3">
                  <Ionicons name="search" size={18} color={colors.subtle} style={{ marginRight: 10 }} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search by name, PRN or roll no."
                    placeholderTextColor={colors.subtle}
                    selectionColor={colors.primary}
                    autoCorrect={false}
                    className="flex-1 text-light-text font-medium text-[15px] h-full"
                  />
                  {query ? (
                    <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Clear search">
                      <Ionicons name="close-circle" size={18} color={colors.subtle} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View className="flex-row">
                  <Chip
                    label={`Needs review · ${invalidCount}`}
                    icon="alert-circle-outline"
                    tone="danger"
                    selected={statusFilter === 'INVALID'}
                    onPress={() => setStatusFilter(statusFilter === 'INVALID' ? null : 'INVALID')}
                    className="mr-2"
                  />
                  <Chip
                    label={`Absent · ${absentCount}`}
                    icon="close-circle-outline"
                    selected={statusFilter === 'ABSENT'}
                    onPress={() => setStatusFilter(statusFilter === 'ABSENT' ? null : 'ABSENT')}
                  />
                </View>
              </View>
            )}

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
              onPress={() => toggleStatus(item.id, item.status, item.name)}
              disabled={saving.has(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`${item.name} is ${item.status}. Tap to change.`}
            >
              <View className="flex-row items-center">
                <StatusPill status={item.status} edited={item.editedByFaculty} />
                <Ionicons name="swap-horizontal" size={14} color={colors.subtle} style={{ marginLeft: 6 }} />
              </View>
            </TouchableOpacity>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState icon="people-outline" text={students.length > 0 ? 'No students match.' : 'No students enrolled in this subject.'} />
        }
      />
    </View>
  );
}
