import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Alert, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getMySubjects, 
  registerPushToken, 
  startSession, 
  endSession, 
  createSubject, 
  enrollInSubject 
} from '../../services/attendance';
import { SubjectCard } from '../../components/SubjectCard';
import { FacultySessionModal } from '../../components/FacultySessionModal';
import { useSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/authStore';
import { registerForPushNotifications } from '../../services/notification';
import type { SessionStartedPayload, Subject } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { useLocation } from '../../hooks/useLocation';

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { getLocation } = useLocation();
  
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [facultyActiveSession, setFacultyActiveSession] = useState<any>(null);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  
  // Form States
  const [newSubject, setNewSubject] = useState({ name: '', code: '' });
  const [enrollCode, setEnrollCode] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // ─── Fetch Subjects ──────────────────────────────────────────────────────────
  const { data: subjects = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['subjects'],
    queryFn: getMySubjects,
  });

  // ─── Push Notifications ─────────────────────────────────────────────────────
  useEffect(() => {
    async function setupPush() {
      const token = await registerForPushNotifications();
      if (token) {
        await registerPushToken(token);
      }
    }
    setupPush();
  }, []);

  // ─── Socket.IO Real-time Events ─────────────────────────────────────────────
  const subjectIds = subjects.map((s) => s.id);

  useSocket({
    subjectIds,
    onSessionStarted: (data: SessionStartedPayload) => {
      setActiveSessionId(data.sessionId);
      if (user?.role === 'student') {
        router.push({
          pathname: '/(tabs)/attendance',
          params: { sessionData: JSON.stringify(data) },
        });
      }
    },
    onSessionEnded: (data) => {
      if (activeSessionId === data.sessionId) {
        setActiveSessionId(null);
      }
      if (facultyActiveSession?.id === data.sessionId) {
        setFacultyActiveSession(null);
      }
    },
  });

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleStartSession = async (subject: Subject) => {
    try {
      setIsActionLoading(true);
      const loc = await getLocation();
      if (!loc) {
        Alert.alert('Location Required', 'Please enable GPS to start an attendance session.');
        return;
      }

      const session = await startSession(subject.id, loc.latitude, loc.longitude);
      setFacultyActiveSession({
        ...session,
        subjectName: subject.name
      });
      setActiveSessionId(session.id);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to start session');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!facultyActiveSession) return;
    try {
      await endSession(facultyActiveSession.id);
      setFacultyActiveSession(null);
      setActiveSessionId(null);
    } catch (err) {
      Alert.alert('Error', 'Failed to end session');
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubject.name || !newSubject.code) return;
    try {
      setIsActionLoading(true);
      await createSubject(newSubject.name, newSubject.code);
      setShowCreateModal(false);
      setNewSubject({ name: '', code: '' });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create subject');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!enrollCode) return;
    try {
      setIsActionLoading(true);
      await enrollInSubject(enrollCode);
      setShowEnrollModal(false);
      setEnrollCode('');
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      Alert.alert('Success', 'Enrolled successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to enroll');
    } finally {
      setIsActionLoading(false);
    }
  };

  // ─── Renderers ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View className="flex-1 bg-dark items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-dark items-center justify-center p-6">
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" className="mb-4" />
        <Text className="text-white text-lg font-bold mb-2">Failed to load classes</Text>
        <Text className="text-dark-muted text-center mb-6">
          Could not connect to the server. Please pull to refresh.
        </Text>
        <Button title="Try Again" onPress={() => refetch()} className="w-full" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-dark">
      <FlatList
        data={subjects}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
        ListHeaderComponent={
          <View className="mb-6 mt-2">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1">
                <Text className="text-3xl font-bold text-white">
                  Hello, {user?.name?.split(' ')[0] || 'User'} 👋
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => user?.role === 'faculty' ? setShowCreateModal(true) : setShowEnrollModal(true)}
                className="bg-primary/20 p-2 rounded-xl border border-primary/30"
              >
                <Ionicons 
                  name={user?.role === 'faculty' ? "add" : "enter"} 
                  size={24} 
                  color="#6366F1" 
                />
              </TouchableOpacity>
            </View>

            <Text className="text-dark-muted text-base">
              {user?.role === 'student'
                ? "Waiting for a session to start. Keep this app open or wait for a push notification."
                : "Manage your assigned classes:"}
            </Text>
            
            {user?.role === 'student' && activeSessionId && (
              <View className="mt-4 bg-success/10 p-4 rounded-xl border border-success/20 flex-row items-center">
                <Ionicons name="radio" size={24} color="#10B981" className="mr-3" />
                <View className="flex-1">
                  <Text className="text-white font-bold mb-1">Session Live!</Text>
                  <Text className="text-success/80 text-xs">
                    Attendance is currently being taken. Join now.
                  </Text>
                </View>
                <Button 
                   title="Join" 
                   onPress={() => refetch()} 
                   size="sm" 
                />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center mt-20">
            <Ionicons name="library-outline" size={64} color="#334155" className="mb-4" />
            <Text className="text-dark-muted font-medium text-lg">No classes found</Text>
            <TouchableOpacity 
              onPress={() => user?.role === 'faculty' ? setShowCreateModal(true) : setShowEnrollModal(true)}
              className="mt-4"
            >
              <Text className="text-primary font-bold">
                {user?.role === 'faculty' ? "+ Create your first subject" : "Enroll with a subject code"}
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <SubjectCard 
            subject={item} 
            sessionActive={activeSessionId === String(item.id)} 
            onStartSession={() => handleStartSession(item)}
          />
        )}
      />

      {/* Create Subject Modal */}
      <Modal visible={showCreateModal} animationType="fade" transparent>
        <View className="flex-1 bg-black/60 justify-center p-6">
          <View className="bg-dark-card rounded-3xl p-6 border border-dark-border">
            <Text className="text-xl font-bold text-white mb-4">Create New Subject</Text>
            <TextInput
              placeholder="Subject Name (e.g. Distributed Systems)"
              placeholderTextColor="#64748B"
              className="bg-dark p-4 rounded-xl text-white mb-4 border border-dark-border"
              value={newSubject.name}
              onChangeText={(t) => setNewSubject({ ...newSubject, name: t })}
            />
            <TextInput
              placeholder="Subject Code (e.g. CS402)"
              placeholderTextColor="#64748B"
              className="bg-dark p-4 rounded-xl text-white mb-6 border border-dark-border"
              value={newSubject.code}
              onChangeText={(t) => setNewSubject({ ...newSubject, code: t })}
              autoCapitalize="characters"
            />
            <View className="flex-row">
              <TouchableOpacity 
                onPress={() => setShowCreateModal(false)}
                className="flex-1 items-center p-4"
              >
                <Text className="text-dark-muted font-bold">Cancel</Text>
              </TouchableOpacity>
              <Button 
                title="Create" 
                onPress={handleCreateSubject} 
                className="flex-1" 
                loading={isActionLoading}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Enroll Modal */}
      <Modal visible={showEnrollModal} animationType="fade" transparent>
        <View className="flex-1 bg-black/60 justify-center p-6">
          <View className="bg-dark-card rounded-3xl p-6 border border-dark-border">
            <Text className="text-xl font-bold text-white mb-4">Enroll in Class</Text>
            <Text className="text-dark-muted mb-4">Enter the subject code provided by your faculty.</Text>
            <TextInput
              placeholder="Enter Code (e.g. IT101)"
              placeholderTextColor="#64748B"
              className="bg-dark p-4 rounded-xl text-white mb-6 border border-dark-border text-center text-lg font-bold"
              value={enrollCode}
              onChangeText={setEnrollCode}
              autoCapitalize="characters"
            />
            <View className="flex-row">
              <TouchableOpacity 
                onPress={() => setShowEnrollModal(false)}
                className="flex-1 items-center p-4"
              >
                <Text className="text-dark-muted font-bold">Cancel</Text>
              </TouchableOpacity>
              <Button 
                title="Enroll" 
                onPress={handleEnroll} 
                className="flex-1" 
                loading={isActionLoading}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Faculty Live Session View */}
      <FacultySessionModal
        visible={!!facultyActiveSession}
        subjectName={facultyActiveSession?.subjectName || ''}
        correctCode={facultyActiveSession?.correctCode || ''}
        onEndSession={handleEndSession}
      />
      
      {/* Global Activity Indicator for actions */}
      {isActionLoading && !showCreateModal && !showEnrollModal && (
        <View className="absolute inset-0 bg-black/20 items-center justify-center">
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      )}
    </View>
  );
}
