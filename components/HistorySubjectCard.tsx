import React, { useState } from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SubjectHistory, HistoryRecord } from '../types';
import { Button } from './Button';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
 UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HistorySubjectCardProps {
 subject: SubjectHistory;
 onDelete: (id: number) => void;
}

export function HistorySubjectCard({ subject, onDelete }: HistorySubjectCardProps) {
 const [expanded, setExpanded] = useState(false);

 const toggleExpand = () => {
 LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
 setExpanded(!expanded);
 };

 const formatDate = (dateString: string) => {
 try {
 const date = new Date(dateString);
 return new Intl.DateTimeFormat('en-GB', {
 day: '2-digit',
 month: 'short',
 year: 'numeric',
 }).format(date);
 } catch {
 return 'Invalid Date';
 }
 };

 const formatTime = (dateString: string) => {
 try {
 const date = new Date(dateString);
 return new Intl.DateTimeFormat('en-US', {
 hour: '2-digit',
 minute: '2-digit',
 hour12: true,
 }).format(date);
 } catch {
 return '--:--';
 }
 };

 const getStatusColor = (status: HistoryRecord['status']) => {
 switch (status) {
 case 'PRESENT': return 'text-success';
 case 'ABSENT': return 'text-danger';
 case 'INVALID': return 'text-amber-500';
 default: return 'text-light-muted';
 }
 };

 const getStatusBg = (status: HistoryRecord['status']) => {
 switch (status) {
 case 'PRESENT': return 'bg-success/10';
 case 'ABSENT': return 'bg-danger/10';
 case 'INVALID': return 'bg-amber-500/10';
 default: return 'bg-light-card shadow-sm';
 }
 };

 const percentage = subject.stats.total > 0 
 ? Math.round((subject.stats.PRESENT / subject.stats.total) * 100) 
 : 0;

 return (
 <View className="mb-4 bg-light-card shadow-sm rounded-3xl border border-light-border overflow-hidden ">
 {/* Header / Subject Summary */}
 <TouchableOpacity 
 activeOpacity={0.7} 
 onPress={toggleExpand}
 className="p-5 flex-row items-center justify-between"
 >
 <View className="flex-1">
 <View className="flex-row items-center mb-1">
 <View className="bg-primary/20 p-1.5 rounded-lg mr-3">
 <Ionicons name="library" size={16} color="#6366F1" />
 </View>
 <Text className="text-light-text font-bold text-lg flex-1" numberOfLines={1}>
 {subject.name}
 </Text>
 </View>
 <View className="flex-row items-center">
 <Text className="text-light-muted text-xs font-bold tracking-widest mr-3">
 {subject.code}
 </Text>
 <Text className={`text-xs font-black mr-3 ${percentage >= 75 ? 'text-success' : 'text-amber-500'}`}>
 {percentage}% ATTENDANCE
 </Text>
 <View className={`px-2 py-0.5 rounded-md ${subject.type === 'theory' ? 'bg-primary/20' : 'bg-success/20'}`}>
 <Text className={`text-[8px] font-black uppercase ${subject.type === 'theory' ? 'text-primary' : 'text-success'}`}>
 {subject.type}
 </Text>
 </View>
 </View>
 </View>

 <View className="flex-row items-center">
 <View className="items-end mr-4">
 <Text className="text-light-text font-black text-xl">{subject.stats.PRESENT}/{subject.stats.total}</Text>
 <Text className="text-light-muted text-[10px] font-bold uppercase tracking-tighter">Sessions</Text>
 </View>
 <Ionicons 
 name={expanded ?"chevron-up" :"chevron-down"} 
 size={20} 
 color="#6B7280" 
 />
 </View>
 </TouchableOpacity>

 {/* Expanded Content */}
 {expanded && (
 <View className="px-5 pb-5 border-t border-light-border/50 pt-4">
 
 <View className="mb-4">
 {subject.records.map((record, index) => (
 <View 
 key={record.id || index} 
 className={`flex-row items-center justify-between py-3 ${index !== subject.records.length - 1 ? 'border-b border-light-border/30' : ''}`}
 >
 <View className="flex-row items-center">
 <View className={`w-2 h-2 rounded-full mr-3 ${record.status === 'PRESENT' ? 'bg-success' : record.status === 'ABSENT' ? 'bg-danger' : 'bg-amber-500'}`} />
 <View>
 <Text className="text-light-text font-bold text-sm">{formatDate(record.date)}</Text>
 <Text className="text-light-muted text-xs">{formatTime(record.date)}</Text>
 </View>
 </View>

 <View className={`px-3 py-1 rounded-full border ${getStatusBg(record.status)} border-transparent`}>
 <Text className={`text-[10px] font-black uppercase tracking-widest ${getStatusColor(record.status)}`}>
 {record.status}
 </Text>
 </View>
 </View>
 ))}
 </View>

 <Button 
 title="Delete Subject History" 
 variant="outline" 
 size="sm" 
 icon="trash-outline"
 className="border-danger/30"
 onPress={() => onDelete(subject.id)}
 />
 </View>
 )}
 </View>
 );
}
