import React from 'react';
import { Text as RNText, TextProps } from 'react-native';

// Each weight is its own font file, so text without a weight class still needs the regular one
const HAS_FONT = /(^|\s)font-(regular|normal|medium|semibold|bold|extrabold|black|mono)(\s|$)/;

/** Text in the app typeface. Use this instead of react-native's Text. */
export function Text({ className = '', ...props }: TextProps) {
  return <RNText className={HAS_FONT.test(className) ? className : `font-regular ${className}`} {...props} />;
}
