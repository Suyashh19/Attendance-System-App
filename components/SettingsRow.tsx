import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { Text } from './Text';

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
  divider?: boolean;
}

/** One tappable line in a settings card: icon, title, a short explanation and a chevron. */
export function SettingsRow({ icon, title, subtitle, onPress, tone = 'default', divider = false }: SettingsRowProps) {
  const danger = tone === 'danger';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title}
      className={`p-4 flex-row items-center ${divider ? 'border-b border-light-border' : ''}`}
    >
      <View className={`w-11 h-11 rounded-2xl items-center justify-center mr-4 ${danger ? 'bg-danger-bg' : 'bg-light'}`}>
        <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.text} />
      </View>
      <View className="flex-1">
        <Text className={`font-bold text-[15px] ${danger ? 'text-danger' : 'text-light-text'}`}>{title}</Text>
        <Text className={`text-xs font-medium mt-0.5 ${danger ? 'text-danger/70' : 'text-light-muted'}`}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={danger ? colors.danger : colors.subtle} />
    </TouchableOpacity>
  );
}
