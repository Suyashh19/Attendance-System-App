import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSubjectEnrollments, updateEnrollmentStatus } from '../services/attendance';
import { Button } from './Button';

interface PendingApprovalsModalProps {
 visible: boolean;
 subjectId: number | null;
 onClose: () => void;
}

export function PendingApprovalsModal({ visible, subjectId, onClose }: PendingApprovalsModalProps) {
 const queryClient = useQueryClient();

 // Fetch all enrollments for this subject
 const { data: students = [], isLoading, refetch } = useQuery({
 queryKey: ['enrollments', subjectId],
 queryFn: () => getSubjectEnrollments(subjectId!),
 enabled: !!subjectId && visible,
 });

 const pendingStudents = students.filter((s: any) => s.status === 'PENDING');

 const { mutate: updateStatus, isPending: isUpdating } = useMutation({
 mutationFn: ({ studentId, status }: { studentId: number; status: 'APPROVED' | 'REJECTED' }) =>
 updateEnrollmentStatus(subjectId!, studentId, status),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['enrollments', subjectId] });
 queryClient.invalidateQueries({ queryKey: ['subjects'] });
 },
 });

 if (!visible) return null;

 return (
 <Modal visible={visible} animationType="slide" transparent>
 <View style={styles.overlay}>
 <View style={styles.container}>
 <View style={styles.header}>
 <Text style={styles.title}>Pending Requests</Text>
 <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
 <Ionicons name="close" size={24} color="#9CA3AF" />
 </TouchableOpacity>
 </View>

 {isLoading ? (
 <ActivityIndicator size="large" color="#6366F1" style={{ marginVertical: 32 }} />
 ) : pendingStudents.length === 0 ? (
 <View style={styles.emptyContainer}>
 <Ionicons name="checkmark-circle-outline" size={48} color="#059669" />
 <Text style={styles.emptyText}>All caught up! No pending requests.</Text>
 </View>
 ) : (
 <FlatList
 data={pendingStudents}
 keyExtractor={(item) => String(item.id)}
 style={styles.list}
 renderItem={({ item }) => (
 <View style={styles.card}>
 <View style={{ flex: 1 }}>
 <Text style={styles.studentName}>{item.name}</Text>
 <Text style={styles.studentInfo}>{item.prn || item.email}</Text>
 </View>
 <View style={{ flexDirection: 'row', gap: 8 }}>
 <TouchableOpacity
 onPress={() => updateStatus({ studentId: item.id, status: 'REJECTED' })}
 style={[styles.actionBtn, styles.rejectBtn]}
 disabled={isUpdating}
 >
 <Ionicons name="close" size={20} color="#1A1D1F" />
 </TouchableOpacity>
 <TouchableOpacity
 onPress={() => updateStatus({ studentId: item.id, status: 'APPROVED' })}
 style={[styles.actionBtn, styles.approveBtn]}
 disabled={isUpdating}
 >
 <Ionicons name="checkmark" size={20} color="#059669" />
 </TouchableOpacity>
 </View>
 </View>
 )}
 />
 )}
 </View>
 </View>
 </Modal>
 );
}

const styles = StyleSheet.create({
 overlay: {
 flex: 1,
 backgroundColor: 'rgba(0, 0, 0, 0.05)',
 justifyContent: 'center',
 padding: 24,
 },
 container: {
 backgroundColor: '#FFFFFF',
 borderRadius: 24,
 padding: 24,
 borderWidth: 1,
 borderColor: '#E5EAF2',
 maxHeight: '80%',
 },
 header: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 alignItems: 'center',
 marginBottom: 24,
 },
 title: {
 color: '#1A1D1F',
 fontSize: 20,
 fontWeight: 'bold',
 },
 closeBtn: {
 padding: 4,
 },
 emptyContainer: {
 alignItems: 'center',
 padding: 32,
 },
 emptyText: {
 color: '#9CA3AF',
 marginTop: 16,
 textAlign: 'center',
 },
 list: {
 maxHeight: 400,
 },
 card: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 backgroundColor: '#F7F9FC',
 borderWidth: 1,
 borderColor: '#E5EAF2',
 padding: 16,
 borderRadius: 16,
 marginBottom: 12,
 },
 studentName: {
 color: '#1A1D1F',
 fontSize: 16,
 fontWeight: '600',
 },
 studentInfo: {
 color: '#6B7280',
 fontSize: 14,
 marginTop: 4,
 },
 actionBtn: {
 padding: 10,
 borderRadius: 12,
 borderWidth: 1,
 },
 rejectBtn: {
 backgroundColor: '#FFFFFF',
 borderColor: '#E5EAF2',
 },
 approveBtn: {
 backgroundColor: '#ECFDF5',
 borderColor: 'rgba(5, 150, 105, 0.2)',
 },
});
