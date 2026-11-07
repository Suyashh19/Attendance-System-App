import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { VerificationState } from '../types';
import { colors } from '../constants/theme';
import { Text } from './Text';
import { Card } from './Card';

interface VerificationStatusProps {
  state: VerificationState;
}

const ITEMS = [
  { key: 'deviceMatched', label: 'Registered phone', icon: 'phone-portrait-outline' as const },
  { key: 'timeValid', label: 'Time window', icon: 'time-outline' as const },
];

export function VerificationStatus({ state }: VerificationStatusProps) {
  return (
    <Card className="p-5 w-full">
      <Text className="text-light-muted font-bold text-xs tracking-widest mb-2">VERIFICATION</Text>

      {ITEMS.map(({ key, label, icon }, index) => {
        // true = passed, false = failed, anything else = still waiting
        const status = state[key as keyof VerificationState];

        const tone =
          status === true
            ? { color: colors.success, bg: colors.successBg, mark: 'checkmark-circle' as const, text: 'Verified' }
            : status === false
              ? { color: colors.danger, bg: colors.dangerBg, mark: 'close-circle' as const, text: 'Failed' }
              : { color: colors.muted, bg: colors.bg, mark: 'ellipse-outline' as const, text: 'Waiting' };

        return (
          <View
            key={key}
            className={`flex-row items-center py-3 ${index > 0 ? 'border-t border-light-border' : ''}`}
          >
            <View
              className="w-10 h-10 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: tone.bg }}
            >
              <Ionicons name={icon} size={18} color={tone.color} />
            </View>
            <Text className="text-light-text font-semibold text-sm flex-1">{label}</Text>
            <View className="flex-row items-center px-2.5 h-7 rounded-full" style={{ backgroundColor: tone.bg }}>
              <Ionicons name={tone.mark} size={14} color={tone.color} style={{ marginRight: 4 }} />
              <Text className="text-[11px] font-bold" style={{ color: tone.color }}>{tone.text}</Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}
