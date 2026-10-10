import React from 'react';
import { View, Text, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
 FadeIn, 
 FadeInUp,
 FadeOut, 
 ZoomIn,
} from 'react-native-reanimated';

import type { AttendanceStatus } from '../types';
import { Button } from './Button';

interface AttendanceResultModalProps {
 visible: boolean;
 status: AttendanceStatus | 'LOADING' | null;
 message?: string;
 onDismiss: () => void;
}

export function AttendanceResultModal({
 visible,
 status,
 message,
 onDismiss,
}: AttendanceResultModalProps) {
 if (!visible || !status) return null;

 const getConfig = () => {
 switch (status) {
 case 'LOADING':
 return {
 color: '#6366F1', // primary
 bg: 'bg-primary/10',
 icon: null,
 title: 'Verifying Attendance...',
 desc: 'Please wait while we validate your device, code, and time window.',
 };
 case 'PRESENT':
 return {
 color: '#059669', // success
 bg: 'bg-success/10',
 icon: 'checkmark-circle',
 title: 'Marked Present!',
 desc: message || 'Your attendance was successfully verified and recorded.',
 };
 case 'ABSENT':
 return {
 color: '#1A1D1F', // danger
 bg: 'bg-danger/10',
 icon: 'close-circle',
 title: 'Marked Absent',
 desc: message || 'You missed the attendance window or failed verification.',
 };
 case 'INVALID':
 return {
 color: '#6B7280', // warning
 bg: 'bg-warning/10',
 icon: 'warning',
 title: 'Invalid Attempt',
 desc: message ? `Reason: ${message}` : 'Verification failed for this attempt.',
 };
 case 'EXPIRED':
 return {
 color: '#6B7280', // warning
 bg: 'bg-warning/10',
 icon: 'hourglass-outline',
 title: 'Time Expired',
 desc: message || 'No code was entered within the time limit.',
 };
 default:
 return {
 color: '#FFFFFF',
 bg: 'bg-light-card shadow-sm',
 icon: 'help-circle',
 title: 'Unknown Status',
 desc: 'Something went wrong.',
 };
 }
 };

 const config = getConfig();

 return (
 <Modal visible={visible} transparent animationType="none">
 <View className="flex-1 bg-black/80 items-center justify-center p-6">
 <Animated.View 
 entering={ZoomIn.duration(300)}
 exiting={FadeOut.duration(200)}
 className="bg-light-card shadow-sm w-full rounded-3xl p-6 border border-light-border items-center "
 >
 
 <Animated.View 
 entering={FadeInUp.delay(200).duration(400)}
 className={`w-24 h-24 rounded-full items-center justify-center mb-6`}
 style={{ backgroundColor: `${config.color}20` }}
 >
 {status === 'LOADING' ? (
 <ActivityIndicator size="large" color={config.color} />
 ) : (
 <Ionicons name={config.icon as any} size={64} color={config.color} />
 )}
 </Animated.View>

 <Text className="text-2xl font-bold text-light-text mb-3 text-center">
 {config.title}
 </Text>
 
 <Text className="text-light-muted text-center mb-8 px-4 leading-relaxed">
 {config.desc}
 </Text>

 {status !== 'LOADING' && (
 <Animated.View entering={FadeIn.delay(400)} className="w-full">
 <Button
 title="Back to Home"
 onPress={onDismiss}
 className="w-full"
 variant="outline"
 />
 </Animated.View>
 )}
 </Animated.View>
 </View>
 </Modal>
 );
}
