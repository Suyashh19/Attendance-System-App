import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSessionDetails, editAttendanceRecord } from '../services/attendance';
import { Ionicons } from '@expo/vector-icons';

export default function LectureDetailScreen() {
 const { id } = useLocalSearchParams();
 const router = useRouter();
 const queryClient = useQueryClient();
 const insets = useSafeAreaInsets();
 const sessionId = Number(id);

 const { data, isLoading, isError, refetch } = useQuery({
 queryKey: ['session-details', sessionId],
 queryFn: () => getSessionDetails(sessionId),
 enabled: !!sessionId,
 });

 const editMutation = useMutation({
 mutationFn: ({ studentId, status }: { studentId: number, status: string }) => 
 editAttendanceRecord(sessionId, studentId, status),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['session-details', sessionId] });
 queryClient.invalidateQueries({ queryKey: ['recent-sessions'] });
 },
 onError: (err: any) => {
 Alert.alert('Error', err.response?.data?.error || 'Failed to update attendance');
 }
 });

 const toggleStatus = (studentId: number, currentStatus: string) => {
 const newStatus = currentStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT';
 editMutation.mutate({ studentId, status: newStatus });
 };

 if (isLoading) {
 return (
 <View className="flex-1 bg-light items-center justify-center">
 <ActivityIndicator size="large" color="#6366F1" />
 </View>
 );
 }

 if (isError || !data) {
 return (
 <View className="flex-1 bg-light items-center justify-center p-6">
 <Ionicons name="alert-circle-outline" size={64} color="#1A1D1F" className="mb-4" />
 <Text className="text-light-text text-xl font-bold mb-2">Failed to load details</Text>
 <TouchableOpacity onPress={() => router.back()} className="bg-primary px-6 py-3 rounded-2xl">
 <Text className="text-light-text font-bold">Go Back</Text>
 </TouchableOpacity>
 </View>
 );
 }

 const { session, students } = data;

 return (
 <View className="flex-1 bg-[#F7F9FC]" style={{ paddingTop: Math.max(insets.top, 45) }}>
 <View className="flex-1 px-4">
 {/* Header Section */}
 <View className="py-2 flex-row items-center">
 <TouchableOpacity 
 onPress={() => router.back()}
 className="w-10 h-10 bg-[#FFFFFF] shadow-sm border border-[#E5EAF2] rounded-full items-center justify-center mr-4"
 >
 <Ionicons name="arrow-back" size={20} color="#1A1D1F" />
 </TouchableOpacity>
 <View className="flex-1">
 <Text className="text-light-text text-2xl font-black" numberOfLines={1}>{session.subjectName}</Text>
 <Text className="text-light-muted font-medium">
 {new Date(session.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
 </Text>
 </View>
 </View>

 {/* Stats Card */}
 <View className="bg-light-card shadow-sm border border-light-border p-5 rounded-3xl mb-6 flex-row justify-between items-center ">
 <View>
 <Text className="text-light-muted font-bold text-xs uppercase tracking-widest mb-1">Attendance Rate</Text>
 <Text className="text-light-text text-3xl font-black">
 {Math.round((students.filter(s => s.status === 'PRESENT').length / students.length) * 100)}%
 </Text>
 </View>
 <View className="items-end">
 <Text className="text-success text-2xl font-black">
 {students.filter(s => s.status === 'PRESENT').length}
 <Text className="text-light-muted text-base"> / {students.length}</Text>
 </Text>
 <Text className="text-light-muted text-xs font-bold">STUDENTS PRESENT</Text>
 </View>
 </View>

 <Text className="text-light-text font-bold text-lg mb-4">Student List</Text>

 <FlatList
 data={students}
 keyExtractor={(item) => String(item.id)}
 contentContainerStyle={{ paddingBottom: 40 }}
 renderItem={({ item }) => (
 <View className="bg-light-card shadow-sm border border-light-border p-4 rounded-2xl mb-3 flex-row justify-between items-center">
 <View className="flex-1">
 <Text className="text-light-text font-bold text-base" numberOfLines={1}>{item.name}</Text>
 <View className="flex-row items-center mt-1">
 {item.rollNo && (
 <View className="bg-light px-2 py-0.5 rounded-md mr-2">
 <Text className="text-light-muted text-[10px] font-bold">Roll: {item.rollNo}</Text>
 </View>
 )}
 {item.prn && (
 <Text className="text-light-muted text-[10px]">PRN: {item.prn}</Text>
 )}
 </View>
 </View>

 <TouchableOpacity 
 onPress={() => toggleStatus(item.id, item.status)}
 disabled={editMutation.isPending}
 className={`px-4 py-2 rounded-xl border ${
 item.status === 'PRESENT' 
 ? 'bg-[#ECFDF5] border-[#059669]/30' 
 : 'bg-[#F7F9FC] border-[#E5EAF2]'
 }`}
 >
 <Text className={`font-black text-xs ${
 item.status === 'PRESENT' ? 'text-[#059669]' : 'text-[#6B7280]'
 }`}>
 {item.status}
 </Text>
 </TouchableOpacity>
 </View>
 )}
 ListEmptyComponent={
 <View className="items-center justify-center p-10">
 <Text className="text-light-muted text-center">No students enrolled in this subject.</Text>
 </View>
 }
 />
 </View>
 </View>
 );
}
