import React, { useEffect, useState, memo } from 'react';
import { View, ScrollView, TouchableOpacity, Keyboard, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { TourTarget } from './onboarding/TourTarget';
import { UnoAvatar } from './onboarding/UnoAvatar';
import { useOnboardingStore } from '../store/onboardingStore';
import { INTERACTIVE_TOUR_STEPS } from '../constants/onboardingTour';
import { colors, shadow } from '../constants/theme';

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
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // Track keyboard open state so Uno's pinned card adapts cleanly without wasting screen space
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Onboarding assistant integration
  const isTourActive = useOnboardingStore((s) => s.isActive);
  const currentStepIndex = useOnboardingStore((s) => s.currentStepIndex);
  const advanceActionStep = useOnboardingStore((s) => s.advanceActionStep);
  const goToStepId = useOnboardingStore((s) => s.goToStepId);
  const setCreateModalOpen = useOnboardingStore((s) => s.setCreateModalOpen);

  const currentStep = INTERACTIVE_TOUR_STEPS[currentStepIndex];
  const isCreatingSubjectTask =
    isTourActive &&
    (currentStep?.id === 'tap_new_subject' ||
      currentStep?.id === 'enter_subject_name' ||
      currentStep?.id === 'enter_subject_code' ||
      currentStep?.id === 'pick_academic_term' ||
      currentStep?.id === 'tap_create_button');

  // Track create modal state so Uno knows whether to show in-modal pinned header or root floating bar
  useEffect(() => {
    setCreateModalOpen(visible);
    if (visible && isTourActive && currentStep?.id === 'tap_new_subject') {
      advanceActionStep('tap_new_subject');
    }
    return () => {
      setCreateModalOpen(false);
    };
  }, [visible, isTourActive, currentStep?.id, advanceActionStep, setCreateModalOpen]);

  const handleModalClose = () => {
    if (isTourActive && isCreatingSubjectTask) {
      goToStepId('tap_new_subject');
    }
    onClose();
  };

  // The saved year is always offered, even when it has fallen out of the usual range
  const yearOptions = React.useMemo(() => {
    const options = academicYearOptions();
    return values.year && !options.includes(values.year) ? [...options, values.year] : options;
  }, [values.year]);

  // Each time the sheet opens it starts from the subject being edited, the duplicate, or blank
  useEffect(() => {
    if (visible) setValues(initialValues(subject, prefill));
  }, [visible]);

  const handleNameChange = (text: string) => {
    setValues((prev) => ({ ...prev, name: text }));
    if (isTourActive && currentStep?.id === 'enter_subject_name' && text.trim().length >= 3) {
      advanceActionStep('enter_subject_name');
    }
  };

  const handleCodeChange = (text: string) => {
    setValues((prev) => ({ ...prev, code: text }));
    if (isTourActive && currentStep?.id === 'enter_subject_code' && text.trim().length >= 2) {
      advanceActionStep('enter_subject_code');
    }
  };

  const handleSave = async () => {
    const name = values.name.trim();
    const code = values.code.trim();

    if (!name || !code) {
      showAlert('Missing details', 'Enter both a subject name and a subject code.');
      return;
    }

    const hasOldLabel = !!subject?.span && !parseSpan(subject.span);
    if (!values.year && !hasOldLabel) {
      showAlert('Pick an academic year', 'Choose the academic year this subject belongs to.');
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

      if (isTourActive) {
        goToStepId('navigate_to_settings');
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
    ? 'Students already in the subject stay enrolled.'
    : prefill
      ? 'Give the copy a new code and check its academic year. It starts with no students.'
      : 'Students enroll with the subject code you set here.';

  // Pinned Uno Assistant guidance header card: stays permanently visible even when keyboard is open
  const unoPinnedHeader = isCreatingSubjectTask ? (
    <View
      className="bg-light-primaryBg border border-primary/30 rounded-2xl p-2.5"
      style={shadow.glow}
    >
      <View className="flex-row items-center mb-1">
        <UnoAvatar size="sm" />
        <Text className="text-primary font-extrabold text-xs ml-2">Uno Guide</Text>
        <View className="ml-auto bg-primary/15 px-2 py-0.5 rounded-full">
          <Text className="text-primary font-bold text-[10.5px]">
            {currentStep?.taskTitle}
          </Text>
        </View>
      </View>
      <Text
        className="text-light-text text-[12px] font-semibold leading-[16px]"
        numberOfLines={isKeyboardVisible ? 2 : undefined}
      >
        "{currentStep?.unoSpeech}"
      </Text>

      {currentStep?.id === 'pick_academic_term' && (
        <TouchableOpacity
          onPress={() => goToStepId('tap_create_button')}
          activeOpacity={0.8}
          className="bg-primary py-1 px-3 rounded-full self-start flex-row items-center mt-1.5"
        >
          <Text className="text-white text-xs font-bold mr-1">Ready to Create</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.white} />
        </TouchableOpacity>
      )}
    </View>
  ) : undefined;

  return (
    <BottomSheet
      visible={visible}
      onClose={handleModalClose}
      title={title}
      subtitle={isCreatingSubjectTask ? undefined : subtitle}
      headerExtra={unoPinnedHeader}
      scrollable
    >
      <TourTarget targetKey="tour_input_subject_name" borderRadius={14}>
        <Input
          label="Subject name"
          placeholder="e.g. Distributed Systems"
          icon="school-outline"
          value={values.name}
          onChangeText={handleNameChange}
        />
      </TourTarget>

      <TourTarget targetKey="tour_input_subject_code" borderRadius={14}>
        <Input
          label="Subject code"
          placeholder="e.g. CS402"
          icon="pricetag-outline"
          value={values.code}
          onChangeText={handleCodeChange}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </TourTarget>

      <TourTarget targetKey="tour_create_options" borderRadius={16}>
        <Text className="text-light-text font-semibold mb-2 ml-1 text-[13px]">Academic year</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 -mx-6" contentContainerStyle={{ paddingHorizontal: 24 }}>
          {yearOptions.map((year) => (
            <Chip
              key={year}
              label={year === currentAcademicYear() ? `${year} · Current` : year}
              selected={values.year === year}
              onPress={() => {
                setValues({ ...values, year });
                if (isTourActive && currentStep?.id === 'pick_academic_term') {
                  advanceActionStep('pick_academic_term');
                }
              }}
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
      </TourTarget>

      <View className="flex-row mt-1">
        <Button title="Cancel" variant="outline" onPress={handleModalClose} disabled={loading} className="flex-1 mr-3" />
        <TourTarget targetKey="tour_create_button" borderRadius={24} style={{ flex: 1 }}>
          <Button title={editing ? 'Save' : 'Create'} onPress={handleSave} loading={loading} />
        </TourTarget>
      </View>
    </BottomSheet>
  );
});
