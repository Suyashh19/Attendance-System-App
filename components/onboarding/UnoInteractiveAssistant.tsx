import React from 'react';
import { View, StyleSheet } from 'react-native';
import { UnoWelcomeModal } from './UnoWelcomeModal';
import { UnoAssistantBar } from './UnoAssistantBar';
import { UnoDemoModal } from './UnoDemoModal';
import { UnoFeatureGuidesSheet } from './UnoFeatureGuidesSheet';

export function UnoInteractiveAssistant() {
  return (
    <View
      pointerEvents="box-none"
      style={[
        StyleSheet.absoluteFillObject,
        { zIndex: 99999, elevation: 99999 },
      ]}
    >
      {/* 1. Welcome Intro Modal (on first login or reset) */}
      <UnoWelcomeModal />

      {/* 2. Interactive Hands-on Assistant Bar (non-blocking) */}
      <UnoAssistantBar />

      {/* 3. Safe Live Attendance Demo Simulation */}
      <UnoDemoModal />

      {/* 4. Feature Guides Sheet */}
      <UnoFeatureGuidesSheet />
    </View>
  );
}

// Backwards-compatible export for OnboardingTourModal
export const OnboardingTourModal = UnoInteractiveAssistant;
