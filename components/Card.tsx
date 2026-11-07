import React from 'react';
import { View, ViewProps } from 'react-native';
import { shadow } from '../constants/theme';

/** White surface with a soft shadow. Padding and margins come from className. */
export function Card({ className = '', style, ...props }: ViewProps) {
  return (
    <View
      className={`bg-light-card rounded-3xl border border-light-border ${className}`}
      style={[shadow.card, style]}
      {...props}
    />
  );
}
