import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { VerificationState } from '../types';

interface VerificationStatusProps {
 state: VerificationState;
}

export function VerificationStatus({ state }: VerificationStatusProps) {
 const items = [
 { key: 'deviceMatched', label: 'Device ID', icon: 'phone-portrait-outline' as const, color: '#1A1D1F' },
 { key: 'locationVerified', label: 'Local GPS', icon: 'location-outline' as const, color: '#6366F1' },
 ];

 return (
 <View className="bg-light-card shadow-sm rounded-2xl p-4 w-full border border-light-border">
 <Text className="text-light-text font-bold text-lg mb-4 ml-1">Verification Status</Text>
 
 <View className="flex-row flex-wrap justify-between">
 {items.map(({ key, label, icon }) => {
 // Status: null = loading/unknown, true = success, false = fail
 const status = state[key as keyof VerificationState];
 
 let color = '#6B7280'; // muted
 let StatusIcon = () => <ActivityIndicator size="small" color={color} />;
 
 if (status === true) {
 color = '#059669'; // success
 StatusIcon = () => <Ionicons name="checkmark-circle" size={20} color={color} />;
 } else if (status === false) {
 color = '#1A1D1F'; // danger
 StatusIcon = () => <Ionicons name="close-circle" size={20} color={color} />;
 } else {
 // null
 StatusIcon = () => <Ionicons name="ellipse-outline" size={20} color={color} />;
 }

 return (
 <View key={key} className="w-[48%] mb-4 flex-row items-center p-2 rounded-xl bg-[#F7F9FC] border border-light-border/50">
 <View 
 className="p-2 rounded-full mr-3 border"
 style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}
 >
 <Ionicons name={icon} size={18} color={color} />
 </View>
 <View className="flex-1">
 <Text className="text-light-muted text-xs font-medium mb-1">{label}</Text>
 <View className="flex-row items-center">
 <StatusIcon />
 <Text 
 className="text-xs font-bold ml-1"
 style={{ color }}
 >
 {status === true ? 'Verified' : status === false ? 'Failed' : 'Waiting...'}
 </Text>
 </View>
 </View>
 </View>
 );
 })}
 </View>
 </View>
 );
}
