import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors } from '../constants/theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title?: string;
  text: string;
  tone?: 'primary' | 'danger';
  /** A button under the text */
  action?: React.ReactNode;
  className?: string;
}

/** Icon, a line or two of text and an optional action, for lists with nothing to show. */
export function EmptyState({ icon, title, text, tone = 'primary', action, className = '' }: EmptyStateProps) {
  const danger = tone === 'danger';
  return (
    <View className={`items-center justify-center px-6 py-10 ${className}`}>
      <View className={`w-24 h-24 rounded-full items-center justify-center mb-5 ${danger ? 'bg-danger-bg' : 'bg-light-primaryBg'}`}>
        <View className="w-16 h-16 rounded-full bg-light-card items-center justify-center">
          <Ionicons name={icon} size={30} color={danger ? colors.danger : colors.primary} />
        </View>
      </View>
      {title ? <Text className="text-light-text text-lg font-bold mb-2 text-center">{title}</Text> : null}
      <Text className="text-light-muted text-sm text-center leading-5 px-2">{text}</Text>
      {action ? <View className="mt-6 self-stretch">{action}</View> : null}
    </View>
  );
}

/** Small uppercase heading above a group of cards. */
export function SectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Text className={`text-light-muted font-bold text-xs tracking-widest ${className}`}>{children}</Text>;
}
