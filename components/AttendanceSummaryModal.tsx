import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { editAttendanceRecord } from '../services/attendance';

interface AttendanceSummaryModalProps {
 visible: boolean;
 sessionId: number | null;
 attendances: any[];
 onClose: () => void;
}

export function AttendanceSummaryModal({ visible, sessionId, attendances: initialAttendances, onClose }: AttendanceSummaryModalProps) {
 const [attendances, setAttendances] = useState(initialAttendances);

 // Sync internal state if props change when opening
 React.useEffect(() => {
 if (visible) {
 setAttendances(initialAttendances);
 }
 }, [visible, initialAttendances]);

 const { mutate: editStatus, isPending } = useMutation({
 mutationFn: ({ studentId, status }: { studentId: number; status: string }) =>
 editAttendanceRecord(sessionId!, studentId, status,"Manually updated by faculty"),
 onSuccess: (data, variables) => {
 setAttendances(prev => prev.map(a =>
 a.studentId === variables.studentId ? { ...a, status: variables.status, editedByFaculty: true } : a
 ));
 },
 });

 const getStatusStyle = (status: string) => {
 switch (status) {
 case 'PRESENT': return { bg: '#ECFDF5', text: '#059669' };
 case 'ABSENT': return { bg: '#F7F9FC', text: '#1A1D1F' };
 default: return { bg: '#F7F9FC', text: '#6B7280' };
 }
 };

 const getNextStatus = (currentStatus: string) => {
 if (currentStatus === 'PRESENT') return 'ABSENT';
 if (currentStatus === 'ABSENT') return 'PRESENT';
 return 'PRESENT'; // default fallback for INVALID
 };

 if (!visible) return null;

 const presentCount = attendances.filter(a => a.status === 'PRESENT').length;
 const absentCount = attendances.filter(a => a.status === 'ABSENT').length;

 return (
 <Modal visible={visible} animationType="slide" transparent>
 <View style={styles.overlay}>
 <View style={styles.container}>
 <View style={styles.header}>
 <Text style={styles.title}>Lecture Summary</Text>
 <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
 <Ionicons name="close" size={24} color="#6B7280" />
 </TouchableOpacity>
 </View>

 <View style={styles.statsRow}>
 <View style={styles.statBox}>
 <Text style={styles.statValue}>{presentCount}</Text>
 <Text style={styles.statLabel}>PRESENT</Text>
 </View>
 <View style={styles.statBox}>
 <Text style={[styles.statValue, { color: '#1A1D1F' }]}>{absentCount}</Text>
 <Text style={styles.statLabel}>ABSENT</Text>
 </View>
 </View>

 <View style={styles.instructionBox}>
 <Text style={styles.instructionText}>
 Tap the status pill next to any student to toggle their attendance before closing.
 </Text>
 </View>

 <FlatList
 data={attendances}
 keyExtractor={item => String(item.studentId)}
 style={styles.list}
 renderItem={({ item }) => {
 const statusStyle = getStatusStyle(item.status);
 return (
 <View style={styles.card}>
 <View style={{ flex: 1 }}>
 <Text style={styles.studentName}>{item.student.name}</Text>
 <Text style={styles.studentInfo}>{item.student.prn || item.student.rollNo || item.student.id}</Text>
 </View>
 <TouchableOpacity
 onPress={() => editStatus({ studentId: item.studentId, status: getNextStatus(item.status) })}
 disabled={isPending}
 style={[styles.statusPill, { backgroundColor: statusStyle.bg, borderColor: statusStyle.text + '40' }]}
 >
 <Text style={[styles.statusText, { color: statusStyle.text }]}>
 {item.status}
 </Text>
 {item.editedByFaculty && (
 <Ionicons name="pencil" size={10} color={statusStyle.text} style={{ marginLeft: 4 }} />
 )}
 </TouchableOpacity>
 </View>
 );
 }}
 />
 </View>
 </View>
 </Modal>
 );
}

const styles = StyleSheet.create({
 overlay: {
 flex: 1,
 backgroundColor: 'rgba(0,0,0,0.4)',
 justifyContent: 'flex-end',
 },
 container: {
 backgroundColor: '#FFFFFF',
 borderTopLeftRadius: 32,
 borderTopRightRadius: 32,
 padding: 24,
 borderWidth: 1,
 borderColor: '#E5EAF2',
 maxHeight: '90%',
 minHeight: '60%',
 // Soft shadow
 shadowColor: "#000",
 shadowOffset: { width: 0, height: -4 },
 shadowOpacity: 0.05,
 shadowRadius: 20,
 elevation: 10,
 },
 header: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 alignItems: 'center',
 marginBottom: 24,
 },
 title: {
 color: '#1A1D1F',
 fontSize: 22,
 fontWeight: 'bold',
 },
 closeBtn: {
 padding: 4,
 },
 statsRow: {
 flexDirection: 'row',
 gap: 16,
 marginBottom: 20,
 },
 statBox: {
 flex: 1,
 backgroundColor: 'rgba(0,0,0,0.02)',
 borderRadius: 16,
 padding: 16,
 alignItems: 'center',
 borderWidth: 1,
 borderColor: '#E5EAF2',
 },
 statValue: {
 color: '#059669',
 fontSize: 24,
 fontWeight: '900',
 },
 statLabel: {
 color: '#6B7280',
 fontSize: 12,
 marginTop: 4,
 letterSpacing: 1,
 },
 instructionBox: {
 backgroundColor: '#EEF2FF',
 borderRadius: 12,
 padding: 12,
 marginBottom: 16,
 },
 instructionText: {
 color: '#6366F1',
 fontSize: 13,
 textAlign: 'center',
 },
 list: {
 flex: 1,
 },
 card: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 paddingVertical: 12,
 borderBottomWidth: 1,
 borderBottomColor: '#E5EAF2',
 },
 studentName: {
 color: '#1A1D1F',
 fontSize: 16,
 fontWeight: '600',
 },
 studentInfo: {
 color: '#6B7280',
 fontSize: 13,
 marginTop: 2,
 },
 statusPill: {
 flexDirection: 'row',
 alignItems: 'center',
 paddingHorizontal: 16,
 paddingVertical: 8,
 borderRadius: 99,
 borderWidth: 1,
 },
 statusText: {
 fontSize: 12,
 fontWeight: 'bold',
 letterSpacing: 0.5,
 },
});
