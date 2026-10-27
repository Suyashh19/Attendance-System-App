import React, { useMemo, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../store/dialogStore';
import { cancelLeave, getMyLeaves } from '../services/leaves';
import { getMySubjects } from '../services/attendance';
import { getErrorMessage } from '../services/api';
import { colors } from '../constants/theme';
import type { LeaveRequest } from '../types';
import { formatLeaveRange, leaveDays } from '../utils/leaveForm';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState, SectionLabel } from '../components/EmptyState';
import { LeaveRequestSheet } from '../components/LeaveRequestSheet';
import { ScreenHeader } from '../components/ScreenHeader';
import { ListSkeleton } from '../components/Skeleton';
import { StatusPill } from '../components/StatusPill';
import { Text } from '../components/Text';

type Row = { kind: 'label'; key: string; text: string } | { kind: 'leave'; key: string; leave: LeaveRequest };

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'WAITING',
  APPROVED: 'APPROVED',
  REJECTED: 'NOT APPROVED',
  CANCELLED: 'WITHDRAWN',
};

/** The student's leave requests, and a way to ask for new leave. */
export default function LeaveScreen() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const leaves = useQuery({ queryKey: ['my-leaves'], queryFn: getMyLeaves });
  const subjects = useQuery({ queryKey: ['subjects'], queryFn: getMySubjects });

  // Only subjects the student is approved in can take a leave request
  const approvedSubjects = useMemo(
    () => (subjects.data ?? []).filter((s) => !s.enrollmentStatus || s.enrollmentStatus === 'APPROVED'),
    [subjects.data]
  );

  const withdraw = useMutation({
    mutationKey: ['withdraw-leave'],
    mutationFn: (id: number) => cancelLeave(id),
    // The request moves to "withdrawn" at once; it returns if the server refuses
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['my-leaves'] });
      const previous = queryClient.getQueryData<LeaveRequest[]>(['my-leaves']);
      queryClient.setQueryData<LeaveRequest[]>(['my-leaves'], (old) =>
        old?.map((l) => (l.id === id ? { ...l, status: 'CANCELLED' as const } : l))
      );
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['my-leaves'], context.previous);
      showAlert('Could not withdraw', getErrorMessage(err, 'Please try again.'));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['my-leaves'] }),
  });

  const confirmWithdraw = (leave: LeaveRequest) => {
    showAlert('Withdraw request', `Withdraw your leave request for ${leave.subject?.name ?? 'this subject'}?`, [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Withdraw', style: 'destructive', onPress: () => withdraw.mutate(leave.id) },
    ]);
  };

  const rows: Row[] = useMemo(() => {
    const all = leaves.data ?? [];
    const waiting = all.filter((l) => l.status === 'PENDING');
    const answered = all.filter((l) => l.status !== 'PENDING');
    const out: Row[] = [];
    if (waiting.length > 0) {
      out.push({ kind: 'label', key: 'waiting', text: `WAITING · ${waiting.length}` });
      waiting.forEach((leave) => out.push({ kind: 'leave', key: `l-${leave.id}`, leave }));
    }
    if (answered.length > 0) {
      out.push({ kind: 'label', key: 'answered', text: 'EARLIER' });
      answered.forEach((leave) => out.push({ kind: 'leave', key: `l-${leave.id}`, leave }));
    }
    return out;
  }, [leaves.data]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([leaves.refetch(), subjects.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  const openForm = () => {
    if (approvedSubjects.length === 0) {
      showAlert('No classes yet', 'Join a class and wait for approval before applying for leave.');
      return;
    }
    setShowForm(true);
  };

  const renderLeave = (leave: LeaveRequest) => {
    const days = leaveDays(leave.fromDate, leave.toDate);
    const faded = leave.status === 'CANCELLED';
    return (
      <Card className="mb-3 p-4" style={faded ? { opacity: 0.6 } : undefined}>
        <View className="flex-row items-start">
          <View className="flex-1 mr-3">
            <Text className="text-light-text font-bold text-[15px]" numberOfLines={1}>
              {leave.subject?.name ?? 'Subject'}
            </Text>
            <Text className="text-light-muted text-xs font-medium mt-0.5" numberOfLines={1}>
              {leave.subject?.code} · {leave.subject?.type === 'practical' ? 'Practical' : 'Theory'}
            </Text>
          </View>
          <StatusPill status={leave.status} label={STATUS_LABEL[leave.status]} />
        </View>

        <View className="flex-row items-center mt-3">
          <Ionicons name="calendar-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
          <Text className="text-light-text text-sm font-semibold">
            {formatLeaveRange(leave.fromDate, leave.toDate)}
            <Text className="text-light-muted font-medium"> · {days} {days === 1 ? 'day' : 'days'}</Text>
          </Text>
        </View>

        <Text className="text-light-muted text-sm font-medium mt-2" numberOfLines={3}>{leave.reason}</Text>

        {leave.reviewNote ? (
          <View className="bg-light rounded-xl px-3 py-2 mt-3">
            <Text className="text-light-text text-xs font-semibold">Note from faculty</Text>
            <Text className="text-light-muted text-xs font-medium mt-0.5">{leave.reviewNote}</Text>
          </View>
        ) : null}

        {leave.status === 'PENDING' && (
          <Button
            title="Withdraw"
            variant="dangerSoft"
            size="sm"
            icon="close-outline"
            onPress={() => confirmWithdraw(leave)}
            className="mt-3 self-start"
          />
        )}
      </Card>
    );
  };

  return (
    <View className="flex-1 bg-light">
      <ScreenHeader title="Leave" subtitle="Ask your faculty for time off">
        <Button title="Apply for leave" icon="add" onPress={openForm} variant="secondary" className="mt-4" />
      </ScreenHeader>

      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          leaves.isLoading ? (
            <ListSkeleton count={3} className="pt-2" />
          ) : (
            <EmptyState
              icon={leaves.isError ? 'cloud-offline-outline' : 'calendar-outline'}
              tone={leaves.isError ? 'danger' : 'primary'}
              title={leaves.isError ? 'Could not load your requests' : 'No leave requests yet'}
              text={leaves.isError
                ? 'Pull down to try again.'
                : 'When you are ill or away, apply here. Once approved, the classes you miss are excused and do not lower your percentage.'}
            />
          )
        }
        renderItem={({ item }) =>
          item.kind === 'label'
            ? <SectionLabel className="mt-2 mb-3 ml-1">{item.text}</SectionLabel>
            : renderLeave(item.leave)
        }
      />

      <LeaveRequestSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        subjects={approvedSubjects}
        onSent={() => {
          setShowForm(false);
          queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
          showAlert('Request sent', 'Your faculty will be notified. You will get a message when they answer.');
        }}
      />
    </View>
  );
}
