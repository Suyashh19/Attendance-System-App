import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Path, Line, Stop } from 'react-native-svg';
import { colors } from '../constants/theme';

interface HeroProps {
  children?: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Square bottom edge, for a hero that fills the screen */
  flat?: boolean;
}

/** The dark gradient surface behind every screen header, styled with subtle diagonal tonal layers. */
export function Hero({ children, className = '', style, flat = false }: HeroProps) {
  return (
    <View
      className={`overflow-hidden ${flat ? '' : 'rounded-b-[32px]'} ${className}`}
      style={[{ backgroundColor: colors.navy }, style]}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            {/* Base purple-to-indigo gradient */}
            <LinearGradient id="heroBase" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.navy} />
              <Stop offset="0.55" stopColor="#251C52" />
              <Stop offset="1" stopColor={colors.heroEnd} />
            </LinearGradient>

            {/* Primary diagonal tonal facet */}
            <LinearGradient id="diagonalTone1" x1="1" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.06} />
              <Stop offset="0.45" stopColor={colors.primarySoft} stopOpacity={0.04} />
              <Stop offset="1" stopColor={colors.heroEnd} stopOpacity={0} />
            </LinearGradient>

            {/* Secondary upper-right diagonal tonal slice */}
            <LinearGradient id="diagonalTone2" x1="1" y1="0" x2="0.3" y2="0.7">
              <Stop offset="0" stopColor={colors.primarySoft} stopOpacity={0.08} />
              <Stop offset="0.5" stopColor={colors.primary} stopOpacity={0.03} />
              <Stop offset="1" stopColor={colors.navy} stopOpacity={0} />
            </LinearGradient>

            {/* Top-left subtle specular anchor */}
            <LinearGradient id="diagonalTone3" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.04} />
              <Stop offset="1" stopColor={colors.navySoft} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {/* Base purple-to-indigo surface */}
          <Rect width="100" height="100" fill="url(#heroBase)" />

          {/* Upper background diagonal tonal layers */}
          <Path d="M 0 0 L 40 0 L 0 28 Z" fill="url(#diagonalTone3)" />
          <Path d="M 15 0 L 100 0 L 100 38 L 0 60 L 0 44 Z" fill="url(#diagonalTone1)" />
          <Path d="M 48 0 L 100 0 L 100 24 L 20 44 Z" fill="url(#diagonalTone2)" />

          {/* Subtle structural diagonal hairlines */}
          <Line x1="0" y1="60" x2="100" y2="38" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="0.4" />
          <Line x1="20" y1="44" x2="100" y2="24" stroke="rgba(142, 102, 255, 0.08)" strokeWidth="0.35" />
        </Svg>
      </View>
      {children}
    </View>
  );
}
