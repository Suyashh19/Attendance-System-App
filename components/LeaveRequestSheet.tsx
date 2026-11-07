import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../store/dialogStore';
import { applyForLeave } from '../services/leaves';
import { getErrorMessage } from '../services/api';
import { colors } from '../constants/theme';
import type { Subject } from '../types';
import {
  MAX_REASON_LENGTH,
  formatLeaveRange,
  fromDayString,
  leaveDays,
  leaveFormError,
  pickerBounds,
  toDayString,
} from '../utils/leaveForm';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Chip } from './Chip';
import { Text } from './Text';

interface LeaveRequestSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Subjects the student is approved in */
  subjects: Subject[];
  /** Called after the request was sent */
  onSent: () => void;
}

const dateLabel = (day: string) =>
  fromDayString(day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/** Ask for leave: which subjects, which days, and why. One request is sent per subject. */
export function LeaveRequestSheet({ visible, onClose, subjects, onSent }: LeaveRequestSheetProps) {
  const [subjectIds, setSubjectIds] = useState<number[]>([]);
  const [fromDay, setFromDay] = useState(() => toDayString(new Date()));
  const [toDay, setToDay] = useState(() => toDayString(new Date()));
  const [reason, setReason] = useState('');
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const [sending, setSending] = useState(false);

  // Each time the sheet opens it starts fresh: every subject, today, no reason
  useEffect(() => {
    if (!visible) return;
    const today = toDayString(new Date());
    setSubjectIds(subjects.map((s) => s.id));
    setFromDay(today);
    setToDay(today);
    setReason('');
    setPicking(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const { min, max } = pickerBounds();
  const allSelected = subjects.length > 0 && subjectIds.length === subjects.length;
  const days = leaveDays(fromDay, toDay);

  const toggleSubject = (id: number) =>
    setSubjectIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const send = async () => {
    const problem = leaveFormError({ subjectIds, fromDay, toDay, reason }, toDayString(new Date()));
    if (problem) {
      showAlert('Check your request', problem);
      return;
    }
    try {
      setSending(true);
      await applyForLeave({ subjectIds, fromDate: fromDay, toDate: toDay, reason: reason.trim() });
      onSent();
    } catch (err) {
      showAlert('Could not send request', getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Apply for leave"
      subtitle="Your faculty approve it. Classes you miss on approved days are excused."
    >
      <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-light-muted font-bold text-xs tracking-widest">SUBJECTS</Text>
          {subjects.length > 1 && (
            <TouchableOpacity
              onPress={() => setSubjectIds(allSelected ? [] : subjects.map((s) => s.id))}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
            >
              <Text className="text-primary text-xs font-bold">{allSelected ? 'Clear' : 'Select all'}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View className="flex-row flex-wrap mb-3">
          {subjects.map((s) => (
            <Chip
              key={s.id}
              label={s.name.length > 22 ? `${s.name.slice(0, 21).trimEnd()}…` : s.name}
              selected={subjectIds.includes(s.id)}
              onPress={() => toggleSubject(s.id)}
              className="mr-2 mb-2"
            />
          ))}
        </View>

        <Text className="text-light-muted font-bold text-xs tracking-widest mb-2">DATES</Text>
        <View className="flex-row items-center mb-2">
          {([['from', 'FROM', fromDay], ['to', 'TO', toDay]] as const).map(([which, label, day], i) => (
            <React.Fragment key={which}>
              {i === 1 && <Ionicons name="arrow-forward" size={16} color={colors.subtle} style={{ marginHorizontal: 8 }} />}
              <TouchableOpacity
                onPress={() => setPicking(which)}
                activeOpacity={0.8}
                accessibilityLabel={`${label === 'FROM' ? 'First' : 'Last'} day, ${dateLabel(day)}`}
                className="flex-1 bg-light p-4 rounded-2xl border border-light-border"
              >
                <View className="flex-row items-center mb-1.5">
                  <Ionicons name="calendar-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text className="text-light-muted text-[10px] font-bold tracking-widest">{label}</Text>
                </View>
                <Text className="text-light-text font-bold text-[15px]">{dateLabel(day)}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
        <Text className="text-light-muted text-xs font-medium mb-4 ml-1">
          {formatLeaveRange(fromDay, toDay)} · {days} {days === 1 ? 'day' : 'days'}
        </Text>

        {picking && (
          <DateTimePicker
            value={fromDayString(picking === 'from' ? fromDay : toDay)}
            mode="date"
            minimumDate={picking === 'to' ? fromDayString(fromDay) : min}
            maximumDate={max}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_event, date) => {
              const which = picking;
              setPicking(null);
              if (!date || !which) return;
              const day = toDayString(date);
              if (which === 'from') {
                setFromDay(day);
                // The last day never sits before the first
                if (toDay < day) setToDay(day);
              } else {
                setToDay(day);
              }
            }}
          />
        )}

        <Text className="text-light-muted font-bold text-xs tracking-widest mb-2">REASON</Text>
        <View className="bg-light rounded-2xl border border-light-border px-4 py-3 mb-1">
          <TextInput
            value={reason}
            onChangeText={(t) => setReason(t.slice(0, MAX_REASON_LENGTH))}
            placeholder="e.g. Fever, doctor advised rest"
            placeholderTextColor={colors.subtle}
            selectionColor={colors.primary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="text-light-text font-medium text-[15px]"
            style={{ minHeight: 70 }}
          />
        </View>
        <Text className="text-light-subtle text-[11px] font-medium text-right mb-4">
          {reason.length}/{MAX_REASON_LENGTH}
        </Text>
      </ScrollView>

      <View className="flex-row">
        <Button title="Cancel" variant="outline" onPress={onClose} disabled={sending} className="flex-1 mr-3" />
        <Button title="Send request" icon="paper-plane-outline" onPress={send} loading={sending} className="flex-1" />
      </View>
    </BottomSheet>
  );
}
