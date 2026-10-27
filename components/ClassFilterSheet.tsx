import React from 'react';
import { View, ScrollView } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Chip } from './Chip';
import { SegmentedControl } from './SegmentedControl';
import { Text } from './Text';
import { OTHER_YEAR, currentAcademicYear, type Term } from '../utils/academicYear';
import { NO_FILTERS, activeFilterCount, type ClassFilters } from '../utils/classesView';

interface ClassFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: ClassFilters;
  onChange: (filters: ClassFilters) => void;
  /** Academic years the faculty has subjects in (OTHER_YEAR for those without one) */
  years: string[];
  counts: { all: number; theory: number; practical: number };
  /** Recent classes: the faculty's subjects, offered as a "Subject" filter */
  subjects?: { id: number; name: string; code: string; type: string }[];
}

const MAX_CHIP_NAME = 24;

/** The subject's name, cut short for a chip. Subjects sharing a name get their type added so they stay apart. */
function subjectChipLabel(
  subject: { id: number; name: string; type: string },
  all: { id: number; name: string }[]
): string {
  const name = subject.name.length > MAX_CHIP_NAME ? `${subject.name.slice(0, MAX_CHIP_NAME - 1).trimEnd()}…` : subject.name;
  const shared = all.some((other) => other.id !== subject.id && other.name === subject.name);
  return shared ? `${name} · ${subject.type === 'practical' ? 'Practical' : 'Theory'}` : name;
}

const TERM_OPTIONS = [
  { key: 'all', label: 'Both' },
  { key: 'Odd', label: 'Odd' },
  { key: 'Even', label: 'Even' },
];

/** Type, academic year and semester filters for the faculty's Classes list. Changes apply as they are made. */
export function ClassFilterSheet({ visible, onClose, filters, onChange, years, counts, subjects }: ClassFilterSheetProps) {
  const typeOptions = [
    { key: 'all', label: 'All', badge: undefined },
    { key: 'theory', label: 'Theory', badge: undefined },
    { key: 'practical', label: 'Practical', badge: undefined },
  ];
  const current = currentAcademicYear();
  const active = activeFilterCount(filters);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Filters" subtitle="Narrow down your subjects.">
      <Text className="text-light-text font-semibold mb-2 ml-1 text-[13px]">
        Type · {filters.category ? counts[filters.category] : counts.all}
      </Text>
      <SegmentedControl
        options={typeOptions}
        value={filters.category ?? 'all'}
        onChange={(key) => onChange({ ...filters, category: key === 'all' ? null : (key as 'theory' | 'practical') })}
        className="mb-5"
      />

      {years.length > 0 && (
        <>
          <Text className="text-light-text font-semibold mb-2 ml-1 text-[13px]">Academic year</Text>
          <View className="flex-row flex-wrap mb-3">
            <Chip label="All years" selected={filters.year === null} onPress={() => onChange({ ...filters, year: null })} className="mr-2 mb-2" />
            {years.map((year) => (
              <Chip
                key={year}
                label={year === OTHER_YEAR ? 'Other' : year === current ? `${year} · Current` : year}
                selected={filters.year === year}
                onPress={() => onChange({ ...filters, year })}
                className="mr-2 mb-2"
              />
            ))}
          </View>
        </>
      )}

      {subjects && subjects.length > 0 && (
        <>
          <Text className="text-light-text font-semibold mb-2 ml-1 text-[13px]">Subject</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 -mx-6" contentContainerStyle={{ paddingHorizontal: 24 }}>
            <Chip label="All subjects" selected={!filters.subjectId} onPress={() => onChange({ ...filters, subjectId: null })} className="mr-2" />
            {subjects.map((s) => (
              <Chip
                key={s.id}
                label={subjectChipLabel(s, subjects)}
                selected={filters.subjectId === s.id}
                onPress={() => onChange({ ...filters, subjectId: s.id })}
                className="mr-2"
              />
            ))}
          </ScrollView>
        </>
      )}

      <Text className="text-light-text font-semibold mb-2 ml-1 text-[13px]">Semester</Text>
      <SegmentedControl
        options={TERM_OPTIONS}
        value={filters.term ?? 'all'}
        onChange={(key) => onChange({ ...filters, term: key === 'all' ? null : (key as Term) })}
        className="mb-6"
      />

      <View className="flex-row">
        <Button
          title="Clear all"
          variant="outline"
          onPress={() => onChange(NO_FILTERS)}
          disabled={active === 0}
          className="flex-1 mr-3"
        />
        <Button title="Done" onPress={onClose} className="flex-1" />
      </View>
    </BottomSheet>
  );
}
