import React from 'react';
import { View, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: React.ReactNode;
  /** Layout of the touch target (margins, flex) */
  className?: string;
  /** Look of the surface that shrinks when pressed */
  contentClassName?: string;
  contentStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
}

/** A touchable that gently shrinks while pressed. */
export function PressableScale({
  children,
  className = '',
  contentClassName = '',
  contentStyle,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      className={className}
      onPressIn={(e) => {
        scale.value = withTiming(scaleTo, { duration: 90 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 140 });
        onPressOut?.(e);
      }}
      {...props}
    >
      {/* The animated view only scales; class names go on a plain view, where they always apply */}
      <Animated.View style={animatedStyle}>
        <View className={contentClassName} style={contentStyle}>
          {children}
        </View>
      </Animated.View>
    </Pressable>
  );
}
