import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { showAlert } from '../store/dialogStore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { Chip } from './Chip';
import { Text } from './Text';
import { BottomSheet } from './BottomSheet';
import type { Subject } from '../types';
import { colors } from '../constants/theme';
import { subjectSubtitle } from '../utils/subjectText';
import { RANGE_PRESETS, presetRange, type RangeKey } from '../utils/exportRange';

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
  const [rangeKey, setRangeKey] = useState<RangeKey>('30d');
  const [startDate, setStartDate] = useState(() => presetRange('30d').from);
  const [endDate, setEndDate] = useState(() => presetRange('30d').to);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [choosingSubject, setChoosingSubject] = useState(false);

  const pickPreset = (key: Exclude<RangeKey, 'custom'>) => {
    const { from, to } = presetRange(key);
    setRangeKey(key);
    setStartDate(from);
    setEndDate(to);
  };

  // Each time the sheet opens, start on the subject whose download button was tapped, and the last 30 days
  useEffect(() => {
    if (!visible) return;
    setSelectedSubject(subjects.find(s => s.id === initialSubjectId) || subjects[0] || null);
    setChoosingSubject(false);
    pickPreset('30d');
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
      title="Download report"
      subtitle="An Excel sheet of every student's status for each lecture."
    >
      {/* Subject: the chosen one as a card, with the full list one tap away */}
      <Text className="text-light-muted font-bold text-xs tracking-widest mb-2">SUBJECT</Text>
      <TouchableOpacity
        onPress={() => setChoosingSubject((open) => !open)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={selectedSubject ? `Subject ${selectedSubject.name}. Tap to change` : 'Choose a subject'}
        className="flex-row items-center bg-light rounded-2xl border border-light-border px-4 py-3 mb-5"
      >
        <View className="flex-1 mr-3">
          <Text className="text-light-text font-bold text-[15px]" numberOfLines={1}>
            {selectedSubject?.name ?? 'Choose a subject'}
          </Text>
          {selectedSubject && (
            <Text className="text-light-muted text-xs font-medium mt-0.5" numberOfLines={1}>
              {subjectSubtitle(selectedSubject)}
            </Text>
          )}
        </View>
        <Text className="text-primary text-xs font-bold mr-1">{choosingSubject ? 'Close' : 'Change'}</Text>
        <Ionicons name={choosingSubject ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
      </TouchableOpacity>

      {choosingSubject && (
        <ScrollView className="mb-5 -mt-2 max-h-[220px]" nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {subjects.map((s) => {
            const selected = selectedSubject?.id === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => { setSelectedSubject(s); setChoosingSubject(false); }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className={`flex-row items-center px-4 py-3 mb-2 rounded-2xl border ${selected ? 'bg-light-primaryBg border-primary' : 'bg-light-card border-light-border'}`}
              >
                <View className="flex-1 mr-3">
                  <Text className={`font-bold text-sm ${selected ? 'text-primary' : 'text-light-text'}`} numberOfLines={1}>{s.name}</Text>
                  <Text className="text-light-muted text-xs font-medium mt-0.5" numberOfLines={1}>{subjectSubtitle(s)}</Text>
                </View>
                {selected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Dates: quick ranges first, exact dates underneath */}
      <Text className="text-light-muted font-bold text-xs tracking-widest mb-2">DATE RANGE</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 -mx-6" contentContainerStyle={{ paddingHorizontal: 24 }}>
        {RANGE_PRESETS.map(({ key, label }) => (
          <Chip key={key} label={label} selected={rangeKey === key} onPress={() => pickPreset(key)} className="mr-2" />
        ))}
      </ScrollView>

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
            if (date) { setStartDate(date); setRangeKey('custom'); }
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
            if (date) { setEndDate(date); setRangeKey('custom'); }
          }}
        />
      )}

      <Button
        title="Download Excel"
        icon="download-outline"
        onPress={handleConfirm}
        loading={loading}
        disabled={!selectedSubject}
      />
    </BottomSheet>
  );
}
