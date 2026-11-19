import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UNO_FEATURE_TOPICS } from '../../constants/onboardingTour';
import { useOnboardingStore } from '../../store/onboardingStore';
import { colors, shadow } from '../../constants/theme';
import { BottomSheet } from '../BottomSheet';
import { Text } from '../Text';
import { UnoAvatar } from './UnoAvatar';

export function UnoFeatureGuidesSheet() {
  const showFeatureGuidesSheet = useOnboardingStore((s) => s.showFeatureGuidesSheet);
  const closeFeatureGuides = useOnboardingStore((s) => s.closeFeatureGuides);
  const goToStep = useOnboardingStore((s) => s.goToStep);
  const openDemoSession = useOnboardingStore((s) => s.openDemoSession);

  const handleSelectTopic = (stepIndex: number) => {
    closeFeatureGuides();
    goToStep(stepIndex);
  };

  const handleOpenDemo = () => {
    closeFeatureGuides();
    openDemoSession();
  };

  return (
    <BottomSheet
      visible={showFeatureGuidesSheet}
      onClose={closeFeatureGuides}
      title="Uno Feature Guides"
      subtitle="Explore individual walkthrough chapters and simulations."
    >
      <ScrollView className="max-h-[460px] pb-4" showsVerticalScrollIndicator={false}>
        {/* Interactive Demo Simulation Banner */}
        <TouchableOpacity
          onPress={handleOpenDemo}
          activeOpacity={0.85}
          className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex-row items-center mb-4"
        >
          <View className="w-11 h-11 rounded-xl bg-primary items-center justify-center mr-3" style={shadow.glow}>
            <Ionicons name="play" size={20} color={colors.white} />
          </View>
          <View className="flex-1 mr-2">
            <View className="flex-row items-center">
              <Text className="text-light-text font-extrabold text-[15px]">Interactive Attendance Demo</Text>
              <View className="bg-success px-2 py-0.5 rounded-full ml-2">
                <Text className="text-white text-[10px] font-extrabold">LIVE</Text>
              </View>
            </View>
            <Text className="text-light-muted text-xs font-medium mt-0.5">
              Experience the 4-digit code, 15s timer, and live roster in a safe simulation.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>

        {/* List of Feature Topics */}
        {UNO_FEATURE_TOPICS.map((topic) => (
          <TouchableOpacity
            key={topic.id}
            onPress={() => handleSelectTopic(topic.stepIndex)}
            activeOpacity={0.7}
            className="flex-row items-center bg-light border border-light-border rounded-2xl p-3.5 mb-2.5"
          >
            <View className="w-10 h-10 rounded-xl bg-light-primaryBg items-center justify-center mr-3">
              <Ionicons name={topic.icon} size={18} color={colors.primary} />
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-light-text font-bold text-[14px]">{topic.title}</Text>
              <Text className="text-light-muted text-xs font-medium mt-0.5" numberOfLines={1}>
                {topic.summary}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.subtle} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}
