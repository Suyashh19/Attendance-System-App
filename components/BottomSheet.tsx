import React from 'react';
import { View, Modal, KeyboardAvoidingView, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, shadow } from '../constants/theme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Extra layout for the sheet itself, e.g. a fixed height for sheets holding a list */
  style?: StyleProp<ViewStyle>;
}

/** A panel that slides up from the bottom edge, with a grabber, a title and a close button. */
export function BottomSheet({ visible, onClose, title, subtitle, children, style }: BottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior="padding"
        className="flex-1 justify-end"
        style={{ backgroundColor: colors.overlay }}
      >
        <View
          className="bg-light-card rounded-t-[32px] px-6 pt-3"
          style={[shadow.raised, { paddingBottom: insets.bottom + 20 }, style]}
        >
          <View className="w-10 h-1.5 rounded-full bg-light-border self-center mb-5" />

          <View className="flex-row items-start mb-5">
            <View className="flex-1 mr-3">
              <Text className="text-2xl font-extrabold text-light-text">{title}</Text>
              {subtitle ? <Text className="text-light-muted text-sm leading-5 mt-1">{subtitle}</Text> : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="w-9 h-9 rounded-full bg-light items-center justify-center"
            >
              <Ionicons name="close" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
