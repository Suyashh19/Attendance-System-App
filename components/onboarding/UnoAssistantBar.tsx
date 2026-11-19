import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  useWindowDimensions,
  Platform,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { INTERACTIVE_TOUR_STEPS } from '../../constants/onboardingTour';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';
import { colors, shadow } from '../../constants/theme';
import { Text } from '../Text';
import { UnoAvatar } from './UnoAvatar';

export function UnoAssistantBar() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const isActive = useOnboardingStore((s) => s.isActive);
  const isMinimized = useOnboardingStore((s) => s.isMinimized);
  const currentStepIndex = useOnboardingStore((s) => s.currentStepIndex);
  const targets = useOnboardingStore((s) => s.targets);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const toggleMinimized = useOnboardingStore((s) => s.toggleMinimized);
  const skipTour = useOnboardingStore((s) => s.skipTour);
  const finishTour = useOnboardingStore((s) => s.finishTour);
  const openDemoSession = useOnboardingStore((s) => s.openDemoSession);
  const isCreateModalOpen = useOnboardingStore((s) => s.isCreateModalOpen);
  const hasTestedLiveDemo = useOnboardingStore((s) => s.hasTestedLiveDemo);
  const isDemoSessionActive = useOnboardingStore((s) => s.isDemoSessionActive);
  const goToStepId = useOnboardingStore((s) => s.goToStepId);
  const user = useAuthStore((s) => s.user);

  // Constraint validation & attention shake feedback
  const [actionWarning, setActionWarning] = useState<string | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Track whether assistant has already completed initial entry to prevent blinking on step changes
  const wasActiveRef = useRef(false);
  const animOpacity = useRef(new Animated.Value(1)).current;

  // Clear any task warning when step changes
  useEffect(() => {
    setActionWarning(null);
  }, [currentStepIndex]);

  const triggerShake = (warningMessage: string) => {
    setActionWarning(warningMessage);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: -3, duration: 50, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: false }),
    ]).start();
  };

  const step = INTERACTIVE_TOUR_STEPS[currentStepIndex];

  // During modal steps (CreateSubjectModal), Uno's pinned guidance is rendered inside the modal header
  const isModalStep =
    step?.id === 'enter_subject_name' ||
    step?.id === 'enter_subject_code' ||
    step?.id === 'pick_academic_term' ||
    step?.id === 'tap_create_button';

  useEffect(() => {
    // If we're on a modal step but the modal is closed, auto-recover to tap_new_subject so Uno never disappears
    if (isModalStep && !isCreateModalOpen && isActive) {
      goToStepId('tap_new_subject');
    }
  }, [isModalStep, isCreateModalOpen, isActive, goToStepId]);

  useEffect(() => {
    if (!isActive) {
      wasActiveRef.current = false;
      animOpacity.setValue(0);
      return;
    }

    if (!wasActiveRef.current) {
      wasActiveRef.current = true;
      animOpacity.setValue(0);
      Animated.timing(animOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: false,
      }).start();
    } else {
      // Keep rock-solid opacity at 1 when navigating between steps
      animOpacity.setValue(1);
    }
  }, [isActive]);

  const totalSteps = INTERACTIVE_TOUR_STEPS.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Screen layout detection: tab screen vs stack screen
  const isTabScreen = segments[0] === '(tabs)';
  // Bottom tab bar height is roughly 64px + safe insets; lift Uno up so bottom navigation is 100% visible
  const bottomBarClearance = isTabScreen ? insets.bottom + 84 : Math.max(insets.bottom + 16, 20);

  // Target coordinates for adaptive positioning
  const target = step?.targetKey ? targets[step.targetKey] : undefined;
  // Strictly honor step.placement: 'bottom' stays docked at bottom; 'top' stays at top
  const isTopTarget = Boolean(
    step?.placement === 'top' ||
      (step?.placement !== 'bottom' && target && target.y > 0 && target.y < screenHeight * 0.32)
  );

  // When placed at top, never allow large targets to push Uno off-screen
  const topPosition = Math.min(
    Math.max(
      insets.top + 76,
      target && target.y > 0 && target.height < 150
        ? target.y + target.height + 10
        : insets.top + 80
    ),
    screenHeight - 220
  );

  // ─── Free 2D Dragging Gesture Hooks (Always called unconditionally) ────────
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Reset drag position on step changes so Uno docks at optimal smart position for the new step
  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
  }, [currentStepIndex]);

  // Keep latest bounds in refs for safe clamping on release
  const boundsRef = useRef({ isTopTarget: false, topPosition: 80, bottomBarClearance: 84 });
  boundsRef.current = { isTopTarget, topPosition, bottomBarClearance };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only claim gesture if dragged more than 6px, letting normal button taps fire cleanly
        return Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6;
      },
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        // @ts-ignore
        const curX = pan.x._value ?? 0;
        // @ts-ignore
        const curY = pan.y._value ?? 0;

        const maxHorizontal = screenWidth * 0.42;
        const clampedX = Math.max(-maxHorizontal, Math.min(maxHorizontal, curX));

        let minY = -screenHeight * 0.7;
        let maxY = screenHeight * 0.7;

        if (boundsRef.current.isTopTarget) {
          minY = -(boundsRef.current.topPosition - insets.top - 10);
          maxY = screenHeight - boundsRef.current.topPosition - boundsRef.current.bottomBarClearance - 140;
        } else {
          minY = -(screenHeight - boundsRef.current.bottomBarClearance - insets.top - 180);
          maxY = Math.max(0, boundsRef.current.bottomBarClearance - insets.bottom - 10);
        }

        const clampedY = Math.max(minY, Math.min(maxY, curY));

        if (clampedX !== curX || clampedY !== curY) {
          Animated.spring(pan, {
            toValue: { x: clampedX, y: clampedY },
            useNativeDriver: false,
            friction: 7,
            tension: 40,
          }).start();
        }
      },
    })
  ).current;

  // Safe early returns AFTER all hooks have executed
  if (!isActive || !step) return null;
  if (isModalStep && isCreateModalOpen) {
    return null;
  }

  const safeNavigateHome = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/home');
      }
    } catch {
      try {
        router.replace('/(tabs)/home');
      } catch {}
    }
  };

  const checkCanProceed = (): { canProceed: boolean; reason?: string } => {
    if (!step) return { canProceed: true };

    // 1. Task 2: User must tap "+ New subject" to open creation modal
    if (step.id === 'tap_new_subject') {
      if (!isCreateModalOpen) {
        return {
          canProceed: false,
          reason: "Please tap the highlighted '+ New subject' button above to proceed.",
        };
      }
    }

    // 2. Task 5: User must tap "Start" on subject card to test live attendance
    if (step.id === 'home_start_attendance') {
      if (!hasTestedLiveDemo && !isDemoSessionActive) {
        return {
          canProceed: false,
          reason: "Please tap the highlighted 'Start' button on your subject card above first.",
        };
      }
    }

    // 3. Task 6: User must tap subject card to open class roster
    if (step.id === 'tap_open_roster') {
      const isOnSubjectScreen = segments.some((s) => s.includes('subject'));
      if (!isOnSubjectScreen) {
        return {
          canProceed: false,
          reason: "Please tap your subject card above to open the class roster.",
        };
      }
    }

    // 4. Task 7: User must tap Leave Requests card in header
    if (step.id === 'navigate_to_leaves') {
      const isOnLeavesScreen = segments.some((s) => s.includes('leave-requests'));
      if (!isOnLeavesScreen) {
        return {
          canProceed: false,
          reason: "Please tap the Leave requests card in your dashboard header above.",
        };
      }
    }

    // 5. Task 8: User must tap Reports tab in bottom navigation bar
    if (step.id === 'navigate_to_reports') {
      const isOnReportsScreen = segments.some((s) => s.includes('history'));
      if (!isOnReportsScreen) {
        return {
          canProceed: false,
          reason: "Please tap the 'Reports' tab in the bottom navigation bar to continue.",
        };
      }
    }

    return { canProceed: true };
  };

  // Handle smart contextual button actions
  const handlePrimaryAction = () => {
    const check = checkCanProceed();
    if (!check.canProceed) {
      triggerShake(check.reason || 'Please perform this task to proceed.');
      return;
    }

    setActionWarning(null);

    if (step.id === 'walkthrough_finished') {
      finishTour(user?.id);
      safeNavigateHome();
      return;
    }

    if (step.hasDemoAction) {
      openDemoSession();
      return;
    }

    if (step.id === 'navigate_to_settings') {
      try {
        router.push('/settings');
      } catch {}
      nextStep();
      return;
    }

    if (step.id === 'settings_semester_months') {
      nextStep();
      return;
    }

    if (step.id === 'settings_attendance_preferences') {
      safeNavigateHome();
      nextStep();
      return;
    }

    if (step.id === 'explain_roster_management') {
      try {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)/home');
        }
      } catch {}
      nextStep();
      return;
    }

    if (step.id === 'explain_leaves_view') {
      try {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)/home');
        }
      } catch {}
      nextStep();
      return;
    }

    if (step.id === 'explain_reports_export') {
      nextStep();
      return;
    }

    if (isLastStep) {
      finishTour(user?.id);
      safeNavigateHome();
    } else {
      nextStep();
    }
  };

  const handlePrev = () => {
    setActionWarning(null);
    prevStep();
  };

  const handleSkip = () => {
    skipTour(user?.id);
  };

  // Minimized floating pill (docked above bottom navigation bar on tab screens)
  if (isMinimized) {
    return (
      <View
        pointerEvents="box-none"
        style={[
          styles.container,
          {
            bottom: bottomBarClearance,
            alignItems: 'flex-end',
            paddingRight: 16,
          },
        ]}
      >
        <TouchableOpacity
          onPress={toggleMinimized}
          activeOpacity={0.85}
          style={[
            styles.assistantShadow,
            {
              backgroundColor: '#F8F9FF',
              borderColor: 'rgba(99, 102, 241, 0.4)',
              borderWidth: 1.5,
            },
          ]}
          className="rounded-full px-3.5 py-2 flex-row items-center"
          accessibilityRole="button"
          accessibilityLabel="Expand Uno Assistant"
        >
          <UnoAvatar size="sm" />
          <View className="ml-2 mr-1">
            <Text className="text-primary font-extrabold text-xs">Uno Guide</Text>
            <Text className="text-light-muted text-[10px] font-semibold">
              Task {step.taskNumber}/{step.totalTasks}
            </Text>
          </View>
          <Ionicons name="chevron-up" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  }

  // Expanded interactive assistant card
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        isTopTarget
          ? { top: topPosition, paddingHorizontal: 14 }
          : { bottom: bottomBarClearance, paddingHorizontal: 14 },
      ]}
    >
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.card,
          styles.assistantShadow,
          {
            opacity: animOpacity,
            transform: [
              { translateX: Animated.add(shakeAnim, pan.x) },
              { translateY: pan.y },
            ],
            backgroundColor: '#F7F8FF',
            borderColor: 'rgba(99, 102, 241, 0.38)',
            borderWidth: 2,
          },
        ]}
        className="rounded-[26px] p-3.5"
      >
        {/* Subtle Drag Handle Indicator */}
        <View className="items-center -mt-1 mb-2" pointerEvents="none">
          <View className="w-10 h-1 rounded-full bg-primary/25" />
        </View>

        {/* Directional Upward Pointer when positioned near top targets */}
        {isTopTarget && step.pointerDirection === 'up' && (
          <View className="items-center -mt-0.5 mb-2" pointerEvents="none">
            <View className="bg-primary/15 border border-primary/30 px-2.5 py-0.5 rounded-full flex-row items-center">
              <Ionicons name="arrow-up" size={11} color={colors.primary} style={{ marginRight: 3 }} />
              <Text className="text-primary text-[10px] font-extrabold uppercase">Look above</Text>
            </View>
          </View>
        )}

        {/* Header: Uno Persona Tag, Topic Pill, Minimize & Skip */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="bg-primary/10 p-0.5 rounded-full mr-2">
              <UnoAvatar size="sm" />
            </View>
            <View className="flex-1 mr-1">
              <View className="flex-row items-center">
                <Text className="text-primary font-black text-xs mr-1.5">Uno Guide</Text>
                <View className="bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  <Text className="text-primary text-[10px] font-extrabold">
                    Task {step.taskNumber}/{step.totalTasks}
                  </Text>
                </View>
              </View>
              <Text className="text-light-muted text-[10px] font-semibold" numberOfLines={1}>
                {step.taskTitle}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center space-x-1">
            <TouchableOpacity
              onPress={toggleMinimized}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              className="w-7 h-7 rounded-full bg-white border border-primary/20 items-center justify-center mr-1"
              accessibilityRole="button"
              accessibilityLabel="Minimize assistant"
            >
              <Ionicons name="remove-outline" size={16} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSkip}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Skip tutorial"
              className="px-1.5 py-0.5"
            >
              <Text className="text-light-subtle text-xs font-semibold">Skip</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Uno Speech Bubble Container (distinct soft white assistant speech card) */}
        <View className="bg-white rounded-2xl p-3 mb-2 border border-primary/15 shadow-sm">
          <Text className="text-light-text font-semibold text-[12.5px] leading-[18px]">
            "{step.unoSpeech}"
          </Text>
        </View>

        {/* Action Hint Banner */}
        {step.actionHint && (
          <View className="flex-row items-center mb-2.5 px-1">
            <Ionicons name="arrow-forward-circle" size={14} color={colors.primary} style={{ marginRight: 5 }} />
            <Text className="text-primary text-[11.5px] font-bold flex-1" numberOfLines={2}>
              {step.actionHint}
            </Text>
          </View>
        )}

        {/* Action Constraint Warning (if user attempts to proceed without performing task) */}
        {actionWarning && (
          <View className="bg-amber-50 border border-amber-300 rounded-xl px-2.5 py-1.5 mb-2.5 flex-row items-center">
            <Ionicons name="warning-outline" size={15} color="#D97706" style={{ marginRight: 6 }} />
            <Text className="text-amber-900 text-[11px] font-bold flex-1">
              {actionWarning}
            </Text>
          </View>
        )}

        {/* Footer Navigation Controls */}
        <View className="flex-row items-center justify-between pt-1 border-t border-primary/10">
          {!isFirstStep ? (
            <TouchableOpacity
              onPress={handlePrev}
              activeOpacity={0.75}
              className="w-8 h-8 rounded-full bg-white border border-primary/20 items-center justify-center mr-2"
              accessibilityRole="button"
              accessibilityLabel="Previous step"
            >
              <Ionicons name="chevron-back" size={16} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 32 }} />
          )}

          {/* Step Indicator */}
          <View className="flex-row items-center justify-center flex-1 mx-2">
            <Text className="text-light-subtle text-[11px] font-bold">
              Step {currentStepIndex + 1} of {totalSteps}
            </Text>
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            onPress={handlePrimaryAction}
            activeOpacity={0.85}
            className="bg-primary px-3.5 py-1.5 rounded-full flex-row items-center shadow-sm"
            accessibilityRole="button"
            accessibilityLabel={step.buttonLabel || (isLastStep ? 'Finish' : 'Next')}
          >
            <Text className="text-white font-bold text-xs mr-1">
              {step.buttonLabel || (isLastStep ? 'Finish' : 'Next')}
            </Text>
            <Ionicons
              name={isLastStep ? 'checkmark' : step.hasDemoAction ? 'play' : 'chevron-forward'}
              size={13}
              color={colors.white}
            />
          </TouchableOpacity>
        </View>

        {/* Directional Downward Pointer when pointing towards the bottom tab bar */}
        {!isTopTarget && step.pointerDirection === 'down' && (
          <View className="items-center mt-2 -mb-0.5" pointerEvents="none">
            <View className="bg-primary px-3 py-1 rounded-full flex-row items-center shadow-sm">
              <Ionicons name="arrow-down" size={12} color={colors.white} style={{ marginRight: 4 }} />
              <Text className="text-white text-[10.5px] font-extrabold">Tap Reports tab below</Text>
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 99999,
    elevation: 99999,
  },
  card: {
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  assistantShadow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
});
