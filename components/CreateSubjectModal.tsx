import React, { useEffect, useState, memo } from 'react';
import { View, ScrollView } from 'react-native';
import { showAlert } from '../store/dialogStore';
import { Button } from './Button';
import { Input } from './Input';
import { Text } from './Text';
import { BottomSheet } from './BottomSheet';
import { SegmentedControl } from './SegmentedControl';
import { Chip } from './Chip';
import { createSubject, updateSubject } from '../services/attendance';
import { getErrorMessage } from '../services/api';
import {
  academicYearOptions,
  currentAcademicYear,
  currentTerm,
  formatSpan,
  parseSpan,
  type Term,
} from '../utils/academicYear';
import type { Subject } from '../types';

type SubjectType = 'theory' | 'practical';

interface CreateSubjectModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called with the saved subject, so the caller can offer to share its code */
  onSuccess: (subjectType: SubjectType, saved: Subject) => void;
  /** Edit this subject instead of creating a new one */
  subject?: Subject;
  /** Start a new subject from another one's details (Duplicate). The code is left blank: it must be new. */
  prefill?: { name: string; type: SubjectType; span?: string | null };
}

const TYPES = [
  { key: 'theory' as const, label: 'Theory', icon: 'book-outline' as const },
  { key: 'practical' as const, label: 'Practical', icon: 'flask-outline' as const },
];

const TERM_OPTIONS = [
  { key: 'Odd' as const, label: 'Odd semester' },
  { key: 'Even' as const, label: 'Even semester' },
];

/** Year + term from a saved label. An old free-text label gives no year, so the faculty picks one. */
function splitSpan(span?: string | null): { year: string; term: Term } {
  const parsed = parseSpan(span);
  return { year: parsed?.year ?? '', term: parsed?.term ?? currentTerm() };
}

function initialValues(subject?: Subject, prefill?: CreateSubjectModalProps['prefill']) {
  if (subject) {
    return { name: subject.name, code: subject.code, type: subject.type, ...splitSpan(subject.span) };
  }
  if (prefill) {
    return { name: prefill.name, code: '', type: prefill.type, ...splitSpan(prefill.span) };
  }
  // A new subject starts on the running academic year and term
  return { name: '', code: '', type: 'theory' as SubjectType, year: currentAcademicYear(), term: currentTerm() };
}

export const CreateSubjectModal = memo(({ visible, onClose, onSuccess, subject, prefill }: CreateSubjectModalProps) => {
  const editing = !!subject;
  const [values, setValues] = useState(() => initialValues(subject, prefill));
  const [loading, setLoading] = useState(false);

  // The saved year is always offered, even when it has fallen out of the usual range
  const yearOptions = React.useMemo(() => {
    const options = academicYearOptions();
    return values.year && !options.includes(values.year) ? [...options, values.year] : options;
  }, [values.year]);

  // Each time the sheet opens it starts from the subject being edited, the duplicate, or blank
  useEffect(() => {
    if (visible) setValues(initialValues(subject, prefill));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSave = async () => {
    const name = values.name.trim();
    const code = values.code.trim();

    if (!name || !code) {
      showAlert('Missing details', 'Enter both a subject name and a subject code.');
      return;
    }

    const span = values.year ? formatSpan(values.year, values.term) : '';

    try {
      setLoading(true);
      let saved: Subject;

      if (subject) {
        // Send only what changed
        const changes: { name?: string; code?: string; type?: SubjectType; span?: string } = {};
        if (name !== subject.name) changes.name = name;
        if (code.toUpperCase() !== subject.code) changes.code = code;
        if (values.type !== subject.type) changes.type = values.type;
        // An old free-text label stays as it is until a year is picked to replace it
        const keepsOldLabel = !!subject.span && !parseSpan(subject.span) && !values.year;
        if (!keepsOldLabel && span !== (subject.span ?? '')) changes.span = span;

        if (Object.keys(changes).length === 0) {
          onClose();
          return;
        }
        saved = await updateSubject(subject.id, changes);
      } else {
        saved = await createSubject(name, code, values.type, span || undefined);
      }

      onSuccess(values.type, saved);
    } catch (err: any) {
      showAlert(
        editing ? 'Could not save changes' : 'Could not create subject',
        getErrorMessage(err, 'Something went wrong. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const title = editing ? 'Edit subject' : prefill ? 'Duplicate subject' : 'New subject';
  const subtitle = editing
    ? 'Students already in the class stay enrolled.'
    : prefill
      ? 'Give the copy a new code and check its academic year. It starts with no students.'
      : 'Students enroll with the subject code you set here.';

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      <Input
        label="Subject name"
        placeholder="e.g. Distributed Systems"
        icon="school-outline"
        value={values.name}
        onChangeText={(t) => setValues({ ...values, name: t })}
      />
      <Input
        label="Subject code"
        placeholder="e.g. CS402"
        icon="pricetag-outline"
        value={values.code}
        onChangeText={(t) => setValues({ ...values, code: t })}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <Text className="text-light-text font-semibold mb-2 ml-1 text-[13px]">Academic year (optional)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 -mx-6" contentContainerStyle={{ paddingHorizontal: 24 }}>
        {yearOptions.map((year) => (
          <Chip
            key={year}
            label={year === currentAcademicYear() ? `${year} · Current` : year}
            selected={values.year === year}
            // Tapping the chosen year again clears it
            onPress={() => setValues({ ...values, year: values.year === year ? '' : year })}
            className="mr-2"
          />
        ))}
      </ScrollView>
      {values.year ? (
        <SegmentedControl
          options={TERM_OPTIONS}
          value={values.term}
          onChange={(term) => setValues({ ...values, term })}
          className="mb-4"
        />
      ) : null}
      {subject?.span && !parseSpan(subject.span) && !values.year && (
        <Text className="text-light-muted text-xs font-medium -mt-1 mb-4 ml-1">
          Current label: {subject.span}. Pick an academic year to replace it.
        </Text>
      )}
      {editing && values.code.trim().toUpperCase() !== subject!.code && (
        <Text className="text-light-muted text-xs font-medium -mt-2 mb-4 ml-1">
          Students who join later must use the new code. Share it with them.
        </Text>
      )}

      <Text className="text-light-text font-semibold mb-2 ml-1 text-[13px]">Type</Text>
      <SegmentedControl
        options={TYPES}
        value={values.type}
        onChange={(type) => setValues({ ...values, type })}
        className="mb-6"
      />

      <View className="flex-row">
        <Button title="Cancel" variant="outline" onPress={onClose} disabled={loading} className="flex-1 mr-3" />
        <Button title={editing ? 'Save' : 'Create'} onPress={handleSave} className="flex-1" loading={loading} />
      </View>
    </BottomSheet>
  );
});
