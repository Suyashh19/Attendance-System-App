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
      editAttendanceRecord(sessionId!, studentId, status, "Manually updated by faculty"),
    onSuccess: (data, variables) => {
      setAttendances(prev => prev.map(a =>
        a.studentId === variables.studentId ? { ...a, status: variables.status, editedByFaculty: true } : a
      ));
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return '#10B981';
      case 'ABSENT': return '#EF4444';
      default: return '#F59E0B';
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
              <Ionicons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{presentCount}</Text>
              <Text style={styles.statLabel}>PRESENT</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>{absentCount}</Text>
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
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{item.student.name}</Text>
                  <Text style={styles.studentInfo}>{item.student.prn || item.student.rollNo || item.student.id}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => editStatus({ studentId: item.studentId, status: getNextStatus(item.status) })}
                  disabled={isPending}
                  style={[styles.statusPill, { backgroundColor: getStatusColor(item.status) + '20', borderColor: getStatusColor(item.status) + '40' }]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {item.status}
                  </Text>
                  {item.editedByFaculty && (
                    <Ionicons name="pencil" size={10} color={getStatusColor(item.status)} style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#F8FAFC',
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
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    color: '#10B981',
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 1,
  },
  instructionBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  instructionText: {
    color: '#818CF8',
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
    borderBottomColor: '#334155',
  },
  studentName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  studentInfo: {
    color: '#64748B',
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
