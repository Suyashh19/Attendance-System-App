import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import type { Subject } from '../types';

interface ExportFilterModalProps {
 visible: boolean;
 onClose: () => void;
 subjects: Subject[];
 initialSubjectId?: number;
 onConfirm: (filters: { 
 subjectId: number; 
 startDate?: string; 
 endDate?: string; 
 sessionIds?: number[] 
 }) => void;
 loading?: boolean;
}

export function ExportFilterModal({ visible, onClose, subjects, initialSubjectId, onConfirm, loading }: ExportFilterModalProps) {
 const [selectedSubject, setSelectedSubject] = useState<Subject | null>(() => {
 if (initialSubjectId) {
 return subjects.find(s => s.id === initialSubjectId) || (subjects.length > 0 ? subjects[0] : null);
 }
 return subjects.length > 0 ? subjects[0] : null;
 });
 const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // last 30 days
 const [endDate, setEndDate] = useState(new Date());
 const [showStartPicker, setShowStartPicker] = useState(false);
 const [showEndPicker, setShowEndPicker] = useState(false);

 const handleConfirm = () => {
 if (!selectedSubject) {
 Alert.alert('No Subject Selected', 'Please select a subject to export data for.');
 return;
 }
 onConfirm({
 subjectId: Number(selectedSubject.id),
 startDate: startDate.toISOString(),
 endDate: endDate.toISOString(),
 });
 };

 return (
 <Modal visible={visible} animationType="slide" transparent>
 <View className="flex-1 bg-black/60 justify-end">
 <View className="bg-light-card shadow-sm rounded-t-3xl p-6 border-t border-light-border min-h-[60%]">
 
 <View className="flex-row justify-between items-center mb-6">
 <Text className="text-xl font-bold text-light-text">Export Attendance</Text>
 <TouchableOpacity onPress={onClose} className="p-1">
 <Ionicons name="close" size={24} color="#6B7280" />
 </TouchableOpacity>
 </View>

 <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
 
 {/* Subject Selection */}
 <Text className="text-light-muted font-bold text-xs tracking-wider mb-3">SELECT SUBJECT</Text>
 <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-6">
 {subjects.map(s => (
 <TouchableOpacity 
 key={s.id} 
 onPress={() => setSelectedSubject(s)}
 className="mr-3 px-4 py-2 rounded-xl border"
 style={{ 
 backgroundColor: selectedSubject?.id === s.id ? 'rgba(99, 102, 241, 0.2)' : '#F7F9FC',
 borderColor: selectedSubject?.id === s.id ? '#6366F1' : '#E5EAF2'
 }}
 >
 <Text 
 className="font-bold" 
 style={{ color: selectedSubject?.id === s.id ? '#6366F1' : '#FFFFFF' }}
 >
 {s.code}
 </Text>
 </TouchableOpacity>
 ))}
 </ScrollView>

 {/* Date Filters */}
 <Text className="text-light-muted font-bold text-xs tracking-wider mb-3">DATE RANGE</Text>
 <View className="flex-row justify-between mb-8">
 
 <TouchableOpacity 
 onPress={() => setShowStartPicker(true)}
 className="w-[48%] bg-light p-4 rounded-xl border border-light-border"
 >
 <Text className="text-light-muted text-[10px] font-bold mb-1">FROM</Text>
 <Text className="text-light-text font-bold">{startDate.toLocaleDateString()}</Text>
 </TouchableOpacity>

 <TouchableOpacity 
 onPress={() => setShowEndPicker(true)}
 className="w-[48%] bg-light p-4 rounded-xl border border-light-border"
 >
 <Text className="text-light-muted text-[10px] font-bold mb-1">TO</Text>
 <Text className="text-light-text font-bold">{endDate.toLocaleDateString()}</Text>
 </TouchableOpacity>
 </View>

 {showStartPicker && (
 <DateTimePicker
 value={startDate}
 mode="date"
 display={Platform.OS === 'ios' ? 'spinner' : 'default'}
 onChange={(event, date) => {
 setShowStartPicker(false);
 if (date) setStartDate(date);
 }}
 />
 )}

 {showEndPicker && (
 <DateTimePicker
 value={endDate}
 mode="date"
 display={Platform.OS === 'ios' ? 'spinner' : 'default'}
 onChange={(event, date) => {
 setShowEndPicker(false);
 if (date) setEndDate(date);
 }}
 />
 )}

 <View className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-8">
 <View className="flex-row items-center mb-2">
 <Ionicons name="information-circle" size={18} color="#6366F1" className="mr-2" />
 <Text className="text-primary font-bold text-sm">Matrix Export Information</Text>
 </View>
 <Text className="text-light-muted text-xs leading-relaxed">
 The exported file will contain accurate PRN, Name, and Email mapping with lecture-wise statuses (Present/Absent/Invalid).
 </Text>
 </View>

 </ScrollView>

 <Button 
 title="Download Excel" 
 onPress={handleConfirm} 
 loading={loading}
 className="mt-4"
 />
 <View className="h-4" />
 </View>
 </View>
 </Modal>
 );
}
