import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Input({ label, error, icon, className = '', ...props }: InputProps) {
  return (
    <View className={`w-full mb-4 ${className}`}>
      {label && (
        <Text className="text-dark-muted font-medium mb-1.5 ml-1 text-sm">
          {label}
        </Text>
      )}
      <View
        className="flex-row items-center bg-dark-card border rounded-xl px-4 h-12"
        style={{ borderColor: error ? '#EF4444' : '#334155' }}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={error ? '#EF4444' : '#64748B'}
            className="mr-3"
          />
        )}
        <TextInput
          className="flex-1 text-white font-medium h-full"
          placeholderTextColor="#64748B"
          {...props}
        />
      </View>
      {error && (
        <Text className="text-danger text-xs font-medium mt-1.5 ml-1">
          {error}
        </Text>
      )}
    </View>
  );
}
