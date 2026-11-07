import React, { useState } from 'react';
import { View, TextInput, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors } from '../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Input({ label, error, icon, className = '', secureTextEntry, onFocus, onBlur, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPassword = secureTextEntry;

  const accent = error ? colors.danger : focused ? colors.primary : colors.subtle;
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View className={`w-full mb-4 ${className}`}>
      {label && (
        <Text className="text-light-text font-semibold mb-2 ml-1 text-[13px]">
          {label}
        </Text>
      )}
      <View
        className="flex-row items-center rounded-2xl px-4 h-14"
        style={{
          borderColor,
          borderWidth: 1.5,
          backgroundColor: focused ? colors.card : colors.bg,
        }}
      >
        {icon && <Ionicons name={icon} size={20} color={accent} style={{ marginRight: 12 }} />}
        <TextInput
          className="flex-1 text-light-text font-medium text-[15px] h-full"
          placeholderTextColor={colors.subtle}
          selectionColor={colors.primary}
          secureTextEntry={isPassword ? !showPassword : false}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            className="ml-2"
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.muted}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <View className="flex-row items-center mt-1.5 ml-1">
          <Ionicons name="alert-circle" size={13} color={colors.danger} style={{ marginRight: 4 }} />
          <Text className="text-danger text-xs font-medium flex-1">{error}</Text>
        </View>
      )}
    </View>
  );
}
