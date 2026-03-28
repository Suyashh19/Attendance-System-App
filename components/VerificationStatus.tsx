import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { VerificationState } from '../types';

interface VerificationStatusProps {
  state: VerificationState;
}

export function VerificationStatus({ state }: VerificationStatusProps) {
  const items = [
    { key: 'deviceMatched', label: 'Device ID', icon: 'phone-portrait-outline' as const, color: '#F43F5E' },
    { key: 'locationVerified', label: 'Local GPS', icon: 'location-outline' as const, color: '#0EA5E9' },
  ];

  return (
    <View className="bg-dark-card rounded-2xl p-4 w-full border border-dark-border">
      <Text className="text-white font-bold text-lg mb-4 ml-1">Verification Status</Text>
      
      <View className="flex-row flex-wrap justify-between">
        {items.map(({ key, label, icon }) => {
          // Status: null = loading/unknown, true = success, false = fail
          const status = state[key as keyof VerificationState];
          
          let color = '#64748B'; // muted
          let StatusIcon = () => <ActivityIndicator size="small" color={color} />;
          
          if (status === true) {
            color = '#10B981'; // success
            StatusIcon = () => <Ionicons name="checkmark-circle" size={20} color={color} />;
          } else if (status === false) {
            color = '#EF4444'; // danger
            StatusIcon = () => <Ionicons name="close-circle" size={20} color={color} />;
          } else {
            // null
            StatusIcon = () => <Ionicons name="ellipse-outline" size={20} color={color} />;
          }

          return (
            <View key={key} className="w-[48%] mb-4 flex-row items-center p-2 rounded-xl bg-[#0F172A] border border-dark-border/50">
              <View 
                className="p-2 rounded-full mr-3 border"
                style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}
              >
                <Ionicons name={icon} size={18} color={color} />
              </View>
              <View className="flex-1">
                <Text className="text-dark-muted text-xs font-medium mb-1">{label}</Text>
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
