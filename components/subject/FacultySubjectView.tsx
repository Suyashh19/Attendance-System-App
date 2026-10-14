import React, { useMemo, useState } from 'react';
import { View, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getSubjectEnrollments,
  getSubjectAnalytics,
  getSubjectSessions,
  updateEnrollmentStatus,
  deleteSubject,
} from '../../services/attendance';
import { getErrorMessage } from '../../services/api';
import { colors, MIN_ATTENDANCE_PERCENT } from '../../constants/theme';
import type { Subject, EnrolledStudent, StudentAttendanceSummary, SubjectSession } from '../../types';
import { ScreenHeader } from '../ScreenHeader';
import { Button } from '../Button';
import { Text } from '../Text';
import { Card } from '../Card';
import { Avatar } from '../Avatar';
import { Chip } from '../Chip';
import { ProgressRing } from '../ProgressRing';
import { SegmentedControl } from '../SegmentedControl';
import { EmptyState, SectionLabel } from '../EmptyState';

type Tab = 'students' | 'requests' | 'lectures';

type Row =
  | { kind: 'label'; key: string; text: string }
  | { kind: 'student'; key: string; student: EnrolledStudent }
  | { kind: 'request'; key: string; student: EnrolledStudent }
  | { kind: 'removed'; key: string; student: EnrolledStudent }
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
    onError: (err) => Alert.alert('Could not update', getErrorMessage(err, 'Please try again.')),
  });

  const confirmRemove = (student: EnrolledStudent) => {
    Alert.alert(
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

  const confirmDelete = () => {
    Alert.alert(
      'Delete Subject',
      `Are you sure you want to delete "${subject.name}"? This will permanently wipe all attendance data for this class.\n\nNote: If you want to keep a record of this data, download the Excel file from Reports first.`,
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
              Alert.alert('Error', getErrorMessage(err, 'Failed to delete subject'));
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

    return (sessions.data ?? []).map((session) => ({ kind: 'lecture' as const, key: `l-${session.id}`, session }));
    // percentOf reads summaryByStudent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, approved, pending, removed, sessions.data, search, onlyLow, summaryByStudent]);

  const isLoading =
    tab === 'lectures' ? sessions.isLoading : enrollments.isLoading;
  const loadFailed = tab === 'lectures' ? sessions.isError : enrollments.isError;

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'students', label: 'Students' },
    { key: 'requests', label: 'Requests', badge: pending.length },
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
              <Count label="Invalid" value={summary?.INVALID ?? 0} tone="warning" last />
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
        : 'No lectures yet. Start attendance from the Classes tab.';

  return (
    <View className="flex-1 bg-light">
      <ScreenHeader
        title={subject.name}
        subtitle={`${subject.code} · ${subject.type === 'practical' ? 'Practical' : 'Theory'}`}
        right={
          <TouchableOpacity
            onPress={confirmDelete}
            disabled={deleting}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Delete subject"
            className="w-11 h-11 bg-white/10 border border-white/15 rounded-full items-center justify-center ml-3"
          >
            {deleting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="trash-outline" size={18} color={colors.white} />
            )}
          </TouchableOpacity>
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
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
          ) : (
            <EmptyState
              icon={loadFailed ? 'cloud-offline-outline' : tab === 'lectures' ? 'calendar-outline' : 'people-outline'}
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
            case 'lecture':
              return renderLecture(item.session);
          }
        }}
      />
    </View>
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

function Count({ label, value, tone, last }: { label: string; value: number; tone: 'success' | 'danger' | 'warning'; last?: boolean }) {
  const styles = {
    success: { bg: 'bg-success-bg', text: 'text-success' },
    danger: { bg: 'bg-danger-bg', text: 'text-danger' },
    warning: { bg: 'bg-warning-bg', text: 'text-warning' },
  }[tone];
  return (
    <View className={`flex-1 rounded-2xl p-3 items-center ${styles.bg} ${last ? '' : 'mr-2'}`}>
      <Text className={`font-extrabold text-lg ${styles.text}`}>{value}</Text>
      <Text className={`text-xs font-semibold ${styles.text}`}>{label}</Text>
    </View>
  );
}
