import React from 'react';
import { View, Text, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
          desc: 'Please wait while we validate your device, location, and time window.',
        };
      case 'PRESENT':
        return {
          color: '#10B981', // success
          bg: 'bg-success/10',
          icon: 'checkmark-circle',
          title: 'Marked Present!',
          desc: message || 'Your attendance was successfully verified and recorded.',
        };
      case 'ABSENT':
        return {
          color: '#EF4444', // danger
          bg: 'bg-danger/10',
          icon: 'close-circle',
          title: 'Marked Absent',
          desc: message || 'You missed the attendance window or failed verification.',
        };
      case 'INVALID':
        return {
          color: '#F59E0B', // warning
          bg: 'bg-warning/10',
          icon: 'warning',
          title: 'Invalid Attempt',
          desc: message || 'Proxy detected. Device and location mismatch.',
        };
      default:
        return {
          color: '#FFFFFF',
          bg: 'bg-dark-card',
          icon: 'help-circle',
          title: 'Unknown Status',
          desc: 'Something went wrong.',
        };
    }
  };

  const config = getConfig();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/80 items-center justify-center p-6">
        <View className="bg-dark-card w-full rounded-3xl p-6 border border-dark-border items-center">
          
          <View 
            className={`w-24 h-24 rounded-full items-center justify-center mb-6`}
            style={{ backgroundColor: `${config.color}20` }}
          >
            {status === 'LOADING' ? (
              <ActivityIndicator size="large" color={config.color} />
            ) : (
              <Ionicons name={config.icon as any} size={64} color={config.color} />
            )}
          </View>

          <Text className="text-2xl font-bold text-white mb-3 text-center">
            {config.title}
          </Text>
          
          <Text className="text-dark-muted text-center mb-8 px-4 leading-relaxed">
            {config.desc}
          </Text>

          {status !== 'LOADING' && (
            <Button
              title="Back to Home"
              onPress={onDismiss}
              className="w-full"
              variant="outline"
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
