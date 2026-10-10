import React from 'react';
import { View, Text, TextInput, ActivityIndicator } from 'react-native';

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
 const handleChange = (text: string) => {
 // Keep the field focused while a submission is in flight, but ignore typing
 if (loading) return;
 const digits = text.replace(/\D/g, '').slice(0, length);
 onChange(digits);
 if (digits.length === length) onComplete(digits);
 };

 return (
 <View className="w-full mt-4">
 <TextInput
 value={value}
 onChangeText={handleChange}
 editable={!disabled}
 autoFocus
 keyboardType="number-pad"
 maxLength={length}
 placeholder={'•'.repeat(length)}
 placeholderTextColor="#9CA3AF"
 selectionColor="#6366F1"
 className={`w-full h-20 rounded-2xl border-2 bg-light-card text-center text-4xl font-black text-light-text ${
 disabled ? 'opacity-50' : 'opacity-100'
 }`}
 style={{ letterSpacing: 12, borderColor: error ? '#DC2626' : '#6366F1' }}
 />
 <View className="h-6 mt-2 items-center justify-center">
 {loading ? (
 <ActivityIndicator size="small" color="#6366F1" />
 ) : error ? (
 <Text className="text-danger text-sm font-bold text-center">{error}</Text>
 ) : null}
 </View>
 </View>
 );
}
