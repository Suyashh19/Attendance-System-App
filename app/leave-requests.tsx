import React, { useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../store/dialogStore';
import { approveAllLeaves, getPendingLeaves, reviewLeave } from '../services/leaves';
import { getErrorMessage } from '../services/api';
import { colors } from '../constants/theme';
import type { LeaveRequest } from '../types';
import { formatLeaveRange, leaveDays } from '../utils/leaveForm';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { LeaveRejectSheet } from '../components/LeaveRejectSheet';
import { ScreenHeader } from '../components/ScreenHeader';
import { ListSkeleton } from '../components/Skeleton';
import { Text } from '../components/Text';

const PENDING_KEY = ['pending-leaves'];

/** Faculty: every waiting leave request across all their subjects, in one place. */
export default function LeaveRequestsScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [rejecting, setRejecting] = useState<LeaveRequest | null>(null);

  const leaves = useQuery({ queryKey: PENDING_KEY, queryFn: getPendingLeaves });
  const list = leaves.data ?? [];

  const refreshAfterLeave = (subjectIds: number[]) => {
    queryClient.invalidateQueries({ queryKey: PENDING_KEY });
    for (const id of subjectIds) {
      queryClient.invalidateQueries({ queryKey: ['subject-leaves', id] });
      queryClient.invalidateQueries({ queryKey: ['subject-analytics', id] });
    }
    queryClient.invalidateQueries({ queryKey: ['session-details'] });
  };

  // The request leaves the list at once; it comes back if the server refuses
  const { mutate: review } = useMutation({
    mutationKey: ['review-leave'],
    mutationFn: ({ leave, status, note }: { leave: LeaveRequest; status: 'APPROVED' | 'REJECTED'; note?: string }) =>
      reviewLeave(leave.id, status, note),
    onMutate: async ({ leave }) => {
      await queryClient.cancelQueries({ queryKey: PENDING_KEY });
      const previous = queryClient.getQueryData<LeaveRequest[]>(PENDING_KEY);
      queryClient.setQueryData<LeaveRequest[]>(PENDING_KEY, (old) => old?.filter((l) => l.id !== leave.id));
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(PENDING_KEY, context.previous);
      showAlert('Could not update', getErrorMessage(err, 'Please try again.'));
    },
    onSettled: (_data, _err, { leave }) => {
      // Refetch once the last pending change has landed, so an older answer cannot undo a newer tap
      if (queryClient.isMutating({ mutationKey: ['review-leave'] }) <= 1) refreshAfterLeave([leave.subjectId]);
    },
  });

  const { mutate: approveAll, isPending: isApprovingAll } = useMutation({
    mutationFn: async () => {
      const subjectIds = [...new Set(list.map((l) => l.subjectId))];
      const results = await Promise.all(subjectIds.map((id) => approveAllLeaves(id)));
      return {
        subjectIds,
        approved: results.reduce((sum, r) => sum + r.approved, 0),
        excused: results.reduce((sum, r) => sum + r.excused, 0),
      };
    },
    onSuccess: ({ subjectIds, approved, excused }) => {
      refreshAfterLeave(subjectIds);
      showAlert(
        'Approved',
        `${approved} ${approved === 1 ? 'request was' : 'requests were'} approved.` +
          (excused > 0 ? ` ${excused} missed ${excused === 1 ? 'class was' : 'classes were'} excused.` : '')
      );
    },
    onError: (err) => {
      refreshAfterLeave([...new Set(list.map((l) => l.subjectId))]);
      showAlert('Could not approve', getErrorMessage(err, 'Please try again.'));
    },
  });

  const confirmApproveAll = () => {
    showAlert(
      'Approve all leave requests',
      `Approve all ${list.length} waiting requests? Each student's missed classes in those days will be excused.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve all', onPress: () => approveAll() },
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await leaves.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const renderLeave = (leave: LeaveRequest) => {
    const days = leaveDays(leave.fromDate, leave.toDate);
    return (
      <Card className="mb-3 p-4">
        <View className="flex-row items-center">
          <Avatar name={leave.student?.name} size={46} />
          <View className="flex-1 mx-3">
            <Text className="text-light-text font-bold text-[15px]" numberOfLines={1}>
              {leave.student?.name || 'Unnamed student'}
            </Text>
            <Text className="text-light-muted text-xs font-medium mt-0.5" numberOfLines={1}>
              {leave.student?.prn ? `PRN ${leave.student.prn}` : 'No PRN yet'}
              {leave.student?.rollNo ? ` · Roll ${leave.student.rollNo}` : ''}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center mt-3">
          <Ionicons name="book-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
          <Text className="text-light-text text-sm font-semibold flex-1" numberOfLines={1}>
            {leave.subject?.name ?? 'Subject'}
            <Text className="text-light-muted font-medium">
              {' · '}{leave.subject?.type === 'practical' ? 'Practical' : 'Theory'}
            </Text>
          </Text>
        </View>
        <View className="flex-row items-center mt-1.5">
          <Ionicons name="calendar-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
          <Text className="text-light-text text-sm font-semibold">
            {formatLeaveRange(leave.fromDate, leave.toDate)}
            <Text className="text-light-muted font-medium"> · {days} {days === 1 ? 'day' : 'days'}</Text>
          </Text>
        </View>
        <Text className="text-light-muted text-sm font-medium mt-2">{leave.reason}</Text>

        <View className="flex-row mt-4">
          <Button
            title="Reject"
            variant="dangerSoft"
            size="sm"
            icon="close"
            onPress={() => setRejecting(leave)}
            className="flex-1 mr-3"
          />
          <Button
            title="Approve"
            size="sm"
            icon="checkmark"
            onPress={() => review({ leave, status: 'APPROVED' })}
            className="flex-1"
          />
        </View>
      </Card>
    );
  };

  return (
    <View className="flex-1 bg-light">
      <ScreenHeader
        title="Leave requests"
        subtitle={list.length > 0 ? `${list.length} waiting across your subjects` : 'Across all your subjects'}
      >
        {list.length > 1 && (
          <Button
            title={`Approve all (${list.length})`}
            icon="checkmark-done"
            onPress={confirmApproveAll}
            loading={isApprovingAll}
            variant="secondary"
            className="mt-4"
          />
        )}
      </ScreenHeader>

      <FlatList
        data={list}
        keyExtractor={(leave) => String(leave.id)}
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
              icon={leaves.isError ? 'cloud-offline-outline' : 'checkmark-done-outline'}
              tone={leaves.isError ? 'danger' : 'primary'}
              title={leaves.isError ? 'Could not load requests' : 'All caught up'}
              text={leaves.isError ? 'Pull down to try again.' : 'No leave requests are waiting. When a student applies, it appears here.'}
            />
          )
        }
        renderItem={({ item }) => renderLeave(item)}
      />

      <LeaveRejectSheet
        visible={rejecting !== null}
        studentName={rejecting?.student?.name || 'this student'}
        onClose={() => setRejecting(null)}
        onConfirm={(note) => {
          if (rejecting) review({ leave: rejecting, status: 'REJECTED', note: note || undefined });
          setRejecting(null);
        }}
      />
    </View>
  );
}
