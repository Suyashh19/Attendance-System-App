import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors } from '../constants/theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'primary' | 'danger';
  className?: string;
}

/** Pill-shaped filter toggle. */
export function Chip({ label, selected, onPress, icon, tone = 'primary', className = '' }: ChipProps) {
  const fill = tone === 'danger' ? 'bg-danger border-danger' : 'bg-navy border-navy';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`h-10 px-4 rounded-full flex-row items-center border ${selected ? fill : 'bg-light-card border-light-border'} ${className}`}
    >
      {icon && (
        <Ionicons name={icon} size={16} color={selected ? colors.white : colors.muted} style={{ marginRight: 6 }} />
      )}
      <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-light-muted'}`}>{label}</Text>
    </TouchableOpacity>
  );
}
