import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../constants/theme';

interface ProgressRingProps {
  /** 0 to 100 */
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  /** Shown in the middle of the ring */
  children?: React.ReactNode;
}

export function ProgressRing({
  percent,
  size = 64,
  strokeWidth = 7,
  color = colors.primary,
  trackColor = colors.border,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const filled = Math.min(100, Math.max(0, percent)) / 100;

  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle stroke={trackColor} fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
        {filled > 0 && (
          <Circle
            stroke={color}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - filled)}
            strokeLinecap="round"
          />
        )}
      </Svg>
      <View className="absolute items-center justify-center">{children}</View>
    </View>
  );
}
