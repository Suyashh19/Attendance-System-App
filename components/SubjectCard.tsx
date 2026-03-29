import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Subject } from '../types';
import { useAuthStore } from '../store/authStore';

interface SubjectCardProps {
  subject: Subject;
  sessionActive?: boolean;
  onStartSession?: () => void;
  onDelete?: () => void;
  onUnenroll?: () => void;
}

export function SubjectCard({ subject, sessionActive = false, onStartSession, onDelete, onUnenroll }: SubjectCardProps) {
  const user = useAuthStore((s) => s.user);
  const isFaculty = user?.role === 'faculty';

  return (
    <View className="bg-dark-card rounded-2xl p-4 mb-4 border border-dark-border shadow-sm flex-row items-center">
      <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center mr-4">
        <Text className="text-primary font-bold text-lg">
          {subject.code.substring(0, 2).toUpperCase()}
        </Text>
      </View>
      
      <View className="flex-1">
        <Text className="text-white font-bold text-lg mb-1">{subject.name}</Text>
        <Text className="text-dark-muted text-sm font-medium">{subject.code}</Text>
      </View>

      <View className="flex-row items-center ml-2">
        <View className="items-end mr-3">
          {sessionActive ? (
            <View className="bg-success/20 px-3 py-1 rounded-full flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse" />
              <Text className="text-success text-xs font-bold">LIVE</Text>
            </View>
          ) : isFaculty ? (
            <TouchableOpacity 
              onPress={onStartSession}
              className="bg-primary px-3 py-2 rounded-xl flex-row items-center"
            >
              <Ionicons name="play" size={14} color="white" className="mr-1" />
              <Text className="text-white text-xs font-bold">START</Text>
            </TouchableOpacity>
          ) : (
            <View className="bg-dark-border px-3 py-1 rounded-full">
              <Text className="text-dark-muted text-xs font-bold">OFFLINE</Text>
            </View>
          )}
        </View>

        {isFaculty ? (
          <TouchableOpacity 
            onPress={onDelete}
            className="bg-danger/10 p-2 rounded-xl border border-danger/20"
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            onPress={onUnenroll}
            className="bg-danger/10 p-2 rounded-xl border border-danger/20"
          >
            <Ionicons name="exit-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
