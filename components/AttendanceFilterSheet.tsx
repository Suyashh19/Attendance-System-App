import React from 'react';
import { View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { SegmentedControl } from './SegmentedControl';
import { Text } from './Text';
import {
  NO_LIST_FILTERS,
  listFilterCount,
  type StatusFilter,
  type StudentListFilters,
} from '../utils/historyView';

interface AttendanceFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: StudentListFilters;
  onChange: (filters: StudentListFilters) => void;
  /** Subjects of the chosen semester, per group, shown as small counts */
  counts: { all: number; theory: number; practical: number; below: number; ok: number };
}

/** Type and standing filters for a student's subject list. Changes apply as they are made. */
export function AttendanceFilterSheet({ visible, onClose, filters, onChange, counts }: AttendanceFilterSheetProps) {
  const typeOptions = [
    { key: 'all', label: 'All', badge: undefined },
    { key: 'theory', label: 'Theory', badge: undefined },
    { key: 'practical', label: 'Practical', badge: undefined },
  ];
  const statusOptions: { key: StatusFilter; label: string; badge?: number }[] = [
    { key: 'all', label: 'All' },
    { key: 'below', label: 'Needs attention', badge: counts.below },
    { key: 'ok', label: 'On track' },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Filters" subtitle="Narrow down the subject list below.">
      <Text className="text-light-text font-semibold mb-2 ml-1 text-[13px]">
        Type · {filters.category ? counts[filters.category] : counts.all}
      </Text>
      <SegmentedControl
        options={typeOptions}
        value={filters.category ?? 'all'}
        onChange={(key) => onChange({ ...filters, category: key === 'all' ? null : (key as 'theory' | 'practical') })}
        className="mb-5"
      />

      <Text className="text-light-text font-semibold mb-2 ml-1 text-[13px]">Standing</Text>
      <SegmentedControl
        options={statusOptions}
        value={filters.status}
        onChange={(status) => onChange({ ...filters, status })}
        className="mb-6"
      />

      <View className="flex-row">
        <Button
          title="Clear all"
          variant="outline"
          onPress={() => onChange(NO_LIST_FILTERS)}
          disabled={listFilterCount(filters) === 0}
          className="flex-1 mr-3"
        />
        <Button title="Done" onPress={onClose} className="flex-1" />
      </View>
    </BottomSheet>
  );
}
