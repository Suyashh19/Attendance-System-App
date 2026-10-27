import React, { useMemo, useState } from 'react';
import { View, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { showAlert } from '../../store/dialogStore';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getSubjectEnrollments,
  getSubjectAnalytics,
  getSubjectSessions,
  updateEnrollmentStatus,
  approveAllEnrollments,
  getSubjectSummary,
  deleteSubject,
} from '../../services/attendance';
import { approveAllLeaves, getSubjectLeaves, reviewLeave } from '../../services/leaves';
import { getErrorMessage } from '../../services/api';
import { deleteWarning, subjectSubtitle } from '../../utils/subjectText';
import { offerToShareSubject, shareSubjectCode } from '../../utils/shareSubject';
import { CreateSubjectModal } from '../CreateSubjectModal';
import { colors, MIN_ATTENDANCE_PERCENT } from '../../constants/theme';
import type { Subject, EnrolledStudent, LeaveRequest, StudentAttendanceSummary, SubjectSession } from '../../types';
import { formatLeaveRange, leaveDays } from '../../utils/leaveForm';
import { ScreenHeader } from '../ScreenHeader';
import { Button } from '../Button';
import { Text } from '../Text';
import { Card } from '../Card';
import { Avatar } from '../Avatar';
import { Chip } from '../Chip';
import { ProgressRing } from '../ProgressRing';
import { SegmentedControl } from '../SegmentedControl';
import { EmptyState, SectionLabel } from '../EmptyState';
import { ListSkeleton } from '../Skeleton';
import { StatusPill } from '../StatusPill';
import { LeaveRejectSheet } from '../LeaveRejectSheet';

type Tab = 'students' | 'requests' | 'leaves' | 'lectures';

type Row =
  | { kind: 'label'; key: string; text: string }
  | { kind: 'student'; key: string; student: EnrolledStudent }
  | { kind: 'request'; key: string; student: EnrolledStudent }
  | { kind: 'removed'; key: string; student: EnrolledStudent }
  | { kind: 'leave'; key: string; leave: LeaveRequest }
  | { kind: 'lecture'; key: string; session: SubjectSession };

interface FacultySubjectViewProps {
  subject: Subject;
}

/** Faculty's page for one subject: who is enrolled, who is waiting, and past lectures. */
export function FacultySubjectView({ subject }: FacultySubjectViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const subjectId = subject.id;

  const [tab, setTab] = useState<Tab>('students');
  const [search, setSearch] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);

  const enrollments = useQuery({
    queryKey: ['enrollments', subjectId],
    queryFn: () => getSubjectEnrollments(subjectId),
  });
  const analytics = useQuery({
    queryKey: ['subject-analytics', subjectId],
    queryFn: () => getSubjectAnalytics(subjectId),
  });
  const sessions = useQuery({
    queryKey: ['subject-sessions', subjectId],
    queryFn: () => getSubjectSessions(subjectId),
    enabled: tab === 'lectures',
  });

  // Always loaded, so the tab can show how many leave requests are waiting
  const leaves = useQuery({
    queryKey: ['subject-leaves', subjectId],
    queryFn: () => getSubjectLeaves(subjectId),
  });
  const leaveList = leaves.data?.leaves ?? [];
  const pendingLeaves = useMemo(() => leaveList.filter((l) => l.status === 'PENDING'), [leaveList]);
  const answeredLeaves = useMemo(() => leaveList.filter((l) => l.status !== 'PENDING'), [leaveList]);

  const students = enrollments.data ?? [];
  const approved = useMemo(() => students.filter((s) => s.status === 'APPROVED'), [students]);
  const pending = useMemo(() => students.filter((s) => s.status === 'PENDING'), [students]);
  const removed = useMemo(() => students.filter((s) => s.status === 'REJECTED'), [students]);

  // Attendance so far, per student. Students with no records yet are simply absent from this map.
  const summaryByStudent = useMemo(() => {
    const map = new Map<number, StudentAttendanceSummary>();
    for (const row of analytics.data?.summary ?? []) map.set(Number(row.id), row);
    return map;
  }, [analytics.data]);

  const percentOf = (studentId: number): number | null => {
    const row = summaryByStudent.get(studentId);
    if (!row || row.totalSessions === 0) return null;
    return Math.round((row.PRESENT / row.totalSessions) * 100);
  };

  const lowCount = approved.filter((s) => {
    const p = percentOf(s.id);
    return p !== null && p < MIN_ATTENDANCE_PERCENT;
  }).length;

  const { mutate: setStatus, isPending: isUpdating } = useMutation({
    mutationFn: ({ studentId, status }: { studentId: number; status: 'APPROVED' | 'REJECTED' }) =>
      updateEnrollmentStatus(subjectId, studentId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', subjectId] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['recent-sessions'] });
    },
    onError: (err) => showAlert('Could not update', getErrorMessage(err, 'Please try again.')),
  });

  const confirmRemove = (student: EnrolledStudent) => {
    showAlert(
      'Remove from class',
      `${student.name || 'This student'} will no longer be able to mark attendance for ${subject.name}. Their past records are kept, and you can add them back from the Requests tab.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setExpandedId(null);
            setStatus({ studentId: student.id, status: 'REJECTED' });
          },
        },
      ]
    );
  };

  const { mutate: approveAll, isPending: isApprovingAll } = useMutation({
    mutationFn: () => approveAllEnrollments(subjectId),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', subjectId] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      showAlert('Approved', `${count} ${count === 1 ? 'student was' : 'students were'} added to the class.`);
    },
    onError: (err) => showAlert('Could not approve', getErrorMessage(err, 'Please try again.')),
  });

  const confirmApproveAll = () => {
    showAlert(
      'Approve all requests',
      `Add all ${pending.length} waiting ${pending.length === 1 ? 'student' : 'students'} to ${subject.name}? Students you removed earlier are not affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve all', onPress: () => approveAll() },
      ]
    );
  };

  // ── Leave requests ──────────────────────────────────────────────────────
  const [rejecting, setRejecting] = useState<LeaveRequest | null>(null);

  const refreshAfterLeave = () => {
    queryClient.invalidateQueries({ queryKey: ['subject-leaves', subjectId] });
    queryClient.invalidateQueries({ queryKey: ['subject-analytics', subjectId] });
    queryClient.invalidateQueries({ queryKey: ['session-details'] });
  };

  // The request changes status at once; it goes back if the server refuses
  const { mutate: review } = useMutation({
    mutationKey: ['review-leave'],
    mutationFn: ({ id, status, note }: { id: number; status: 'APPROVED' | 'REJECTED'; note?: string }) =>
      reviewLeave(id, status, note),
    onMutate: async ({ id, status, note }) => {
      await queryClient.cancelQueries({ queryKey: ['subject-leaves', subjectId] });
      const previous = queryClient.getQueryData<{ leaves: LeaveRequest[]; pending: number }>(['subject-leaves', subjectId]);
      queryClient.setQueryData<{ leaves: LeaveRequest[]; pending: number }>(['subject-leaves', subjectId], (old) => {
        if (!old) return old;
        const leaves = old.leaves.map((l) => (l.id === id ? { ...l, status, reviewNote: note || null } : l));
        return { leaves, pending: leaves.filter((l) => l.status === 'PENDING').length };
      });
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['subject-leaves', subjectId], context.previous);
      showAlert('Could not update', getErrorMessage(err, 'Please try again.'));
    },
    onSettled: (_data, _err, _vars) => {
      // Refetch once the last pending change has landed, so an older answer cannot undo a newer tap
      if (queryClient.isMutating({ mutationKey: ['review-leave'] }) <= 1) refreshAfterLeave();
    },
  });

  const { mutate: approveAllLeaveRequests, isPending: isApprovingAllLeaves } = useMutation({
    mutationFn: () => approveAllLeaves(subjectId),
    onSuccess: ({ approved, excused }) => {
      refreshAfterLeave();
      showAlert(
        'Approved',
        `${approved} ${approved === 1 ? 'request was' : 'requests were'} approved.` +
          (excused > 0 ? ` ${excused} missed ${excused === 1 ? 'class was' : 'classes were'} excused.` : '')
      );
    },
    onError: (err) => showAlert('Could not approve', getErrorMessage(err, 'Please try again.')),
  });

  const confirmApproveAllLeaves = () => {
    showAlert(
      'Approve all leave requests',
      `Approve all ${pendingLeaves.length} waiting requests for ${subject.name}? Each student's missed classes in those days will be excused.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve all', onPress: () => approveAllLeaveRequests() },
      ]
    );
  };

  const confirmRevoke = (leave: LeaveRequest) => {
    showAlert(
      'Take back approval',
      `${leave.student?.name || 'This student'}'s missed classes in those days will count as absences again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take back', style: 'destructive', onPress: () => review({ id: leave.id, status: 'REJECTED' }) },
      ]
    );
  };

  const confirmDelete = async () => {
    // Ask the server what a delete would remove, so the warning has real numbers.
    // If that fails the generic warning is shown; the delete itself is never blocked.
    setDeleting(true);
    const summary = await getSubjectSummary(subjectId).catch(() => null);
    setDeleting(false);

    showAlert(
      'Delete Subject',
      deleteWarning(subject.name, summary),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Subject',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteSubject(subjectId);
              router.back();
              queryClient.invalidateQueries({ queryKey: ['subjects'] });
              queryClient.invalidateQueries({ queryKey: ['recent-sessions'] });
            } catch (err) {
              setDeleting(false);
              showAlert('Error', getErrorMessage(err, 'Failed to delete subject'));
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        enrollments.refetch(),
        analytics.refetch(),
        leaves.refetch(),
        tab === 'lectures' ? sessions.refetch() : null,
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const rows: Row[] = useMemo(() => {
    if (tab === 'students') {
      const q = search.trim().toLowerCase();
      return approved
        .filter((s) => {
          if (onlyLow) {
            const p = percentOf(s.id);
            if (p === null || p >= MIN_ATTENDANCE_PERCENT) return false;
          }
          if (!q) return true;
          return [s.name, s.prn, s.rollNo, s.email].some((v) => v && String(v).toLowerCase().includes(q));
        })
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map((student) => ({ kind: 'student' as const, key: `s-${student.id}`, student }));
    }

    if (tab === 'requests') {
      const out: Row[] = pending.map((student) => ({ kind: 'request', key: `p-${student.id}`, student }));
      if (removed.length > 0) {
        out.push({ kind: 'label', key: 'removed-label', text: 'REMOVED OR REJECTED' });
        for (const student of removed) out.push({ kind: 'removed', key: `r-${student.id}`, student });
      }
      return out;
    }

    if (tab === 'leaves') {
      const out: Row[] = pendingLeaves.map((leave) => ({ kind: 'leave' as const, key: `lr-${leave.id}`, leave }));
      if (answeredLeaves.length > 0) {
        out.push({ kind: 'label', key: 'answered-leaves', text: 'ANSWERED' });
        for (const leave of answeredLeaves) out.push({ kind: 'leave', key: `lr-${leave.id}`, leave });
      }
      return out;
    }

    return (sessions.data ?? []).map((session) => ({ kind: 'lecture' as const, key: `l-${session.id}`, session }));
    // percentOf reads summaryByStudent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, approved, pending, removed, sessions.data, search, onlyLow, summaryByStudent, pendingLeaves, answeredLeaves]);

  const isLoading =
    tab === 'lectures' ? sessions.isLoading : tab === 'leaves' ? leaves.isLoading : enrollments.isLoading;
  const loadFailed = tab === 'lectures' ? sessions.isError : tab === 'leaves' ? leaves.isError : enrollments.isError;

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'students', label: 'Students' },
    { key: 'requests', label: 'Requests', badge: pending.length },
    { key: 'leaves', label: 'Leave', badge: pendingLeaves.length },
    { key: 'lectures', label: 'Lectures' },
  ];

  const renderStudent = (student: EnrolledStudent) => {
    const percent = percentOf(student.id);
    const summary = summaryByStudent.get(student.id);
    const low = percent !== null && percent < MIN_ATTENDANCE_PERCENT;
    const expanded = expandedId === student.id;

    return (
      <Card className="mb-3 overflow-hidden">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setExpandedId(expanded ? null : student.id)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          className="p-4 flex-row items-center"
        >
          <Avatar name={student.name} size={46} />
          <View className="flex-1 mx-3">
            <Text className="text-light-text font-bold text-[15px]" numberOfLines={1}>
              {student.name || 'Unnamed student'}
            </Text>
            <Text className="text-light-muted text-xs font-medium mt-0.5" numberOfLines={1}>
              {student.prn ? `PRN ${student.prn}` : 'No PRN yet'}
              {student.rollNo ? ` · Roll ${student.rollNo}` : ''}
            </Text>
          </View>
          {percent === null ? (
            <Text className="text-light-subtle text-xs font-semibold mr-2">No classes</Text>
          ) : (
            <View className="mr-2">
              <ProgressRing percent={percent} size={44} strokeWidth={5} color={low ? colors.danger : colors.success}>
                <Text className={`text-[10px] font-extrabold ${low ? 'text-danger' : 'text-success'}`}>{percent}%</Text>
              </ProgressRing>
            </View>
          )}
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.subtle} />
        </TouchableOpacity>

        {expanded && (
          <View className="px-4 pb-4 pt-3 border-t border-light-border bg-light/60">
            <Detail icon="mail-outline" label="Email" value={student.email} />
            <Detail icon="id-card-outline" label="PRN" value={student.prn || 'Not added yet'} />
            {student.rollNo ? <Detail icon="list-outline" label="Roll no." value={student.rollNo} /> : null}

            <View className="flex-row mt-3 mb-4">
              <Count label="Present" value={summary?.PRESENT ?? 0} tone="success" />
              <Count label="Absent" value={summary?.ABSENT ?? 0} tone="danger" />
              <Count label="Invalid" value={summary?.INVALID ?? 0} tone="warning" last={!summary?.EXCUSED} />
              {!!summary?.EXCUSED && <Count label="Excused" value={summary.EXCUSED} tone="info" last />}
            </View>

            <Button
              title="Remove from class"
              variant="dangerSoft"
              size="sm"
              icon="person-remove-outline"
              onPress={() => confirmRemove(student)}
              disabled={isUpdating}
            />
          </View>
        )}
      </Card>
    );
  };

  const renderRequest = (student: EnrolledStudent, isRemoved: boolean) => (
    <Card className="mb-3 p-4 flex-row items-center">
      <Avatar name={student.name} size={46} />
      <View className="flex-1 mx-3">
        <Text className="text-light-text font-bold text-[15px]" numberOfLines={1}>
          {student.name || 'Unnamed student'}
        </Text>
        <Text className="text-light-muted text-xs font-medium mt-0.5" numberOfLines={1}>
          {student.prn ? `PRN ${student.prn} · ` : ''}{student.email}
        </Text>
      </View>

      {!isRemoved && (
        <TouchableOpacity
          onPress={() => setStatus({ studentId: student.id, status: 'REJECTED' })}
          disabled={isUpdating}
          accessibilityRole="button"
          accessibilityLabel={`Reject ${student.name || 'student'}`}
          className="w-11 h-11 rounded-full bg-danger-bg items-center justify-center mr-2"
        >
          <Ionicons name="close" size={20} color={colors.danger} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={() => setStatus({ studentId: student.id, status: 'APPROVED' })}
        disabled={isUpdating}
        accessibilityRole="button"
        accessibilityLabel={`${isRemoved ? 'Add back' : 'Approve'} ${student.name || 'student'}`}
        className={`h-11 rounded-full items-center justify-center flex-row ${isRemoved ? 'px-4 bg-success-bg' : 'w-11 bg-success'}`}
      >
        <Ionicons name="checkmark" size={20} color={isRemoved ? colors.success : colors.white} />
        {isRemoved && <Text className="text-success text-sm font-bold ml-1">Add back</Text>}
      </TouchableOpacity>
    </Card>
  );

  const renderLeave = (leave: LeaveRequest) => {
    const days = leaveDays(leave.fromDate, leave.toDate);
    const waiting = leave.status === 'PENDING';
    const name = leave.student?.name || 'Unnamed student';

    return (
      <Card className="mb-3 p-4">
        <View className="flex-row items-center">
          <Avatar name={leave.student?.name} size={46} />
          <View className="flex-1 mx-3">
            <Text className="text-light-text font-bold text-[15px]" numberOfLines={1}>{name}</Text>
            <Text className="text-light-muted text-xs font-medium mt-0.5" numberOfLines={1}>
              {leave.student?.prn ? `PRN ${leave.student.prn}` : 'No PRN yet'}
              {leave.student?.rollNo ? ` · Roll ${leave.student.rollNo}` : ''}
            </Text>
          </View>
          {!waiting && (
            <StatusPill status={leave.status} label={leave.status === 'APPROVED' ? 'APPROVED' : 'NOT APPROVED'} />
          )}
        </View>

        <View className="flex-row items-center mt-3">
          <Ionicons name="calendar-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
          <Text className="text-light-text text-sm font-semibold">
            {formatLeaveRange(leave.fromDate, leave.toDate)}
            <Text className="text-light-muted font-medium"> · {days} {days === 1 ? 'day' : 'days'}</Text>
          </Text>
        </View>
        <Text className="text-light-muted text-sm font-medium mt-2">{leave.reason}</Text>

        {leave.reviewNote ? (
          <Text className="text-light-subtle text-xs font-medium mt-2">Your note: {leave.reviewNote}</Text>
        ) : null}

        {waiting ? (
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
              onPress={() => review({ id: leave.id, status: 'APPROVED' })}
              className="flex-1"
            />
          </View>
        ) : leave.status === 'APPROVED' ? (
          <Button
            title="Take back approval"
            variant="ghost"
            size="sm"
            onPress={() => confirmRevoke(leave)}
            className="mt-2 self-start"
          />
        ) : (
          <Button
            title="Approve instead"
            variant="ghost"
            size="sm"
            onPress={() => review({ id: leave.id, status: 'APPROVED' })}
            className="mt-2 self-start"
          />
        )}
      </Card>
    );
  };

  const renderLecture = (session: SubjectSession) => {
    const start = new Date(session.startTime);
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push(`/lecture-detail?id=${session.id}` as any)}
      >
        <Card className="mb-3 p-4 flex-row items-center">
          <View className="w-12 h-14 rounded-2xl bg-light-primaryBg items-center justify-center mr-3">
            <Text className="text-primary text-[10px] font-bold uppercase tracking-wide">
              {start.toLocaleDateString('en-GB', { month: 'short' })}
            </Text>
            <Text className="text-primary text-lg font-extrabold">{start.getDate()}</Text>
          </View>
          <View className="flex-1 mr-2">
            <Text className="text-light-text font-bold text-[15px]">
              {start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
            <Text className="text-light-muted text-xs font-medium mt-0.5">
              {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </Text>
          </View>
          {session.isActive && (
            <View className="bg-success-bg px-3 h-8 rounded-full mr-2 flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-success mr-2" />
              <Text className="text-success text-[11px] font-bold tracking-wide">LIVE</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
        </Card>
      </TouchableOpacity>
    );
  };

  const emptyText =
    tab === 'students'
      ? search || onlyLow
        ? 'No students match.'
        : `No students yet. Share the code ${subject.code} so they can enroll, then approve them under Requests.`
      : tab === 'requests'
        ? 'No requests waiting for you.'
        : tab === 'leaves'
          ? 'No leave requests. When a student applies, it appears here.'
          : 'No lectures yet. Start attendance from the Classes tab.';

  return (
    <View className="flex-1 bg-light">
      <ScreenHeader
        title={subject.name}
        subtitle={subjectSubtitle(subject)}
        right={
          <View className="flex-row ml-3">
            <HeaderButton icon="create-outline" label="Edit subject" onPress={() => setShowEdit(true)} />
            <HeaderButton icon="share-social-outline" label="Share subject code" onPress={() => void shareSubjectCode(subject)} />
            <HeaderButton icon="copy-outline" label="Duplicate subject" onPress={() => setShowDuplicate(true)} />
            <HeaderButton icon="trash-outline" label="Delete subject" onPress={confirmDelete} busy={deleting} />
          </View>
        }
      >
        {/* Numbers at a glance */}
        <View className="flex-row mt-5">
          <Stat value={approved.length} label="Students" />
          <Stat value={pending.length} label="Requests" highlight={pending.length > 0} />
          <Stat value={lowCount} label={`Below ${MIN_ATTENDANCE_PERCENT}%`} highlight={lowCount > 0} last />
        </View>
      </ScreenHeader>

      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Section switch */}
            <SegmentedControl options={tabs} value={tab} onChange={setTab} className="mb-4" />

            {tab === 'requests' && pending.length > 1 && (
              <Button
                title={`Approve all (${pending.length})`}
                icon="checkmark-done-outline"
                onPress={confirmApproveAll}
                loading={isApprovingAll}
                disabled={isUpdating}
                className="mb-4"
              />
            )}

            {tab === 'leaves' && pendingLeaves.length > 1 && (
              <Button
                title={`Approve all (${pendingLeaves.length})`}
                icon="checkmark-done-outline"
                onPress={confirmApproveAllLeaves}
                loading={isApprovingAllLeaves}
                className="mb-4"
              />
            )}

            {tab === 'students' && approved.length > 0 && (
              <View className="mb-4">
                <View className="flex-row items-center bg-light-card border border-light-border rounded-2xl px-4 h-[52px] mb-3">
                  <Ionicons name="search" size={18} color={colors.subtle} style={{ marginRight: 10 }} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search by name, PRN or roll no."
                    placeholderTextColor={colors.subtle}
                    selectionColor={colors.primary}
                    autoCorrect={false}
                    className="flex-1 text-light-text font-medium text-[15px] h-full"
                  />
                  {search ? (
                    <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Clear search">
                      <Ionicons name="close-circle" size={18} color={colors.subtle} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Chip
                  label={`Below ${MIN_ATTENDANCE_PERCENT}% · ${lowCount}`}
                  icon="alert-circle-outline"
                  tone="danger"
                  selected={onlyLow}
                  onPress={() => setOnlyLow(!onlyLow)}
                  className="self-start"
                />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ListSkeleton count={3} className="pt-2" />
          ) : (
            <EmptyState
              icon={loadFailed ? 'cloud-offline-outline' : tab === 'lectures' || tab === 'leaves' ? 'calendar-outline' : 'people-outline'}
              tone={loadFailed ? 'danger' : 'primary'}
              text={loadFailed ? 'Could not load this. Pull down to try again.' : emptyText}
            />
          )
        }
        renderItem={({ item }) => {
          switch (item.kind) {
            case 'label':
              return <SectionLabel className="mt-3 mb-3 ml-1">{item.text}</SectionLabel>;
            case 'student':
              return renderStudent(item.student);
            case 'request':
              return renderRequest(item.student, false);
            case 'removed':
              return renderRequest(item.student, true);
            case 'leave':
              return renderLeave(item.leave);
            case 'lecture':
              return renderLecture(item.session);
          }
        }}
      />

      <LeaveRejectSheet
        visible={!!rejecting}
        studentName={rejecting?.student?.name || 'The student'}
        onClose={() => setRejecting(null)}
        onConfirm={(note) => {
          if (rejecting) review({ id: rejecting.id, status: 'REJECTED', note });
          setRejecting(null);
        }}
      />

      <CreateSubjectModal
        visible={showEdit}
        subject={subject}
        onClose={() => setShowEdit(false)}
        onSuccess={() => {
          setShowEdit(false);
          queryClient.invalidateQueries({ queryKey: ['subjects'] });
          queryClient.invalidateQueries({ queryKey: ['recent-sessions'] });
        }}
      />

      <CreateSubjectModal
        visible={showDuplicate}
        prefill={{ name: subject.name, type: subject.type, span: subject.span }}
        onClose={() => setShowDuplicate(false)}
        onSuccess={(_type, created) => {
          setShowDuplicate(false);
          queryClient.invalidateQueries({ queryKey: ['subjects'] });
          offerToShareSubject(created, 'Copy created');
        }}
      />
    </View>
  );
}

/** A round icon button in the page header. */
function HeaderButton({
  icon,
  label,
  onPress,
  busy,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  busy?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="w-10 h-10 bg-white/10 border border-white/15 rounded-full items-center justify-center ml-2"
    >
      {busy ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name={icon} size={17} color={colors.white} />}
    </TouchableOpacity>
  );
}

/** One number in the header. `highlight` marks a count that needs the faculty's attention. */
function Stat({ value, label, highlight, last }: { value: number; label: string; highlight?: boolean; last?: boolean }) {
  return (
    <View className={`flex-1 bg-white/10 border border-white/10 rounded-2xl py-3 items-center ${last ? '' : 'mr-2'}`}>
      <View className="flex-row items-center">
        {highlight ? <View className="w-2 h-2 rounded-full bg-gold mr-1.5" /> : null}
        <Text className="text-white text-xl font-extrabold">{value}</Text>
      </View>
      <Text className="text-white/60 text-[11px] font-semibold mt-0.5">{label}</Text>
    </View>
  );
}

function Detail({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View className="flex-row items-center py-1.5">
      <Ionicons name={icon} size={16} color={colors.muted} style={{ marginRight: 10 }} />
      <Text className="text-light-muted text-xs font-medium w-16">{label}</Text>
      <Text className="text-light-text text-sm font-semibold flex-1" selectable>{value}</Text>
    </View>
  );
}

function Count({ label, value, tone, last }: { label: string; value: number; tone: 'success' | 'danger' | 'warning' | 'info'; last?: boolean }) {
  const styles = {
    success: { bg: 'bg-success-bg', text: 'text-success' },
    danger: { bg: 'bg-danger-bg', text: 'text-danger' },
    warning: { bg: 'bg-warning-bg', text: 'text-warning' },
    info: { bg: 'bg-info-bg', text: 'text-info' },
  }[tone];
  return (
    <View className={`flex-1 rounded-2xl p-3 items-center ${styles.bg} ${last ? '' : 'mr-2'}`}>
      <Text className={`font-extrabold text-lg ${styles.text}`}>{value}</Text>
      <Text className={`text-xs font-semibold ${styles.text}`}>{label}</Text>
    </View>
  );
}
