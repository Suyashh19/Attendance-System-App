import React from 'react';
import { View, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  ZoomIn,
} from 'react-native-reanimated';

import type { AttendanceStatus } from '../types';
import { Button } from './Button';
import { Text } from './Text';
import { colors, shadow } from '../constants/theme';

interface AttendanceResultModalProps {
  visible: boolean;
  status: AttendanceStatus | 'LOADING' | null;
  message?: string;
  onDismiss: () => void;
}

export function AttendanceResultModal({
  visible,
  status,
  message,
  onDismiss,
}: AttendanceResultModalProps) {
  if (!visible || !status) return null;

  const getConfig = () => {
    switch (status) {
      case 'LOADING':
        return {
          color: colors.primary,
          bg: colors.primaryBg,
          icon: null,
          title: 'Verifying Attendance...',
          desc: 'Please wait while we validate your device, code, and time window.',
        };
      case 'PRESENT':
        return {
          color: colors.success,
          bg: colors.successBg,
          icon: 'checkmark',
          title: 'Marked Present!',
          desc: message || 'Your attendance was successfully verified and recorded.',
        };
      case 'ABSENT':
        return {
          color: colors.danger,
          bg: colors.dangerBg,
          icon: 'close',
          title: 'Marked Absent',
          desc: message || 'You missed the attendance window or failed verification.',
        };
      case 'INVALID':
        return {
          color: colors.warning,
          bg: colors.warningBg,
          icon: 'warning',
          title: 'Invalid Attempt',
          desc: message ? `Reason: ${message}` : 'Verification failed for this attempt.',
        };
      case 'EXPIRED':
        return {
          color: colors.warning,
          bg: colors.warningBg,
          icon: 'hourglass-outline',
          title: 'Time Expired',
          desc: message || 'No code was entered within the time limit.',
        };
      default:
        return {
          color: colors.muted,
          bg: colors.bg,
          icon: 'help',
          title: 'Unknown Status',
          desc: 'Something went wrong.',
        };
    }
  };

  const config = getConfig();

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: colors.overlay }}>
        <Animated.View
          entering={ZoomIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={{ width: '100%' }}
        >
        <View className="bg-light-card rounded-[32px] px-6 pt-8 pb-6 items-center" style={shadow.raised}>

          {/* Two soft rings around a solid badge */}
          <Animated.View entering={FadeInUp.delay(200).duration(400)}>
            <View
              className="w-32 h-32 rounded-full items-center justify-center mb-6"
              style={{ backgroundColor: config.bg }}
            >
              <View
                className="w-20 h-20 rounded-full items-center justify-center"
                style={{ backgroundColor: status === 'LOADING' ? colors.card : config.color }}
              >
                {status === 'LOADING' ? (
                  <ActivityIndicator size="large" color={config.color} />
                ) : (
                  <Ionicons name={config.icon as any} size={42} color={colors.white} />
                )}
              </View>
            </View>
          </Animated.View>

          <Text className="text-[26px] font-extrabold text-light-text mb-2 text-center">
            {config.title}
          </Text>

          <Text className="text-light-muted text-[15px] text-center mb-8 px-2 leading-[22px]">
            {config.desc}
          </Text>

          {status !== 'LOADING' && (
            <Animated.View entering={FadeIn.delay(400)} style={{ width: '100%' }}>
              <Button
                title="Back to Home"
                onPress={onDismiss}
                className="w-full"
                variant={status === 'PRESENT' ? 'primary' : 'outline'}
              />
            </Animated.View>
          )}
        </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
