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
 onManagePending?: () => void;
 onUnenroll?: () => void;
}

export function SubjectCard({ subject, sessionActive = false, onStartSession, onDelete, onManagePending, onUnenroll }: SubjectCardProps) {
 const user = useAuthStore((s) => s.user);
 const isFaculty = user?.role === 'faculty';

 return (
 <View className="bg-light-card shadow-sm rounded-2xl p-4 mb-4 border border-light-border flex-row items-center">
 <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center mr-4">
 <Text className="text-primary font-bold text-lg">
 {subject.code.substring(0, 2).toUpperCase()}
 </Text>
 </View>

 <View className="flex-1">
 <Text className="text-light-text font-bold text-lg mb-1">{subject.name}</Text>
 <Text className="text-light-muted text-sm font-medium">{subject.code}</Text>
 </View>

 <View className="flex-row items-center ml-2">
 <View className="items-end mr-3">
 {sessionActive ? (
 <View className="bg-[#ECFDF5] px-3 py-1 rounded-full flex-row items-center">
 <View className="w-2 h-2 rounded-full bg-[#059669] mr-2 animate-pulse" />
 <Text className="text-[#059669] text-xs font-bold">LIVE</Text>
 </View>
 ) : isFaculty ? (
 <TouchableOpacity
 onPress={onStartSession}
 className="bg-[#EEF2FF] px-3 py-2 rounded-xl border border-[#6366F1]/20 flex-row items-center"
 >
 <Ionicons name="play" size={14} color="#6366F1" className="mr-1" />
 <Text className="text-[#6366F1] text-xs font-bold">START</Text>
 </TouchableOpacity>
 ) : !isFaculty && subject.enrollmentStatus && subject.enrollmentStatus !== 'APPROVED' ? (
 <View className={`px-3 py-1 rounded-full ${subject.enrollmentStatus === 'PENDING' ? 'bg-[#F7F9FC]' : 'bg-[#F7F9FC]'}`}>
 <Text className={`text-xs font-bold ${subject.enrollmentStatus === 'PENDING' ? 'text-[#6B7280]' : 'text-[#6B7280]'}`}>
 {subject.enrollmentStatus}
 </Text>
 </View>
 ) : (
 <View className="bg-[#F7F9FC] border border-[#E5EAF2] px-3 py-1 rounded-full">
 <Text className="text-light-muted text-xs font-bold">OFFLINE</Text>
 </View>
 )}
 </View>

 {isFaculty ? (
 <View className="flex-row items-center">
 <TouchableOpacity
 onPress={onManagePending}
 className="bg-[#F7F9FC] p-2 rounded-xl border border-[#E5EAF2] mr-2"
 >
 <Ionicons name="people-outline" size={18} color="#6B7280" />
 </TouchableOpacity>
 <TouchableOpacity
 onPress={onDelete}
 className="bg-[#F7F9FC] p-2 rounded-xl border border-[#E5EAF2]"
 >
 <Ionicons name="trash-outline" size={18} color="#1A1D1F" />
 </TouchableOpacity>
 </View>
 ) : (
 <TouchableOpacity
 onPress={onUnenroll}
 className="bg-[#F7F9FC] p-2 rounded-xl border border-[#E5EAF2]"
 >
 <Ionicons name="exit-outline" size={18} color="#1A1D1F" />
 </TouchableOpacity>
 )}
 </View>
 </View>
 );
}
