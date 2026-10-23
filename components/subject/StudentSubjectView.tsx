import React, { useState } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { showAlert } from '../../store/dialogStore';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getAttendanceHistory, unenrollSubject } from '../../services/attendance';
import { getErrorMessage } from '../../services/api';
import { colors, classesNeeded, statusTone, MIN_ATTENDANCE_PERCENT } from '../../constants/theme';
import type { Subject } from '../../types';
import { ScreenHeader } from '../ScreenHeader';
import { StatusPill } from '../StatusPill';
import { Button } from '../Button';
import { Text } from '../Text';
import { Card } from '../Card';
import { ProgressRing } from '../ProgressRing';
import { SectionLabel } from '../EmptyState';

interface StudentSubjectViewProps {
  subject: Subject;
}

/** A student's own page for one subject: their percentage and every class so far. */
export function StudentSubjectView({ subject }: StudentSubjectViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const { data: history, isLoading, refetch } = useQuery({
    queryKey: ['history'],
    queryFn: getAttendanceHistory,
  });

  const record = history?.find((h) => Number(h.id) === subject.id);
  const present = record?.stats.PRESENT ?? 0;
  const total = record?.stats.total ?? 0;
  const percentage = total > 0 ? Math.round((present / total) * 100) : null;
  const low = percentage !== null && percentage < MIN_ATTENDANCE_PERCENT;
  const needed = classesNeeded(present, total);

  const approved = !subject.enrollmentStatus || subject.enrollmentStatus === 'APPROVED';

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ['subjects'] })]);
    } finally {
      setRefreshing(false);
    }
  };

  const confirmLeave = () => {
    showAlert(
      'Leave Class',
      `Are you sure you want to unenroll from "${subject.name}"? This will remove your attendance record for this subject.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unenroll Subject',
          style: 'destructive',
          onPress: async () => {
            try {
              setLeaving(true);
              await unenrollSubject(subject.id);
              router.back();
              queryClient.invalidateQueries({ queryKey: ['subjects'] });
              queryClient.invalidateQueries({ queryKey: ['history'] });
            } catch (err) {
              setLeaving(false);
              showAlert('Error', getErrorMessage(err, 'Failed to unenroll'));
            }
          },
        },
      ]
    );
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const tone = low ? colors.danger : colors.success;

  return (
    <View className="flex-1 bg-light">
      <ScreenHeader
        title={subject.name}
        subtitle={[
          subject.code,
          subject.type === 'practical' ? 'Practical' : 'Theory',
          subject.span,
          subject.faculty?.name,
        ].filter(Boolean).join(' · ')}
      />

      <FlatList
        data={approved ? record?.records ?? [] : []}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
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
          !approved ? (
            <Card className="p-6 items-center">
              <View className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${subject.enrollmentStatus === 'PENDING' ? 'bg-warning-bg' : 'bg-danger-bg'}`}>
                <Ionicons
                  name={subject.enrollmentStatus === 'PENDING' ? 'hourglass-outline' : 'close-circle-outline'}
                  size={34}
                  color={subject.enrollmentStatus === 'PENDING' ? colors.warning : colors.danger}
                />
              </View>
              <StatusPill status={subject.enrollmentStatus!} showIcon />
              <Text className="text-light-text font-extrabold text-lg mt-3 text-center">
                {subject.enrollmentStatus === 'PENDING' ? 'Waiting for approval' : 'Request not approved'}
              </Text>
              <Text className="text-light-muted text-sm leading-5 text-center mt-1">
                {subject.enrollmentStatus === 'PENDING'
                  ? 'Your faculty needs to approve your request before you can mark attendance for this class.'
                  : 'Your faculty did not approve this request. Speak to them if you think this is a mistake.'}
              </Text>
            </Card>
          ) : (
            <View>
              <Card className="p-5 mb-6">
                <SectionLabel>YOUR ATTENDANCE</SectionLabel>
                {percentage === null ? (
                  <View className="flex-row items-center mt-4">
                    <View className="w-12 h-12 rounded-2xl bg-light items-center justify-center mr-3">
                      <Ionicons name="calendar-outline" size={22} color={colors.subtle} />
                    </View>
                    <Text className="text-light-text font-bold text-base flex-1">No classes held yet</Text>
                  </View>
                ) : (
                  <>
                    <View className="flex-row items-center mt-4">
                      <ProgressRing percent={percentage} size={108} strokeWidth={11} color={tone}>
                        <Text className="text-[26px] font-extrabold" style={{ color: tone }}>{percentage}%</Text>
                      </ProgressRing>
                      <View className="flex-1 ml-5">
                        <Text className="text-light-text font-extrabold text-2xl">
                          {present}
                          <Text className="text-light-muted text-base font-semibold"> / {total}</Text>
                        </Text>
                        <Text className="text-light-muted text-xs font-medium mt-0.5">
                          {present} of {total} classes
                        </Text>
                        <View className="h-2 rounded-full bg-light-border overflow-hidden mt-3">
                          <View
                            className={`h-full rounded-full ${low ? 'bg-danger' : 'bg-success'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </View>
                      </View>
                    </View>
                    <View className={`flex-row items-center mt-4 rounded-2xl px-3 py-2.5 ${low ? 'bg-danger-bg' : 'bg-success-bg'}`}>
                      <Ionicons
                        name={low ? 'alert-circle' : 'checkmark-circle'}
                        size={16}
                        color={tone}
                        style={{ marginRight: 8 }}
                      />
                      <Text className={`text-xs font-semibold flex-1 ${low ? 'text-danger' : 'text-success'}`}>
                        {low
                          ? `Below ${MIN_ATTENDANCE_PERCENT}%. Attend the next ${needed} ${needed === 1 ? 'class' : 'classes'} to recover.`
                          : `You are above the ${MIN_ATTENDANCE_PERCENT}% minimum.`}
                      </Text>
                    </View>
                  </>
                )}
              </Card>

              {total > 0 && (
                <SectionLabel className="mb-3 ml-1">EVERY CLASS</SectionLabel>
              )}
            </View>
          )
        }
        ListEmptyComponent={
          approved && isLoading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} /> : null
        }
        renderItem={({ item }) => {
          const rowTone = statusTone(item.status);
          return (
            <Card className="p-4 mb-3 flex-row items-center">
              <View className="w-11 h-11 rounded-2xl items-center justify-center mr-3" style={{ backgroundColor: rowTone.bg }}>
                <Ionicons name={rowTone.icon} size={20} color={rowTone.text} />
              </View>
              <View className="flex-1 mr-3">
                <Text className="text-light-text font-bold text-sm">{formatDate(item.date)}</Text>
                <Text className="text-light-muted text-xs font-medium mt-0.5">{formatTime(item.date)}</Text>
                {item.status === 'INVALID' && item.reason ? (
                  <Text className="text-warning text-xs font-medium mt-1" numberOfLines={2}>{item.reason}</Text>
                ) : null}
              </View>
              <StatusPill status={item.status} />
            </Card>
          );
        }}
        ListFooterComponent={
          <Button
            title="Leave this class"
            variant="dangerSoft"
            icon="exit-outline"
            onPress={confirmLeave}
            loading={leaving}
            className="mt-4"
          />
        }
      />
    </View>
  );
}
