import React, { useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SubjectHistory } from '../types';
import { colors } from '../constants/theme';
import {
  buildDayMap,
  buildWeeks,
  dayKey,
  monthLabels,
  semesterRange,
  startingWeek,
  streaks,
  weekdayInsight,
  type DayInfo,
  type DayState,
} from '../utils/attendanceCalendar';
import { Card } from './Card';
import { SectionLabel } from './EmptyState';
import { StatusPill } from './StatusPill';
import { Text } from './Text';

const CELL = 14;
const GAP = 3;
const STEP = CELL + GAP;
const LABEL_WIDTH = 26;

const STATE_COLOR: Record<DayState, string> = {
  present: colors.success,
  absent: colors.danger,
  mixed: colors.gold,
  excused: colors.info,
};

const LEGEND: { label: string; color: string }[] = [
  { label: 'Present', color: colors.success },
  { label: 'Mixed', color: colors.gold },
  { label: 'Absent', color: colors.danger },
  { label: 'Excused', color: colors.info },
  { label: 'No class', color: colors.border },
];

const WEEKDAY_ROWS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

interface AttendanceCalendarProps {
  /** The subjects of the chosen semester, with their dated records */
  subjects: SubjectHistory[];
  /** The scope key, e.g. "2026-27 Odd". "all" and "other" have no calendar. */
  scope: string;
}

const formatDay = (date: Date) =>
  date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

/** A semester as a grid of days, one square per day, coloured by how the student did that day. */
export function AttendanceCalendar({ subjects, scope }: AttendanceCalendarProps) {
  const range = useMemo(() => semesterRange(scope), [scope]);
  const [selected, setSelected] = useState<string | null>(null);
  const scrolledRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const dayMap = useMemo(() => (range ? buildDayMap(subjects, range) : new Map<string, DayInfo>()), [subjects, range]);
  const weeks = useMemo(() => (range ? buildWeeks(range) : []), [range]);
  const labels = useMemo(() => monthLabels(weeks), [weeks]);
  const runs = useMemo(() => streaks(dayMap), [dayMap]);
  const insight = useMemo(() => weekdayInsight(dayMap), [dayMap]);

  if (!range) {
    return (
      <Card className="p-5 mb-6">
        <SectionLabel>CALENDAR</SectionLabel>
        <View className="flex-row items-center mt-3">
          <Ionicons name="calendar-outline" size={18} color={colors.subtle} style={{ marginRight: 10 }} />
          <Text className="text-light-muted text-sm font-medium flex-1">
            Pick a semester above to see its day-by-day calendar.
          </Text>
        </View>
      </Card>
    );
  }

  const todayKey = dayKey(new Date());
  const selectedInfo = selected ? dayMap.get(selected) : undefined;
  const selectedDate = selected ? weeks.flat().find((c) => c.key === selected)?.date : undefined;

  return (
    <Card className="p-5 mb-6">
      <SectionLabel>CALENDAR</SectionLabel>

      {dayMap.size === 0 ? (
        <Text className="text-light-muted text-sm font-medium mt-3">
          No classes have been recorded in this semester yet.
        </Text>
      ) : (
        <>
          <View className="flex-row mt-4">
            {/* Weekday names stay put while the weeks scroll */}
            <View style={{ width: LABEL_WIDTH, paddingTop: 20 }}>
              {WEEKDAY_ROWS.map((name, i) => (
                <View key={i} style={{ height: CELL, marginBottom: GAP, justifyContent: 'center' }}>
                  <Text className="text-light-subtle text-[9px] font-semibold" allowFontScaling={false}>{name}</Text>
                </View>
              ))}
            </View>

            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onContentSizeChange={() => {
                if (scrolledRef.current) return;
                scrolledRef.current = true;
                const x = Math.max(0, startingWeek(weeks, dayMap) * STEP - 100);
                scrollRef.current?.scrollTo({ x, animated: false });
              }}
            >
              <View>
                <View style={{ height: 20, width: weeks.length * STEP }}>
                  {labels.map(({ index, label }) => (
                    <Text
                      key={`${label}-${index}`}
                      className="text-light-muted text-[10px] font-bold absolute"
                      style={{ left: index * STEP, top: 2 }}
                      allowFontScaling={false}
                    >
                      {label}
                    </Text>
                  ))}
                </View>

                <View className="flex-row">
                  {weeks.map((week, w) => (
                    <View key={w} style={{ marginRight: GAP }}>
                      {week.map((cell) => {
                        const info = dayMap.get(cell.key);
                        const isFuture = cell.key > todayKey;
                        const isToday = cell.key === todayKey;
                        const isSelected = cell.key === selected;
                        const fill = !cell.inRange ? 'transparent' : info ? STATE_COLOR[info.state] : isFuture ? 'transparent' : colors.border;

                        return (
                          <Pressable
                            key={cell.key}
                            disabled={!info}
                            onPress={() => setSelected(isSelected ? null : cell.key)}
                            accessibilityRole={info ? 'button' : undefined}
                            accessibilityLabel={info ? `${formatDay(cell.date)}, ${info.state}` : undefined}
                            hitSlop={2}
                            style={{
                              width: CELL,
                              height: CELL,
                              marginBottom: GAP,
                              borderRadius: 4,
                              backgroundColor: fill,
                              borderWidth: isSelected || isToday ? 2 : cell.inRange && isFuture && !info ? 1 : 0,
                              borderColor: isSelected ? colors.primary : isToday ? colors.navy : colors.border,
                            }}
                          />
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>

          <View className="flex-row flex-wrap mt-3">
            {LEGEND.map(({ label, color }) => (
              <View key={label} className="flex-row items-center mr-4 mb-1">
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color, marginRight: 6 }} />
                <Text className="text-light-muted text-[11px] font-semibold">{label}</Text>
              </View>
            ))}
          </View>

          {selectedInfo && selectedDate ? (
            <View className="bg-light rounded-2xl p-4 mt-3">
              <Text className="text-light-text font-bold text-sm mb-2">{formatDay(selectedDate)}</Text>
              {selectedInfo.entries.map((entry, i) => (
                <View key={i} className={`flex-row items-center justify-between ${i > 0 ? 'mt-2' : ''}`}>
                  <Text className="text-light-text text-sm font-medium flex-1 mr-3" numberOfLines={1}>{entry.subject}</Text>
                  <StatusPill status={entry.status} />
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-light-subtle text-[11px] font-medium mt-3">Tap a coloured day to see its classes.</Text>
          )}

          <View className="flex-row mt-4">
            <View className="flex-1 bg-light rounded-2xl p-3 mr-3">
              <Text className="text-light-text font-extrabold text-lg">
                {runs.current}
                <Text className="text-light-muted text-xs font-semibold"> {runs.current === 1 ? 'class day' : 'class days'}</Text>
              </Text>
              <Text className="text-light-muted text-[11px] font-semibold mt-0.5">Current streak</Text>
            </View>
            <View className="flex-1 bg-light rounded-2xl p-3">
              <Text className="text-light-text font-extrabold text-lg">
                {runs.best}
                <Text className="text-light-muted text-xs font-semibold"> {runs.best === 1 ? 'class day' : 'class days'}</Text>
              </Text>
              <Text className="text-light-muted text-[11px] font-semibold mt-0.5">Best streak</Text>
            </View>
          </View>

          {insight && (
            <View className="flex-row items-center bg-warning-bg rounded-2xl px-4 py-3 mt-3">
              <Ionicons name="bulb-outline" size={16} color={colors.warning} style={{ marginRight: 8 }} />
              <Text className="text-xs font-semibold flex-1" style={{ color: colors.warning }}>
                You miss {insight.weekday} most: {insight.missed} of {insight.total} classes.
              </Text>
            </View>
          )}
        </>
      )}
    </Card>
  );
}
