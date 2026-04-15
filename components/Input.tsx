import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Input({ label, error, icon, className = '', secureTextEntry, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View className={`w-full mb-4 ${className}`}>
      {label && (
        <Text className="text-light-muted font-medium mb-1.5 ml-1 text-sm">
          {label}
        </Text>
      )}
      <View
        className="flex-row items-center bg-light-card shadow-sm border rounded-xl px-4 h-12"
        style={{ borderColor: error ? '#1A1D1F' : '#E5EAF2' }}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={error ? '#1A1D1F' : '#6B7280'}
            className="mr-3"
          />
        )}
        <TextInput
          className="flex-1 text-light-text font-medium h-full"
          placeholderTextColor="#6B7280"
          secureTextEntry={isPassword ? !showPassword : false}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)}
            className="ml-2"
          >
            <Ionicons 
              name={showPassword ? "eye-off-outline" : "eye-outline"} 
              size={20} 
              color="#6B7280" 
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text className="text-danger text-xs font-medium mt-1.5 ml-1">
          {error}
        </Text>
      )}
    </View>
  );
}
