import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../store/dialogStore';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  DEFAULT_CALENDAR,
  MONTH_NAMES,
  monthShort,
  validateCalendar,
  type SemesterCalendar,
} from '../utils/academicYear';
import { sameCalendar, type HomeStart } from '../utils/settings';
import { colors } from '../constants/theme';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ChangePasswordRow } from '../components/ChangePasswordRow';
import { Chip } from '../components/Chip';
import { SectionLabel } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { Text } from '../components/Text';

type Field = keyof SemesterCalendar;

const FIELD_TITLES: Record<Field, string> = {
  oddStart: 'Odd semester starts in',
  oddEnd: 'Odd semester ends in',
  evenStart: 'Even semester starts in',
  evenEnd: 'Even semester ends in',
};

/** Account security for everyone; for faculty also the semester months and a few preferences kept on this phone. */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const isFaculty = useAuthStore((s) => s.user?.role) === 'faculty';

  const saved = useSettingsStore((s) => s.calendar);
  const confirmStart = useSettingsStore((s) => s.confirmStart);
  const homeStart = useSettingsStore((s) => s.homeStart);
  const update = useSettingsStore((s) => s.update);

  // Months are edited here and only take effect when saved
  const [draft, setDraft] = useState<SemesterCalendar>(saved);
  const [picking, setPicking] = useState<Field | null>(null);

  const problem = validateCalendar(draft);
  const changed = !sameCalendar(draft, saved);
  const isStandard = sameCalendar(draft, DEFAULT_CALENDAR);

  const saveMonths = () => {
    if (problem || !changed) return;
    update({ calendar: draft });
    showAlert('Saved', 'The semester months were updated. Your subjects now follow this calendar.');
  };

  const MonthRow = ({ field, label, last }: { field: Field; label: string; last?: boolean }) => (
    <TouchableOpacity
      onPress={() => setPicking(field)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${MONTH_NAMES[draft[field] - 1]}. Tap to change`}
      className={`px-4 h-14 flex-row items-center ${last ? '' : 'border-b border-light-border'}`}
    >
      <Text className="text-light-text font-semibold text-[15px] flex-1">{label}</Text>
      <Text className="text-primary font-bold text-[15px] mr-2">{MONTH_NAMES[draft[field] - 1]}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-light">
      <ScreenHeader title="Settings" subtitle={isFaculty ? 'Password, semester months and preferences' : 'Account security'} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel className="mb-3 ml-1">ACCOUNT</SectionLabel>
        <Card className="overflow-hidden mb-8">
          <ChangePasswordRow />
        </Card>

        {isFaculty && (
          <>
            <SectionLabel className="mb-1 ml-1">SEMESTER MONTHS</SectionLabel>
            <Text className="text-light-muted text-[13px] leading-5 ml-1 mb-3">
              Choose when your college's semesters run. The app uses this to decide which semester is current. Months
              between the two semesters count as part of the next one.
            </Text>

            <Card className="overflow-hidden mb-3">
              <View className="px-4 pt-3 pb-1 flex-row items-center">
                <Ionicons name="sunny-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Text className="text-light-text font-extrabold text-[15px]">Odd semester</Text>
              </View>
              <MonthRow field="oddStart" label="Starts" />
              <MonthRow field="oddEnd" label="Ends" last />
            </Card>

            <Card className="overflow-hidden mb-3">
              <View className="px-4 pt-3 pb-1 flex-row items-center">
                <Ionicons name="leaf-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Text className="text-light-text font-extrabold text-[15px]">Even semester</Text>
              </View>
              <MonthRow field="evenStart" label="Starts" />
              <MonthRow field="evenEnd" label="Ends" last />
            </Card>

            {problem ? (
              <View className="flex-row items-start bg-danger-bg rounded-2xl px-4 py-3 mb-3">
                <Ionicons name="alert-circle" size={16} color={colors.danger} style={{ marginRight: 8, marginTop: 1 }} />
                <Text className="text-danger text-[13px] font-semibold flex-1">{problem}</Text>
              </View>
            ) : (
              <Text className="text-light-muted text-xs font-medium ml-1 mb-3">
                The academic year runs {monthShort(draft.oddStart)} to {monthShort(draft.evenEnd)}.
                {isStandard ? ' These are the standard months.' : ''}
              </Text>
            )}

            <Button title="Save months" icon="checkmark" onPress={saveMonths} disabled={!!problem || !changed} />
            <Button
              title="Use standard months"
              variant="outline"
              icon="refresh"
              onPress={() => setDraft(DEFAULT_CALENDAR)}
              disabled={isStandard}
              className="mt-3"
            />

            <SectionLabel className="mt-8 mb-3 ml-1">PREFERENCES</SectionLabel>
            <Card className="overflow-hidden mb-3">
              <View className="px-4 py-4 flex-row items-center border-b border-light-border">
                <View className="flex-1 mr-3">
                  <Text className="text-light-text font-semibold text-[15px]">Ask before starting attendance</Text>
                  <Text className="text-light-muted text-xs font-medium mt-0.5">
                    Show a confirmation first. Turn off to start with one tap.
                  </Text>
                </View>
                <Switch
                  value={confirmStart}
                  onValueChange={(value) => update({ confirmStart: value })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                  accessibilityLabel="Ask before starting attendance"
                />
              </View>

              <View className="px-4 py-4">
                <Text className="text-light-text font-semibold text-[15px]">Open Subjects on</Text>
                <Text className="text-light-muted text-xs font-medium mt-0.5 mb-3">
                  Where the Subjects tab starts when you open it.
                </Text>
                <SegmentedControl<HomeStart>
                  options={[
                    { key: 'semester', label: 'Current semester' },
                    { key: 'years', label: 'Year list' },
                  ]}
                  value={homeStart}
                  onChange={(value) => update({ homeStart: value })}
                />
              </View>
            </Card>

            <Text className="text-light-subtle text-xs font-medium text-center mt-4 px-4 leading-[18px]">
              The semester months and preferences are saved on this phone only. Student phones use the standard months
              until your college's calendar is shared with them.
            </Text>
          </>
        )}
      </ScrollView>

      <BottomSheet
        visible={picking !== null}
        onClose={() => setPicking(null)}
        title={picking ? FIELD_TITLES[picking] : ''}
        subtitle="Choose a month."
      >
        <View className="flex-row flex-wrap">
          {MONTH_NAMES.map((name, i) => {
            const month = i + 1;
            return (
              <Chip
                key={name}
                label={monthShort(month)}
                selected={picking !== null && draft[picking] === month}
                onPress={() => {
                  if (picking) setDraft({ ...draft, [picking]: month });
                  setPicking(null);
                }}
                className="mr-2 mb-2"
              />
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}
