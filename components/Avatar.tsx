import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { initials } from '../constants/theme';

interface AvatarProps {
  name?: string | null;
  size?: number;
  /** onDark: for use on the hero gradient */
  tone?: 'primary' | 'onDark';
}

/** Circle with a person's initials. */
export function Avatar({ name, size = 44, tone = 'primary' }: AvatarProps) {
  const onDark = tone === 'onDark';
  return (
    <View
      className={`items-center justify-center rounded-full ${onDark ? 'bg-white/15 border border-white/25' : 'bg-light-primaryBg'}`}
      style={{ width: size, height: size }}
    >
      <Text className={`font-bold ${onDark ? 'text-white' : 'text-primary'}`} style={{ fontSize: size * 0.36 }}>
        {initials(name)}
      </Text>
    </View>
  );
}
