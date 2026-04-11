import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface CodeOptionButtonProps {
 code: string;
 isSelected: boolean;
 onPress: () => void;
 disabled?: boolean;
}

export function CodeOptionButton({
 code,
 isSelected,
 onPress,
 disabled = false,
}: CodeOptionButtonProps) {
 return (
 <TouchableOpacity
 activeOpacity={0.7}
 disabled={disabled}
 onPress={onPress}
 className={`w-[48%] aspect-[2/1] rounded-2xl items-center justify-center border-2 mb-4 ${
 isSelected
 ? 'bg-primary/20 border-primary'
 : 'bg-light-card shadow-sm border-light-border'
 } ${disabled && !isSelected ? 'opacity-50' : 'opacity-100'}`}
 >
 <Text
 className={`text-2xl font-black tracking-widest ${
 isSelected ? 'text-primary' : 'text-light-text'
 }`}
 >
 {code}
 </Text>
 </TouchableOpacity>
 );
}

interface AttendanceCodeSelectorProps {
 options: string[];
 selectedCode: string | null;
 onSelect: (code: string) => void;
 disabled?: boolean;
}

export function AttendanceCodeSelector({
 options,
 selectedCode,
 onSelect,
 disabled = false,
}: AttendanceCodeSelectorProps) {
 return (
 <View className="flex-row flex-wrap justify-between w-full mt-6">
 {options.map((code) => (
 <CodeOptionButton
 key={code}
 code={code}
 isSelected={selectedCode === code}
 onPress={() => onSelect(code)}
 disabled={disabled}
 />
 ))}
 </View>
 );
}
