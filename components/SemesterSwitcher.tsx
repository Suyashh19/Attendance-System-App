import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow, MIN_ATTENDANCE_PERCENT } from '../constants/theme';
import { OTHER_YEAR, currentAcademicYear, parseSpan } from '../utils/academicYear';
import { BottomSheet } from './BottomSheet';
import { PressableScale } from './PressableScale';
import { ProgressRing } from './ProgressRing';
import { Text } from './Text';

export interface SemesterItem {
  key: string;
  label: string;
  /** e.g. "Jun – Dec 2026" */
  dates: string;
  subjects: number;
  percent: number | null;
  belowCount: number;
}

interface SemesterSwitcherProps {
  /** Semesters, newest first */
  items: SemesterItem[];
  /** Every semester together, offered last in the list */
  allItem: SemesterItem;
  scope: string;
  onChange: (key: string) => void;
  /** Line under the sheet title while choosing the year; defaults to a short instruction */
  subtitle?: string;
  /** Draw a percentage ring for each semester (students); faculty get a calendar icon */
  showRing?: boolean;
}

/** The academic year a semester key belongs to ("2026-27 Odd" -> "2026-27"; an unlabelled one -> OTHER_YEAR). */
function yearOf(key: string): string {
  return parseSpan(key)?.year ?? OTHER_YEAR;
}

/** "Odd semester", "Even semester", or "Whole year" for a label with no term. */
function termTitle(key: string): string {
  const parsed = parseSpan(key);
  if (!parsed) return 'Other classes';
  return parsed.term ? `${parsed.term} semester` : 'Whole year';
}

/**
 * A card showing the semester being viewed, with arrows to step through them.
 * Tapping it opens a sheet that asks for the academic year first, then the semester inside it.
 */
export function SemesterSwitcher({ items, allItem, scope, onChange, subtitle, showRing = true }: SemesterSwitcherProps) {
  const [open, setOpen] = useState(false);
  // The year whose semesters are being shown in the sheet; null = still choosing the year
  const [pickedYear, setPickedYear] = useState<string | null>(null);
  const { height: screenHeight } = useWindowDimensions();

  const isAll = scope === allItem.key;
  const index = items.findIndex((i) => i.key === scope);
  const current = isAll ? allItem : items[index] ?? items[0];
  if (!current) return null;

  // Items are newest first, so "previous" is the older semester
  const older = !isAll && index >= 0 && index < items.length - 1 ? items[index + 1] : null;
  const newer = !isAll && index > 0 ? items[index - 1] : null;
  const choosable = items.length > 1;

  // The semesters grouped by academic year, newest year first
  const yearGroups: { year: string; items: SemesterItem[] }[] = [];
  for (const item of items) {
    const year = yearOf(item.key);
    let group = yearGroups.find((g) => g.year === year);
    if (!group) {
      group = { year, items: [] };
      yearGroups.push(group);
    }
    group.items.push(item);
  }
  const currentYear = isAll ? null : yearOf(current.key);
  const pickedGroup = pickedYear ? yearGroups.find((g) => g.year === pickedYear) ?? null : null;

  const closeSheet = () => {
    setOpen(false);
    setPickedYear(null);
  };
  const choose = (key: string) => {
    onChange(key);
    closeSheet();
  };
  // A year with a single semester has nothing more to ask, so it is chosen straight away
  const pickYear = (group: { year: string; items: SemesterItem[] }) => {
    if (group.items.length === 1) choose(group.items[0].key);
    else setPickedYear(group.year);
  };

  const yearTitle = (year: string) => (year === OTHER_YEAR ? 'Other classes' : year);

  const Arrow = ({ target, icon, label }: { target: SemesterItem | null; icon: 'chevron-back' | 'chevron-forward'; label: string }) => (
    <TouchableOpacity
      onPress={() => target && onChange(target.key)}
      disabled={!target}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={target ? `${label}: ${target.label}` : `${label}, none`}
      className="w-9 h-9 rounded-full items-center justify-center"
      style={{ backgroundColor: target ? colors.primaryBg : 'transparent' }}
    >
      <Ionicons name={icon} size={20} color={target ? colors.primary : colors.border} />
    </TouchableOpacity>
  );

  return (
    <View className="mb-3">
      <View className="bg-light-card rounded-2xl border border-light-border px-2 py-2 flex-row items-center" style={shadow.card}>
        {choosable ? <Arrow target={older} icon="chevron-back" label="Older semester" /> : <View className="w-2" />}

        <TouchableOpacity
          onPress={() => choosable && setOpen(true)}
          disabled={!choosable}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Semester ${current.label}. ${choosable ? 'Tap to choose another' : ''}`}
          className="flex-1 items-center px-2"
        >
          <View className="flex-row items-center">
            <Text className="text-light-text text-[17px] font-extrabold">{current.label}</Text>
            {choosable && <Ionicons name="chevron-down" size={15} color={colors.primary} style={{ marginLeft: 5 }} />}
          </View>
          <Text className="text-light-muted text-[11px] font-medium">{current.dates}</Text>

          {choosable && (
            <View className="flex-row items-center mt-1">
              {[...items].reverse().map((i) => {
                const active = i.key === current.key;
                return (
                  <View
                    key={i.key}
                    style={{
                      width: active ? 18 : 6,
                      height: 6,
                      borderRadius: 3,
                      marginHorizontal: 2,
                      backgroundColor: active ? colors.primary : colors.border,
                    }}
                  />
                );
              })}
            </View>
          )}
        </TouchableOpacity>

        {choosable ? <Arrow target={newer} icon="chevron-forward" label="Newer semester" /> : <View className="w-2" />}
      </View>

      <BottomSheet
        visible={open}
        onClose={closeSheet}
        title={pickedGroup ? yearTitle(pickedGroup.year) : 'Choose year'}
        subtitle={
          pickedGroup
            ? showRing
              ? 'Each one shows how you did.'
              : 'Now choose the semester.'
            : subtitle ?? 'Choose the academic year first.'
        }
      >
        <ScrollView style={{ maxHeight: screenHeight * 0.5 }} showsVerticalScrollIndicator={false}>
          {pickedGroup ? (
            <>
              <TouchableOpacity
                onPress={() => setPickedYear(null)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Back to all academic years"
                className="flex-row items-center self-start mb-2 -ml-1 pr-3 h-9"
              >
                <Ionicons name="chevron-back" size={18} color={colors.primary} />
                <Text className="text-primary font-bold text-sm">All years</Text>
              </TouchableOpacity>

              {pickedGroup.items.map((item) => {
                const selected = item.key === current.key && !isAll;
                const low = item.percent !== null && item.percent < MIN_ATTENDANCE_PERCENT;
                const tone = item.percent === null ? colors.subtle : low ? colors.danger : colors.success;
                return (
                  <PressableScale
                    key={item.key}
                    onPress={() => choose(item.key)}
                    scaleTo={0.98}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className="mb-2"
                    contentClassName={`flex-row items-center rounded-2xl border px-4 py-3 ${selected ? 'bg-light-primaryBg border-primary' : 'bg-light-card border-light-border'}`}
                  >
                    {showRing ? (
                      <ProgressRing percent={item.percent ?? 0} size={44} strokeWidth={5} color={tone}>
                        <Text className="text-[10px] font-extrabold" style={{ color: tone }}>
                          {item.percent !== null ? `${item.percent}%` : '--'}
                        </Text>
                      </ProgressRing>
                    ) : (
                      <View className="w-11 h-11 rounded-2xl bg-light items-center justify-center">
                        <Ionicons name="calendar-outline" size={20} color={selected ? colors.primary : colors.muted} />
                      </View>
                    )}
                    <View className="flex-1 ml-3">
                      <Text className={`font-bold text-[15px] ${selected ? 'text-primary' : 'text-light-text'}`}>
                        {termTitle(item.key)}
                      </Text>
                      <Text className="text-light-muted text-xs font-medium mt-0.5" numberOfLines={1}>
                        {item.dates} · {item.subjects} {item.subjects === 1 ? 'subject' : 'subjects'}
                        {item.belowCount > 0 ? ` · ${item.belowCount} below ${MIN_ATTENDANCE_PERCENT}%` : ''}
                      </Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </PressableScale>
                );
              })}
            </>
          ) : (
            <>
              {yearGroups.map((group) => {
                const selected = group.year === currentYear;
                const total = group.items.reduce((sum, i) => sum + i.subjects, 0);
                const isRunning = group.year === currentAcademicYear();
                const terms = group.items
                  .map((i) => {
                    const term = parseSpan(i.key)?.term;
                    return term ? `${term} ${i.subjects}` : '';
                  })
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <PressableScale
                    key={group.year}
                    onPress={() => pickYear(group)}
                    scaleTo={0.98}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Academic year ${yearTitle(group.year)}`}
                    className="mb-2"
                    contentClassName={`flex-row items-center rounded-2xl border px-4 py-3 ${selected ? 'bg-light-primaryBg border-primary' : 'bg-light-card border-light-border'}`}
                  >
                    <View className="w-11 h-11 rounded-2xl bg-light items-center justify-center">
                      <Ionicons name="calendar" size={20} color={selected ? colors.primary : colors.muted} />
                    </View>
                    <View className="flex-1 ml-3">
                      <View className="flex-row items-center">
                        <Text className={`font-bold text-[15px] ${selected ? 'text-primary' : 'text-light-text'}`}>
                          {yearTitle(group.year)}
                        </Text>
                        {isRunning && (
                          <View className="ml-2 bg-light-primaryBg px-2 py-0.5 rounded-md">
                            <Text className="text-primary text-[10px] font-bold tracking-wide">CURRENT</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-light-muted text-xs font-medium mt-0.5" numberOfLines={1}>
                        {total} {total === 1 ? 'subject' : 'subjects'}
                        {terms ? ` · ${terms}` : ''}
                      </Text>
                    </View>
                    {group.items.length > 1 ? (
                      <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
                    ) : selected ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    ) : null}
                  </PressableScale>
                );
              })}

              <PressableScale
                onPress={() => choose(allItem.key)}
                scaleTo={0.98}
                accessibilityRole="button"
                accessibilityState={{ selected: isAll }}
                className="mb-2"
                contentClassName={`flex-row items-center rounded-2xl border px-4 py-3 ${isAll ? 'bg-light-primaryBg border-primary' : 'bg-light-card border-light-border'}`}
              >
                <View className="w-11 h-11 rounded-2xl bg-light items-center justify-center">
                  <Ionicons name="time-outline" size={20} color={isAll ? colors.primary : colors.muted} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className={`font-bold text-[15px] ${isAll ? 'text-primary' : 'text-light-text'}`}>{allItem.label}</Text>
                  <Text className="text-light-muted text-xs font-medium mt-0.5" numberOfLines={1}>
                    {allItem.dates} · {allItem.subjects} {allItem.subjects === 1 ? 'subject' : 'subjects'}
                  </Text>
                </View>
                {isAll && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </PressableScale>
            </>
          )}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}
