import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { statusTone } from '../constants/theme';

interface StatusPillProps {
  status: string;
  /** Shown instead of the raw status */
  label?: string;
  showIcon?: boolean;
  /** Small pencil for records the faculty changed by hand */
  edited?: boolean;
}

export function StatusPill({ status, label, showIcon = false, edited = false }: StatusPillProps) {
  const tone = statusTone(status);

  return (
    <View
      className="flex-row items-center px-3 h-8 rounded-full"
      style={{ backgroundColor: tone.bg }}
    >
      {showIcon && <Ionicons name={tone.icon} size={14} color={tone.text} style={{ marginRight: 5 }} />}
      <Text className="text-[11px] font-bold tracking-wide" style={{ color: tone.text }}>
        {label ?? status}
      </Text>
      {edited && <Ionicons name="pencil" size={10} color={tone.text} style={{ marginLeft: 5 }} />}
    </View>
  );
}
