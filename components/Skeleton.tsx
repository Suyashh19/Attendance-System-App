import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Hero } from './Hero';
import { shadow } from '../constants/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  /** `onDark` for blocks placed on the dark hero */
  tone?: 'light' | 'onDark';
  className?: string;
  style?: StyleProp<ViewStyle>;
}

/** A grey placeholder block that gently pulses while content loads. */
export function Skeleton({ width = '100%', height = 14, radius = 8, tone = 'light', className = '', style }: SkeletonProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className={`${tone === 'onDark' ? 'bg-white/20' : 'bg-light-border'} ${className}`}
      style={[{ width, height, borderRadius: radius }, animated, style]}
    />
  );
}

/** Same footprint as a SubjectCard. */
export function SubjectCardSkeleton() {
  return (
    <View className="bg-light-card rounded-3xl p-4 mb-3 border border-light-border" style={shadow.card}>
      <View className="flex-row items-center">
        <Skeleton width={52} height={52} radius={16} className="mr-3" />
        <View className="flex-1 mr-3">
          <Skeleton width="70%" height={16} />
          <Skeleton width="45%" height={11} className="mt-2.5" />
        </View>
        <Skeleton width={48} height={48} radius={24} />
      </View>
      <View className="mt-4 pt-3 border-t border-light-border">
        <Skeleton width="55%" height={11} />
        <Skeleton height={8} radius={4} className="mt-3" />
      </View>
    </View>
  );
}

/** A column of placeholder cards, for lists that load below an existing header. */
export function ListSkeleton({ count = 4, className = 'px-4 pt-4' }: { count?: number; className?: string }) {
  return (
    <View className={className} accessible accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <SubjectCardSkeleton key={i} />
      ))}
    </View>
  );
}

/** A full screen placeholder shaped like the Classes and History tabs: hero, three tiles, then cards. */
export function TabSkeleton() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-light" accessible accessibilityLabel="Loading" accessibilityRole="progressbar">
      <Hero className="px-5 pb-6" style={{ paddingTop: insets.top + 16 }}>
        <View className="flex-row items-center">
          <Skeleton tone="onDark" width={48} height={48} radius={24} />
          <View className="flex-1 mx-3">
            <Skeleton tone="onDark" width="50%" height={20} />
          </View>
          <Skeleton tone="onDark" width={104} height={44} radius={22} />
        </View>
        <View className="flex-row mt-5">
          {[0, 1, 2].map((i) => (
            <View key={i} className={`flex-1 bg-white/10 border border-white/10 rounded-2xl py-3 items-center ${i > 0 ? 'ml-2' : ''}`}>
              <Skeleton tone="onDark" width={36} height={20} />
              <Skeleton tone="onDark" width={44} height={10} className="mt-2" />
            </View>
          ))}
        </View>
        <Skeleton tone="onDark" height={46} radius={16} className="mt-3" />
      </Hero>
      <ListSkeleton count={3} className="px-4 pt-6" />
    </View>
  );
}
