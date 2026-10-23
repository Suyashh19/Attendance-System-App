import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { showAlert } from '../store/dialogStore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { Text } from './Text';
import { BottomSheet } from './BottomSheet';
import type { Subject } from '../types';
import { colors } from '../constants/theme';

interface ExportFilterModalProps {
  visible: boolean;
  onClose: () => void;
  subjects: Subject[];
  initialSubjectId?: number;
  onConfirm: (filters: {
    subjectId: number;
    startDate?: string;
    endDate?: string;
    sessionIds?: number[]
  }) => void;
  loading?: boolean;
}

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function ExportFilterModal({ visible, onClose, subjects, initialSubjectId, onConfirm, loading }: ExportFilterModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(() => {
    if (initialSubjectId) {
      return subjects.find(s => s.id === initialSubjectId) || (subjects.length > 0 ? subjects[0] : null);
    }
    return subjects.length > 0 ? subjects[0] : null;
  });
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // last 30 days
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Each time the sheet opens, start on the subject whose download button was tapped
  useEffect(() => {
    if (!visible) return;
    setSelectedSubject(subjects.find(s => s.id === initialSubjectId) || subjects[0] || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialSubjectId]);

  const handleConfirm = () => {
    if (!selectedSubject) {
      showAlert('No Subject Selected', 'Please select a subject to export data for.');
      return;
    }
    if (endDate < startDate) {
      showAlert('Invalid Range', 'The "To" date must be on or after the "From" date.');
      return;
    }

    // Whole days: from the first minute of the start date to the last minute of the end date
    const from = new Date(startDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(endDate);
    to.setHours(23, 59, 59, 999);

    onConfirm({
      subjectId: Number(selectedSubject.id),
      startDate: from.toISOString(),
      endDate: to.toISOString(),
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Export Attendance"
      subtitle={selectedSubject ? selectedSubject.name : 'Choose a subject and a date range.'}
    >
      {/* Subject Selection */}
      <Text className="text-light-muted font-bold text-xs tracking-widest mb-3">SELECT SUBJECT</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-6 -mx-6" contentContainerStyle={{ paddingHorizontal: 24 }}>
        {subjects.map(s => {
          const selected = selectedSubject?.id === s.id;
          return (
            <TouchableOpacity
              key={s.id}
              onPress={() => setSelectedSubject(s)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className="mr-2 px-4 h-11 rounded-full flex-row items-center"
              style={{
                borderWidth: 1.5,
                backgroundColor: selected ? colors.primaryBg : colors.bg,
                borderColor: selected ? colors.primary : colors.border,
              }}
            >
              {selected && <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={{ marginRight: 6 }} />}
              <Text className="font-bold text-sm" style={{ color: selected ? colors.primary : colors.text }}>
                {s.code}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Date Filters */}
      <Text className="text-light-muted font-bold text-xs tracking-widest mb-3">DATE RANGE</Text>
      <View className="flex-row items-center mb-6">
        <TouchableOpacity
          onPress={() => setShowStartPicker(true)}
          activeOpacity={0.8}
          accessibilityLabel={`From date, ${formatDate(startDate)}`}
          className="flex-1 bg-light p-4 rounded-2xl border border-light-border"
        >
          <View className="flex-row items-center mb-1.5">
            <Ionicons name="calendar-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
            <Text className="text-light-muted text-[10px] font-bold tracking-widest">FROM</Text>
          </View>
          <Text className="text-light-text font-bold text-[15px]">{formatDate(startDate)}</Text>
        </TouchableOpacity>

        <Ionicons name="arrow-forward" size={16} color={colors.subtle} style={{ marginHorizontal: 8 }} />

        <TouchableOpacity
          onPress={() => setShowEndPicker(true)}
          activeOpacity={0.8}
          accessibilityLabel={`To date, ${formatDate(endDate)}`}
          className="flex-1 bg-light p-4 rounded-2xl border border-light-border"
        >
          <View className="flex-row items-center mb-1.5">
            <Ionicons name="calendar-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
            <Text className="text-light-muted text-[10px] font-bold tracking-widest">TO</Text>
          </View>
          <Text className="text-light-text font-bold text-[15px]">{formatDate(endDate)}</Text>
        </TouchableOpacity>
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowStartPicker(false);
            if (date) setStartDate(date);
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowEndPicker(false);
            if (date) setEndDate(date);
          }}
        />
      )}

      <View className="bg-light-primaryBg p-4 rounded-2xl flex-row">
        <View className="w-10 h-10 rounded-xl bg-white items-center justify-center mr-3">
          <Ionicons name="document-text" size={18} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-primary font-bold text-sm mb-1">What you get</Text>
          <Text className="text-light-muted text-xs leading-[18px]">
            An Excel sheet listing every student (PRN, name, email) with their status for each lecture in the selected dates.
          </Text>
        </View>
      </View>

      <Button
        title="Download Excel"
        icon="download-outline"
        onPress={handleConfirm}
        loading={loading}
        className="mt-6"
      />
    </BottomSheet>
  );
}
