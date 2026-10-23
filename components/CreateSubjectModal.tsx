import React, { useEffect, useState, memo } from 'react';
import { View } from 'react-native';
import { showAlert } from '../store/dialogStore';
import { Button } from './Button';
import { Input } from './Input';
import { Text } from './Text';
import { BottomSheet } from './BottomSheet';
import { SegmentedControl } from './SegmentedControl';
import { createSubject, updateSubject } from '../services/attendance';
import { getErrorMessage } from '../services/api';
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

const MAX_SPAN_LENGTH = 40;

function initialValues(subject?: Subject, prefill?: CreateSubjectModalProps['prefill']) {
  if (subject) {
    return { name: subject.name, code: subject.code, type: subject.type, span: subject.span ?? '' };
  }
  if (prefill) {
    return { name: prefill.name, code: '', type: prefill.type, span: prefill.span ?? '' };
  }
  return { name: '', code: '', type: 'theory' as SubjectType, span: '' };
}

export const CreateSubjectModal = memo(({ visible, onClose, onSuccess, subject, prefill }: CreateSubjectModalProps) => {
  const editing = !!subject;
  const [values, setValues] = useState(() => initialValues(subject, prefill));
  const [loading, setLoading] = useState(false);

  // Each time the sheet opens it starts from the subject being edited, the duplicate, or blank
  useEffect(() => {
    if (visible) setValues(initialValues(subject, prefill));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSave = async () => {
    const name = values.name.trim();
    const code = values.code.trim();
    const span = values.span.trim();

    if (!name || !code) {
      showAlert('Missing details', 'Enter both a subject name and a subject code.');
      return;
    }

    try {
      setLoading(true);
      let saved: Subject;

      if (subject) {
        // Send only what changed
        const changes: { name?: string; code?: string; type?: SubjectType; span?: string } = {};
        if (name !== subject.name) changes.name = name;
        if (code.toUpperCase() !== subject.code) changes.code = code;
        if (values.type !== subject.type) changes.type = values.type;
        if (span !== (subject.span ?? '')) changes.span = span;

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
      ? 'Give the copy a new code and semester. It starts with no students.'
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
      <Input
        label="Semester or academic year (optional)"
        placeholder="e.g. Sem 5 or 2026-27"
        icon="calendar-outline"
        value={values.span}
        onChangeText={(t) => setValues({ ...values, span: t.slice(0, MAX_SPAN_LENGTH) })}
        maxLength={MAX_SPAN_LENGTH}
      />
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
