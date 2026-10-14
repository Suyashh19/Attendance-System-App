import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { useServerStatus } from '../services/api';
import { colors } from '../constants/theme';

/** Shown over every screen while a request is slow, i.e. the free-tier server is waking up. */
export function ServerWakeBanner() {
  const waking = useServerStatus((s) => s.slowRequests > 0);
  const insets = useSafeAreaInsets();

  if (!waking) return null;

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, zIndex: 100 }}
    >
      <View
        className="flex-row items-center rounded-2xl px-4 py-3"
        style={{ backgroundColor: colors.navy, elevation: 8 }}
      >
        <ActivityIndicator size="small" color={colors.white} />
        <View className="ml-3 flex-1">
          <Text className="text-white text-sm font-semibold">Waking up the server…</Text>
          <Text className="text-white/70 text-xs">This can take up to a minute after a quiet spell.</Text>
        </View>
      </View>
    </View>
  );
}
