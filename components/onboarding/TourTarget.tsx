import React, { useEffect, useRef, useCallback } from 'react';
import { View, Animated, StyleSheet, type ViewProps, type LayoutChangeEvent } from 'react-native';
import { useOnboardingStore } from '../../store/onboardingStore';
import { INTERACTIVE_TOUR_STEPS } from '../../constants/onboardingTour';
import { colors } from '../../constants/theme';

interface TourTargetProps extends ViewProps {
  targetKey: string;
  borderRadius?: number;
  children: React.ReactNode;
}

export function TourTarget({
  targetKey,
  borderRadius = 16,
  children,
  style,
  onLayout,
  ...rest
}: TourTargetProps) {
  const viewRef = useRef<View>(null);
  const registerTarget = useOnboardingStore((s) => s.registerTarget);
  const unregisterTarget = useOnboardingStore((s) => s.unregisterTarget);
  const isActive = useOnboardingStore((s) => s.isActive);
  const currentStepIndex = useOnboardingStore((s) => s.currentStepIndex);

  const currentStep = INTERACTIVE_TOUR_STEPS[currentStepIndex];
  const isTargetActive = isActive && currentStep?.targetKey === targetKey;

  // Pulse animation for active target spotlight ring
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isTargetActive) {
      pulseAnim.setValue(0.4);
      pulseScale.setValue(1);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1.02,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [isTargetActive, pulseAnim, pulseScale]);

  const measure = useCallback(() => {
    if (!viewRef.current) return;
    requestAnimationFrame(() => {
      viewRef.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          registerTarget(targetKey, {
            x,
            y,
            width,
            height,
            borderRadius,
          });
        }
      });
    });
  }, [targetKey, borderRadius, registerTarget]);

  const handleLayout = (e: LayoutChangeEvent) => {
    onLayout?.(e);
    measure();
  };

  useEffect(() => {
    measure();
    const timer = setTimeout(measure, 150);
    return () => {
      clearTimeout(timer);
      unregisterTarget(targetKey);
    };
  }, [targetKey, measure, unregisterTarget]);

  useEffect(() => {
    if (isActive) {
      measure();
      const timer = setTimeout(measure, 100);
      return () => clearTimeout(timer);
    }
  }, [isActive, currentStepIndex, measure]);

  return (
    <View
      ref={viewRef}
      collapsable={false}
      onLayout={handleLayout}
      style={style}
      {...rest}
    >
      {children}

      {/* Target Focus Ring around the component */}
      {isTargetActive && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius,
              borderWidth: 2.5,
              borderColor: colors.primary,
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
              opacity: pulseAnim,
              transform: [{ scale: pulseScale }],
            },
          ]}
        />
      )}
    </View>
  );
}
