import React from 'react';
import { View, type ViewProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { Text } from '../Text';

interface UnoAvatarProps extends ViewProps {
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
}

export function UnoAvatar({ size = 'md', showBadge = false, style, className = '', ...rest }: UnoAvatarProps) {
  const dimensions =
    size === 'sm'
      ? { container: 'w-8 h-8 rounded-full', iconSize: 15 }
      : size === 'lg'
      ? { container: 'w-14 h-14 rounded-2xl', iconSize: 26 }
      : { container: 'w-10 h-10 rounded-2xl', iconSize: 19 };

  return (
    <View className={`flex-row items-center ${className}`} style={style} {...rest}>
      <View
        className={`${dimensions.container} bg-light-primaryBg border border-primary/20 items-center justify-center relative`}
      >
        <Ionicons name="sparkles" size={dimensions.iconSize} color={colors.primary} />
        {/* Subtle active online pip */}
        <View className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-white" />
      </View>
      {showBadge && (
        <View className="ml-2.5">
          <View className="flex-row items-center">
            <Text className="text-light-text font-extrabold text-[15px] mr-1.5">Uno</Text>
            <View className="bg-primary/10 px-2 py-0.5 rounded-full">
              <Text className="text-primary text-[10px] font-extrabold tracking-wider">GUIDE</Text>
            </View>
          </View>
          <Text className="text-light-muted text-xs font-semibold">Your Personal Assistant</Text>
        </View>
      )}
    </View>
  );
}
