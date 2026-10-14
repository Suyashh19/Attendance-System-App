import React from 'react';
import { View, KeyboardAvoidingView, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { Hero } from './Hero';
import { Card } from './Card';
import { shadow } from '../constants/theme';

interface AuthShellProps {
  title: string;
  subtitle: string;
  /** The form, shown in the white card */
  children: React.ReactNode;
  /** Links under the card */
  footer?: React.ReactNode;
}

/** Shared layout of the sign-in screens: gradient banner with the logo, form card over its edge. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView className="flex-1 bg-light" behavior="padding">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Hero className="px-6 pb-24 items-center" style={{ paddingTop: insets.top + 44 }}>
          <View
            className="w-[84px] h-[84px] bg-white rounded-[26px] items-center justify-center mb-6 overflow-hidden"
            style={shadow.glow}
          >
            <Image
              source={require('../assets/icon.png')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </View>
          <Text className="text-white text-[30px] font-extrabold text-center">{title}</Text>
          <Text className="text-white/70 text-[15px] text-center mt-2 px-4 leading-5">{subtitle}</Text>
          <View className="w-10 h-1 rounded-full bg-gold mt-5" />
        </Hero>

        <View className="px-5 -mt-14" style={{ paddingBottom: insets.bottom + 32 }}>
          <Card className="p-6 rounded-[28px]">
            {children}
          </Card>
          {footer}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
