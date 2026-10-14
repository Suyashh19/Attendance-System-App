import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Hero } from './Hero';
import { colors } from '../constants/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Action shown at the right edge, e.g. an icon button */
  right?: React.ReactNode;
  /** Extra content inside the header, under the title */
  children?: React.ReactNode;
}

/** Gradient header with a back button, for screens opened on top of the tabs. */
export function ScreenHeader({ title, subtitle, right, children }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  };

  return (
    <Hero className="px-5 pb-6" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center">
        <TouchableOpacity
          onPress={goBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="w-11 h-11 bg-white/10 border border-white/15 rounded-full items-center justify-center mr-3"
        >
          <Ionicons name="arrow-back" size={20} color={colors.white} />
        </TouchableOpacity>

        <View className="flex-1">
          <Text className="text-white text-xl font-extrabold" numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <Text className="text-white/70 text-[13px] font-medium mt-0.5" numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>

        {right}
      </View>
      {children}
    </Hero>
  );
}

/** Large title header for the main tabs. */
export function TabHeader({ eyebrow, title, right, children }: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Hero className="px-5 pb-7" style={{ paddingTop: insets.top + 18 }}>
      <View className="flex-row items-center">
        <View className="flex-1 mr-3">
          {eyebrow ? (
            <Text className="text-white/60 text-xs font-bold tracking-widest mb-1">{eyebrow}</Text>
          ) : null}
          <Text className="text-white text-[28px] font-extrabold" numberOfLines={1}>{title}</Text>
        </View>
        {right}
      </View>
      {children}
    </Hero>
  );
}
