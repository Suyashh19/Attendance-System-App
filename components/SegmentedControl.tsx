import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, shadow } from '../constants/theme';

interface Option<T extends string> {
  key: T;
  label: string;
  /** Small count shown next to the label when above zero */
  badge?: number;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (key: T) => void;
  className?: string;
}

/** A row of options where exactly one is selected. */
export function SegmentedControl<T extends string>({ options, value, onChange, className = '' }: SegmentedControlProps<T>) {
  return (
    <View className={`flex-row bg-light-border/60 p-1 rounded-2xl ${className}`}>
      {options.map(({ key, label, badge, icon }) => {
        const selected = value === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onChange(key)}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            className={`flex-1 h-11 rounded-xl flex-row items-center justify-center ${selected ? 'bg-light-card' : 'bg-transparent'}`}
            style={selected ? shadow.card : undefined}
          >
            {icon && (
              <Ionicons name={icon} size={16} color={selected ? colors.primary : colors.muted} style={{ marginRight: 6 }} />
            )}
            <Text className={`text-sm ${selected ? 'text-primary font-bold' : 'text-light-muted font-semibold'}`}>{label}</Text>
            {badge ? (
              <View className="ml-1.5 px-1.5 h-5 min-w-[20px] rounded-full items-center justify-center bg-gold">
                <Text className="text-[11px] font-bold text-white">{badge}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
