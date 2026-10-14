import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Circle, Stop } from 'react-native-svg';
import { colors } from '../constants/theme';

interface HeroProps {
  children?: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Square bottom edge, for a hero that fills the screen */
  flat?: boolean;
}

/** The dark gradient surface behind every screen header. */
export function Hero({ children, className = '', style, flat = false }: HeroProps) {
  return (
    <View
      className={`overflow-hidden ${flat ? '' : 'rounded-b-[32px]'} ${className}`}
      style={[{ backgroundColor: colors.navy }, style]}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="heroBase" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.navy} />
              <Stop offset="1" stopColor={colors.heroEnd} />
            </LinearGradient>
            <RadialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.primarySoft} stopOpacity={0.6} />
              <Stop offset="1" stopColor={colors.primarySoft} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="heroWarm" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.gold} stopOpacity={0.3} />
              <Stop offset="1" stopColor={colors.gold} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#heroBase)" />
          <Circle cx="90%" cy="0%" r="150" fill="url(#heroGlow)" />
          <Circle cx="0%" cy="100%" r="120" fill="url(#heroWarm)" />
        </Svg>
      </View>
      {children}
    </View>
  );
}
