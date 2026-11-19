import React, { useState, useEffect } from 'react';
import { View, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboardingStore } from '../../store/onboardingStore';
import { colors, shadow } from '../../constants/theme';
import { Text } from '../Text';
import { UnoAvatar } from './UnoAvatar';

interface DemoStudent {
  id: string;
  name: string;
  prn: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
}

const INITIAL_DEMO_STUDENTS: DemoStudent[] = [
  { id: '1', name: 'Aarav Sharma', prn: '202401', status: 'PRESENT' },
  { id: '2', name: 'Ananya Patil', prn: '202402', status: 'PRESENT' },
  { id: '3', name: 'Rohan Kulkarni', prn: '202403', status: 'EXCUSED' },
  { id: '4', name: 'Siddharth Verma', prn: '202404', status: 'ABSENT' },
  { id: '5', name: 'Pooja Deshmukh', prn: '202405', status: 'PRESENT' },
];

export function UnoDemoModal() {
  const insets = useSafeAreaInsets();
  const isDemoSessionActive = useOnboardingStore((s) => s.isDemoSessionActive);
  const closeDemoSession = useOnboardingStore((s) => s.closeDemoSession);
  const advanceActionStep = useOnboardingStore((s) => s.advanceActionStep);
  const isTourActive = useOnboardingStore((s) => s.isActive);

  const [secondsLeft, setSecondsLeft] = useState(15);
  const [isRunning, setIsRunning] = useState(true);
  const [students, setStudents] = useState<DemoStudent[]>(INITIAL_DEMO_STUDENTS);

  const handleFinishDemo = () => {
    closeDemoSession();
    if (isTourActive) {
      advanceActionStep('home_start_attendance');
    }
  };

  // Simulated live countdown
  useEffect(() => {
    if (!isDemoSessionActive) {
      setSecondsLeft(15);
      setIsRunning(true);
      return;
    }

    if (secondsLeft <= 0) {
      setIsRunning(false);
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isDemoSessionActive, secondsLeft]);

  if (!isDemoSessionActive) return null;

  const presentCount = students.filter((s) => s.status === 'PRESENT').length;
  const totalStudents = students.length;

  const toggleStudentStatus = (id: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const nextStatus = s.status === 'PRESENT' ? 'ABSENT' : s.status === 'ABSENT' ? 'EXCUSED' : 'PRESENT';
        return { ...s, status: nextStatus };
      })
    );
  };

  const restartDemo = () => {
    setSecondsLeft(15);
    setIsRunning(true);
    setStudents(INITIAL_DEMO_STUDENTS);
  };

  return (
    <Modal
      transparent
      visible={isDemoSessionActive}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={closeDemoSession}
    >
      <View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(11, 19, 43, 0.85)' }]}
        className="justify-center items-center px-4"
      >
        <View
          style={[shadow.raised, { maxWidth: 440, width: '100%', maxHeight: '90%' }]}
          className="bg-light-card rounded-[32px] p-5 border border-light-border"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-light-border mb-3">
            <View className="flex-row items-center flex-1 mr-2">
              <UnoAvatar size="sm" />
              <View className="ml-2.5 flex-1">
                <Text className="text-light-text font-extrabold text-[16px]" numberOfLines={1}>
                  Live Attendance Demo
                </Text>
                <Text className="text-light-muted text-xs font-semibold">
                  Safe Simulation · Zero Fake Database Records
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleFinishDemo}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={24} color={colors.subtle} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {/* Live 4-Digit Code Card */}
            <View className="bg-primary/10 border border-primary/20 rounded-2xl p-4 items-center mb-4">
              <Text className="text-primary text-xs font-extrabold tracking-widest uppercase mb-1">
                4-Digit Security Code
              </Text>
              <Text className="text-primary font-black text-4xl tracking-[12px] my-1">
                5281
              </Text>
              <Text className="text-light-muted text-[11.5px] font-medium text-center mt-1">
                Announce or display this code on your board. It is never broadcast to student phones over the network.
              </Text>
            </View>

            {/* Countdown & Live Count Status */}
            <View className="flex-row items-center mb-4">
              {/* Countdown Pill */}
              <View className="flex-1 bg-light border border-light-border rounded-2xl p-3 items-center mr-2">
                <View className="flex-row items-center">
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={isRunning ? colors.primary : colors.danger}
                    style={{ marginRight: 6 }}
                  />
                  <Text className={`text-xl font-black ${isRunning ? 'text-primary' : 'text-danger'}`}>
                    {secondsLeft}s
                  </Text>
                </View>
                <Text className="text-light-muted text-[11px] font-semibold mt-0.5">
                  {isRunning ? 'Countdown active' : 'Session expired'}
                </Text>
              </View>

              {/* Present Count Pill */}
              <View className="flex-1 bg-light border border-light-border rounded-2xl p-3 items-center ml-2">
                <View className="flex-row items-center">
                  <Ionicons name="people" size={16} color={colors.success} style={{ marginRight: 6 }} />
                  <Text className="text-success text-xl font-black">
                    {presentCount} / {totalStudents}
                  </Text>
                </View>
                <Text className="text-light-muted text-[11px] font-semibold mt-0.5">Marked present</Text>
              </View>
            </View>

            {/* Anti-Proxy Security Callout */}
            <View className="bg-light rounded-2xl p-3.5 border border-light-border mb-4">
              <View className="flex-row items-center mb-1.5">
                <Ionicons name="shield-checkmark" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text className="text-light-text font-bold text-xs">Anti-Proxy Protection Active</Text>
              </View>
              <Text className="text-light-muted text-[11.5px] leading-[17px] font-medium">
                • 1 phone per student (hardware device lock).{'\n'}
                • Android split-screen & multitasking blocked.{'\n'}
                • Phone call detection proctors submission.{'\n'}
                • Submissions after 15s are strictly rejected.
              </Text>
            </View>

            {/* Interactive Student Roster */}
            <View className="mb-2">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-light-text font-extrabold text-[13px] uppercase tracking-wider">
                  Interactive Roster (Tap to edit)
                </Text>
                <TouchableOpacity onPress={restartDemo} activeOpacity={0.7}>
                  <Text className="text-primary text-xs font-bold">Restart Timer</Text>
                </TouchableOpacity>
              </View>

              {students.map((student) => {
                const statusColor =
                  student.status === 'PRESENT'
                    ? { bg: 'bg-success-bg', text: 'text-success', border: 'border-success/30' }
                    : student.status === 'EXCUSED'
                    ? { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30' }
                    : { bg: 'bg-danger-bg', text: 'text-danger', border: 'border-danger/30' };

                return (
                  <TouchableOpacity
                    key={student.id}
                    onPress={() => toggleStudentStatus(student.id)}
                    activeOpacity={0.8}
                    className="flex-row items-center justify-between bg-light border border-light-border rounded-xl p-2.5 mb-2"
                  >
                    <View className="flex-1 mr-2">
                      <Text className="text-light-text font-bold text-[13px]">{student.name}</Text>
                      <Text className="text-light-muted text-[11px] font-medium">PRN: {student.prn}</Text>
                    </View>

                    <View
                      className={`px-2.5 py-1 rounded-full border ${statusColor.bg} ${statusColor.border}`}
                    >
                      <Text className={`text-[11px] font-extrabold ${statusColor.text}`}>
                        {student.status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer Action */}
          <TouchableOpacity
            onPress={handleFinishDemo}
            activeOpacity={0.85}
            accessibilityRole="button"
            className="bg-primary h-11 rounded-full items-center justify-center mt-3"
            style={shadow.glow}
          >
            <Text className="text-white text-sm font-bold">End Session & Continue Tour</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
