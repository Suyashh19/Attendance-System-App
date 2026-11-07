import React, { useRef } from 'react';
import { View, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, shadow } from '../constants/theme';

interface AttendanceCodeInputProps {
  value: string;
  length: number;
  onChange: (code: string) => void;
  onComplete: (code: string) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
}

export function AttendanceCodeInput({
  value,
  length,
  onChange,
  onComplete,
  disabled = false,
  loading = false,
  error,
}: AttendanceCodeInputProps) {
  const inputRef = useRef<TextInput>(null);

  const handleChange = (text: string) => {
    // Keep the field focused while a submission is in flight, but ignore typing
    if (loading) return;
    const digits = text.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete(digits);
  };

  return (
    <View className="w-full mt-5">
      {/* One box per digit; the real input sits invisibly on top and owns the keyboard */}
      <Pressable
        onPress={() => inputRef.current?.focus()}
        className={`flex-row justify-center ${disabled ? 'opacity-50' : 'opacity-100'}`}
      >
        {Array.from({ length }, (_, i) => {
          const isCurrent = !disabled && i === Math.min(value.length, length - 1);
          const filled = !!value[i];
          const borderColor = error ? colors.danger : isCurrent || filled ? colors.primary : colors.border;

          return (
            <View
              key={i}
              className={`${length > 4 ? 'w-11 h-14 mx-1 rounded-xl' : 'w-[60px] h-[72px] mx-1.5 rounded-2xl'} items-center justify-center`}
              style={[
                {
                  borderColor,
                  borderWidth: isCurrent || error ? 2 : 1.5,
                  backgroundColor: error ? colors.dangerBg : filled ? colors.primaryBg : isCurrent ? colors.card : colors.bg,
                },
                isCurrent && !error ? shadow.glow : undefined,
              ]}
            >
              <Text className={`font-extrabold text-light-text ${length > 4 ? 'text-2xl' : 'text-[32px]'}`}>
                {value[i] ?? ''}
              </Text>
            </View>
          );
        })}

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={handleChange}
          editable={!disabled}
          autoFocus
          keyboardType="number-pad"
          maxLength={length}
          caretHidden
          accessibilityLabel={`${length}-digit attendance code`}
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, opacity: 0 }}
        />
      </Pressable>

      <View className="h-6 mt-4 flex-row items-center justify-center">
        {loading ? (
          <>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text className="text-primary text-sm font-semibold ml-2">Checking code...</Text>
          </>
        ) : error ? (
          <>
            <Ionicons name="alert-circle" size={16} color={colors.danger} style={{ marginRight: 6 }} />
            <Text className="text-danger text-sm font-semibold text-center">{error}</Text>
          </>
        ) : null}
      </View>
    </View>
  );
}
