import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { CountdownTimer } from './CountdownTimer';

interface FacultySessionModalProps {
  visible: boolean;
  subjectName: string;
  correctCode: string;
  onEndSession: () => void;
}

export function FacultySessionModal({ 
  visible, 
  subjectName, 
  correctCode, 
  onEndSession 
}: FacultySessionModalProps) {
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    if (visible) {
      setTimeLeft(15);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{subjectName}</Text>
            <View style={styles.badge}>
              <View style={styles.dot} />
              <Text style={styles.badgeText}>LIVE SESSION</Text>
            </View>
          </View>

          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Student Verification Code</Text>
            <Text style={styles.codeText}>{correctCode}</Text>
          </View>

          <View style={styles.timerContainer}>
            <CountdownTimer 
              duration={15} 
              size={120} 
              strokeWidth={8}
              onComplete={() => {}} 
            />
            <Text style={styles.timerSubtext}>Remaining time for submissions</Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.infoText}>
              Show this code to your students. They have 15 seconds to select it on their devices.
            </Text>
            <Button 
              title="End Attendance Session" 
              onPress={onEndSession} 
              variant="danger"
              className="mt-4"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#1E293B',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6366F1',
    marginRight: 6,
  },
  badgeText: {
    color: '#6366F1',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  codeContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
  },
  codeLabel: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 8,
  },
  codeText: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: 8,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timerSubtext: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 12,
  },
  footer: {
    alignItems: 'center',
  },
  infoText: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
});
