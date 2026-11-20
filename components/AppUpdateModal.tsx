import React, { useEffect } from 'react';
import {
  View,
  Modal,
  AppState,
  type AppStateStatus,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Text } from './Text';
import { Button } from './Button';
import { colors, shadow } from '../constants/theme';
import {
  useAppUpdateStore,
  getCurrentAppVersion,
} from '../services/versionCheck';

export function AppUpdateModal() {
  const { isVisible, updateInfo, isMandatory, triggerCheck, dismiss, openStore } =
    useAppUpdateStore();
  const { height } = useWindowDimensions();
  const currentVersion = getCurrentAppVersion();

  // Check version on initial mount (with a small delay so initial render finishes smoothly)
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerCheck();
    }, 1200);

    return () => clearTimeout(timer);
  }, [triggerCheck]);

  // Check version whenever user switches back to the app from background
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        triggerCheck();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [triggerCheck]);

  if (!isVisible || !updateInfo) {
    return null;
  }

  const latestVersion = updateInfo.latestVersion || 'Latest';

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (!isMandatory) {
          dismiss();
        }
      }}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: colors.overlay }}
      >
        {/* Only dismiss on backdrop tap if update is NOT mandatory */}
        {!isMandatory && (
          <Pressable
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
            onPress={dismiss}
            accessibilityLabel="Dismiss update alert"
            accessible={false}
          />
        )}

        <Animated.View
          entering={FadeIn.duration(220)}
          className="w-full max-w-[360px] bg-light-card rounded-[28px] p-6 items-center"
          style={[shadow.raised, { maxHeight: height * 0.85 }]}
        >
          {/* Badge Icon */}
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-4"
            style={{
              backgroundColor: isMandatory ? '#FEE2E2' : '#EEECFB',
            }}
          >
            <Ionicons
              name={isMandatory ? 'warning-outline' : 'rocket-outline'}
              size={32}
              color={isMandatory ? colors.danger : colors.primary}
            />
          </View>

          {/* Title */}
          <Text className="text-xl font-extrabold text-light-text text-center mb-1">
            {updateInfo.title || (isMandatory ? 'Update Required' : 'New Update Available')}
          </Text>

          {/* Version Chips */}
          <View className="flex-row items-center justify-center gap-2 mb-3 mt-1">
            <View className="bg-light-bg px-2.5 py-1 rounded-full border border-light-border">
              <Text className="text-xs font-semibold text-light-muted">
                Current: v{currentVersion}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={12} color={colors.subtle} />
            <View
              className="px-2.5 py-1 rounded-full"
              style={{ backgroundColor: isMandatory ? '#FEE2E2' : '#EEECFB' }}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: isMandatory ? colors.danger : colors.primary }}
              >
                v{latestVersion}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text className="text-sm text-light-muted text-center leading-5 mb-6 px-1">
            {updateInfo.message ||
              (isMandatory
                ? 'Please update to the latest version from Google Play to continue using Attendance System.'
                : 'A new version of Attendance System is ready with enhancements and performance updates.')}
          </Text>

          {/* Action Buttons */}
          <View className="w-full gap-2.5">
            <Button
              title="Update on Google Play"
              icon="logo-google-playstore"
              variant="primary"
              size="md"
              onPress={openStore}
              className="w-full"
            />

            {!isMandatory && (
              <Button
                title="Later"
                variant="ghost"
                size="sm"
                onPress={dismiss}
                className="w-full"
              />
            )}
          </View>

          {isMandatory && (
            <Text className="text-[11px] text-danger font-medium text-center mt-3">
              This update is mandatory to continue using the app.
            </Text>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
