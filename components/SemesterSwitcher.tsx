import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow, MIN_ATTENDANCE_PERCENT } from '../constants/theme';
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
}

/** A card showing the semester being viewed, with arrows to step through them and a sheet listing every one. */
export function SemesterSwitcher({ items, allItem, scope, onChange }: SemesterSwitcherProps) {
  const [open, setOpen] = useState(false);

  const isAll = scope === allItem.key;
  const index = items.findIndex((i) => i.key === scope);
  const current = isAll ? allItem : items[index] ?? items[0];
  if (!current) return null;

  // Items are newest first, so "previous" is the older semester
  const older = !isAll && index >= 0 && index < items.length - 1 ? items[index + 1] : null;
  const newer = !isAll && index > 0 ? items[index - 1] : null;
  const choosable = items.length > 1;

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

      <BottomSheet visible={open} onClose={() => setOpen(false)} title="Choose semester" subtitle="Each one shows how you did.">
        {[...items, allItem].map((item) => {
          const selected = item.key === current.key;
          const low = item.percent !== null && item.percent < MIN_ATTENDANCE_PERCENT;
          const tone = item.percent === null ? colors.subtle : low ? colors.danger : colors.success;
          return (
            <PressableScale
              key={item.key}
              onPress={() => { onChange(item.key); setOpen(false); }}
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className="mb-2"
              contentClassName={`flex-row items-center rounded-2xl border px-4 py-3 ${selected ? 'bg-light-primaryBg border-primary' : 'bg-light-card border-light-border'}`}
            >
              <ProgressRing percent={item.percent ?? 0} size={44} strokeWidth={5} color={tone}>
                <Text className="text-[10px] font-extrabold" style={{ color: tone }}>
                  {item.percent !== null ? `${item.percent}%` : '--'}
                </Text>
              </ProgressRing>
              <View className="flex-1 ml-3">
                <Text className={`font-bold text-[15px] ${selected ? 'text-primary' : 'text-light-text'}`}>{item.label}</Text>
                <Text className="text-light-muted text-xs font-medium mt-0.5" numberOfLines={1}>
                  {item.dates} · {item.subjects} {item.subjects === 1 ? 'subject' : 'subjects'}
                  {item.belowCount > 0 ? ` · ${item.belowCount} below ${MIN_ATTENDANCE_PERCENT}%` : ''}
                </Text>
              </View>
              {selected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </PressableScale>
          );
        })}
      </BottomSheet>
    </View>
  );
}
