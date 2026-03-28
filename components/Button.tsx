import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  icon,
}: ButtonProps) {
  const baseClasses = 'flex-row items-center justify-center rounded-xl overflow-hidden';
  
  const variantClasses = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    danger: 'bg-danger',
    outline: 'bg-transparent border-2 border-primary',
  };

  const textClasses = {
    primary: 'text-white font-bold',
    secondary: 'text-white font-bold',
    danger: 'text-white font-bold',
    outline: 'text-primary font-bold',
  };

  const sizeClasses = {
    sm: 'py-2 px-4',
    md: 'py-3 px-6 h-12',
    lg: 'py-4 px-8 h-14',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      style={{ opacity: disabled || loading ? 0.6 : 1 }}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#6366F1' : '#FFFFFF'} />
      ) : (
        <View className="flex-row items-center">
          {icon && (
            <Ionicons 
              name={icon} 
              size={18} 
              color={variant === 'outline' ? '#6366F1' : '#FFFFFF'} 
              className="mr-2" 
            />
          )}
          <Text className={`${textClasses[variant]} text-center tracking-wide`}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
