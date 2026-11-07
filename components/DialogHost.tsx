import React from 'react';
import { View, Modal, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Text } from './Text';
import { Button } from './Button';
import { colors, shadow } from '../constants/theme';
import { useDialogStore } from '../store/dialogStore';
import { buttonVariant, dialogLayout, dialogTone, dismissButton, type DialogButton, type DialogTone } from '../utils/dialog';

const TONES: Record<DialogTone, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  info: { icon: 'information-circle', color: colors.primary, bg: colors.primaryBg },
  success: { icon: 'checkmark-circle', color: colors.success, bg: colors.successBg },
  warning: { icon: 'alert-circle', color: colors.warning, bg: colors.warningBg },
  danger: { icon: 'warning', color: colors.danger, bg: colors.dangerBg },
};

/**
 * Renders the app's dialogs. Mount once at the root; open one with showAlert(...).
 * Dialogs queue, so two calls in a row show one after the other instead of on top of each other.
 */
export function DialogHost() {
  const current = useDialogStore((s) => s.current);
  const close = useDialogStore((s) => s.close);
  const { height } = useWindowDimensions();

  if (!current) return null;

  const { title, message, buttons } = current;
  const tone = TONES[dialogTone(title, buttons)];
  const { direction, ordered } = dialogLayout(buttons);
  const dismiss = dismissButton(buttons);

  const press = (button: DialogButton) => {
    close();
    // After closing, so a handler that opens another dialog queues it behind a free screen
    void button.onPress?.();
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => dismiss && press(dismiss)}>
      <Animated.View
        key={current.id}
        entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(120)}
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: colors.overlay }}
      >
        {/* Tapping the dim area behaves like Cancel, when the dialog has one */}
        <Pressable
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          onPress={() => dismiss && press(dismiss)}
          accessibilityLabel="Dismiss"
          accessible={false}
        />

        <Animated.View
          entering={FadeIn.duration(140)}
          className="w-full max-w-[340px] bg-light-card rounded-2xl px-5 pt-5 pb-4 items-center"
          style={[shadow.card, { maxHeight: height * 0.8 }]}
          accessibilityViewIsModal
        >
          <View className="w-11 h-11 rounded-full items-center justify-center mb-3" style={{ backgroundColor: tone.bg }}>
            <Ionicons name={tone.icon} size={24} color={tone.color} />
          </View>

          <Text className="text-light-text text-base font-bold text-center" accessibilityRole="header">
            {title}
          </Text>

          {message ? (
            <ScrollView className="mt-1.5 w-full" style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false}>
              <Text className="text-light-muted text-sm leading-5 text-center">{message}</Text>
            </ScrollView>
          ) : null}

          <View className={`w-full mt-5 ${direction === 'row' ? 'flex-row' : ''}`}>
            {ordered.map((button, i) => (
              <Button
                key={`${button.text ?? 'OK'}-${i}`}
                title={button.text ?? 'OK'}
                variant={buttonVariant(button, i, ordered)}
                size="sm"
                onPress={() => press(button)}
                className={direction === 'row' ? `flex-1 ${i > 0 ? 'ml-3' : ''}` : `w-full ${i > 0 ? 'mt-3' : ''}`}
              />
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
