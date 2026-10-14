import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { PressableScale } from './PressableScale';
import { colors, shadow } from '../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'dangerSoft' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

// primary: the one main action on a screen. secondary/outline/ghost: everything else.
const VARIANTS: Record<ButtonVariant, { container: string; text: string; tint: string }> = {
  primary: { container: 'bg-primary', text: 'text-white', tint: colors.white },
  secondary: { container: 'bg-light-primaryBg', text: 'text-primary', tint: colors.primary },
  outline: { container: 'bg-light-card border border-light-border', text: 'text-light-text', tint: colors.text },
  danger: { container: 'bg-danger', text: 'text-white', tint: colors.white },
  dangerSoft: { container: 'bg-danger-bg', text: 'text-danger', tint: colors.danger },
  ghost: { container: 'bg-transparent', text: 'text-primary', tint: colors.primary },
};

const SIZES = {
  sm: { container: 'h-11 px-4 rounded-xl', text: 'text-sm', icon: 16 },
  md: { container: 'h-[52px] px-6 rounded-2xl', text: 'text-base', icon: 18 },
  lg: { container: 'h-14 px-8 rounded-2xl', text: 'text-base', icon: 20 },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  icon,
}: ButtonProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const inactive = disabled || loading;

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={className}
      contentClassName={`flex-row items-center justify-center ${v.container} ${s.container}`}
      contentStyle={[
        { opacity: inactive ? 0.55 : 1 },
        variant === 'primary' && !inactive ? shadow.glow : undefined,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.tint} />
      ) : (
        <View className="flex-row items-center">
          {icon && <Ionicons name={icon} size={s.icon} color={v.tint} style={{ marginRight: 8 }} />}
          <Text className={`${v.text} ${s.text} font-bold text-center`}>{title}</Text>
        </View>
      )}
    </PressableScale>
  );
}
