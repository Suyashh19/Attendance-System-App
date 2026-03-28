import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  getMySubjects, 
  registerPushToken, 
  startSession, 
  endSession 
} from '../../services/attendance';
import { CreateSubjectModal } from '../../components/CreateSubjectModal';
import { EnrollModal } from '../../components/EnrollModal';
import { SubjectCard } from '../../components/SubjectCard';
import { FacultySessionModal } from '../../components/FacultySessionModal';
import { SchedulingModal } from '../../components/SchedulingModal';
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
  const [activeSessionData, setActiveSessionData] = useState<SessionStartedPayload | null>(null);
  const [timeOffset, setTimeOffset] = useState<number>(0); // server - local
  const [facultyActiveSession, setFacultyActiveSession] = useState<any>(null);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [schedulingSubject, setSchedulingSubject] = useState<Subject | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<'theory' | 'practical' | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // ─── Fetch Subjects ──────────────────────────────────────────────────────────
  const { data: subjects = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['subjects'],
    queryFn: getMySubjects,
  });

  // Filter subjects based on selection
  const filteredSubjects = user?.role === 'faculty' && selectedCategory
    ? subjects.filter(s => s.type === selectedCategory)
    : subjects;

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
  const subjectIds = React.useMemo(() => subjects.map((s) => String(s.id)), [subjects]);

  useSocket({
    subjectIds,
    onSessionStarted: (data: SessionStartedPayload) => {
      if (data.serverTime) {
        const offset = new Date(data.serverTime).getTime() - Date.now();
        setTimeOffset(offset);
      }
      setActiveSessionId(data.sessionId);
      setActiveSessionData(data);
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
        setActiveSessionData(null);
      }
      if (facultyActiveSession?.id === data.sessionId) {
        setFacultyActiveSession(null);
      }
    },
  });

  // ─── Auto-expire session ───────────────────────────────────────────────────
  useEffect(() => {
    if (!activeSessionData) return;
    
    // Use a single interval to check expiry, and only update state if it actually expires
    const expiryTime = new Date(activeSessionData.windowExpiry).getTime();
    if (isNaN(expiryTime)) return;

    const interval = setInterval(() => {
      const nowSynced = Date.now() + timeOffset;
      if (nowSynced > expiryTime) {
        console.log('[DEBUG] Session expired in background. Clearing...');
        setActiveSessionId(null);
        setActiveSessionData(null);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSessionData?.sessionId, timeOffset]); // Only depend on sessionId to prevent re-runs on every data change

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleStartSessionPress = (subject: Subject) => {
    setSchedulingSubject(subject);
  };

  const handleConfirmSchedule = async (date: string, startTime: string, endTime: string) => {
    if (!schedulingSubject) return;
    try {
      setIsActionLoading(true);
      const loc = await getLocation();
      if (!loc) {
        Alert.alert('Location Required', 'Please enable GPS to start an attendance session.');
        return;
      }
      const session = await startSession({
        subjectId: schedulingSubject.id,
        date,
        startTime,
        endTime,
        latitude: loc.latitude,
        longitude: loc.longitude
      });
      setFacultyActiveSession({ ...session, subjectName: schedulingSubject.name });
      setActiveSessionId(session.id);
      setSchedulingSubject(null);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to start session');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!facultyActiveSession) return;
    try {
      setIsActionLoading(true);
      await endSession(facultyActiveSession.id);
      setFacultyActiveSession(null);
      setActiveSessionId(null);
    } catch (err) {
      setFacultyActiveSession(null);
      setActiveSessionId(null);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCloseCreateModal = React.useCallback(() => setShowCreateModal(false), []);
  const handleCloseEnrollModal = React.useCallback(() => setShowEnrollModal(false), []);

  const handleCreateSuccess = React.useCallback((type: 'theory' | 'practical') => {
    setShowCreateModal(false);
    setSelectedCategory(type);
    queryClient.invalidateQueries({ queryKey: ['subjects'] });
    Alert.alert('Success', 'Subject created successfully');
  }, [queryClient]);

  const handleEnrollSuccess = React.useCallback(() => {
    setShowEnrollModal(false);
    queryClient.invalidateQueries({ queryKey: ['subjects'] });
    Alert.alert('Success', 'Enrolled successfully!');
  }, [queryClient]);

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
        data={user?.role === 'faculty' && !selectedCategory ? [] : filteredSubjects}
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
                {selectedCategory ? (
                  <TouchableOpacity onPress={() => setSelectedCategory(null)} className="flex-row items-center mb-2">
                    <Ionicons name="chevron-back" size={20} color="#6366F1" />
                    <Text className="text-primary font-bold ml-1">Back to Categories</Text>
                  </TouchableOpacity>
                ) : null}
                <Text className="text-3xl font-bold text-white">
                  {selectedCategory ? (selectedCategory === 'theory' ? 'Theory Classes' : 'Practical Classes') : `Hello, ${user?.name?.split(' ')[0] || 'User'} 👋`}
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
                : (selectedCategory ? `Managing your ${selectedCategory} subjects:` : "Select a category to manage your classes:")}
            </Text>

            {user?.role === 'faculty' && !selectedCategory && (
              <View className="flex-row gap-4 mt-8">
                <TouchableOpacity 
                  onPress={() => setSelectedCategory('theory')}
                  className="flex-1 bg-dark-card border border-dark-border p-8 rounded-3xl items-center shadow-xl"
                >
                  <View className="bg-primary/20 p-4 rounded-2xl mb-4">
                    <Ionicons name="book-outline" size={32} color="#6366F1" />
                  </View>
                  <Text className="text-white font-bold text-lg">Theory</Text>
                  <Text className="text-dark-muted text-xs mt-1">{subjects.filter(s => s.type === 'theory').length} Subjects</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setSelectedCategory('practical')}
                  className="flex-1 bg-dark-card border border-dark-border p-8 rounded-3xl items-center shadow-xl"
                >
                  <View className="bg-success/20 p-4 rounded-2xl mb-4">
                    <Ionicons name="flask-outline" size={32} color="#10B981" />
                  </View>
                  <Text className="text-white font-bold text-lg">Practical</Text>
                  <Text className="text-dark-muted text-xs mt-1">{subjects.filter(s => s.type === 'practical').length} Subjects</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center mt-20 p-6">
            <View className="bg-dark-card p-6 rounded-full mb-6 border border-dark-border">
              <Ionicons 
                name={user?.role === 'faculty' ? "school-outline" : "rocket-outline"} 
                size={64} 
                color="#6366F1" 
              />
            </View>
            <Text className="text-white font-bold text-xl mb-2 text-center">
              {user?.role === 'faculty' ? "No subjects created yet" : "No classes joined yet"}
            </Text>
            <Text className="text-dark-muted text-center mb-8 px-4">
              {user?.role === 'faculty' 
                ? "Start managing your attendance by creating your first subject module." 
                : "Enter a subject code provided by your faculty to start tracking your attendance."}
            </Text>
            <Button 
              title={user?.role === 'faculty' ? "Create Subject" : "Enroll in Class"}
              onPress={() => user?.role === 'faculty' ? setShowCreateModal(true) : setShowEnrollModal(true)}
              variant="primary"
              className="w-full max-w-[200px]"
              icon={user?.role === 'faculty' ? "add" : "enter"}
            />
          </View>
        }
        renderItem={({ item }) => (
          <SubjectCard 
            subject={item} 
            sessionActive={activeSessionId === String(item.id)} 
            onStartSession={() => handleStartSessionPress(item)}
          />
        )}
      />

      {/* Modals */}
      <CreateSubjectModal 
        visible={showCreateModal}
        onClose={handleCloseCreateModal}
        onSuccess={handleCreateSuccess}
      />

      <EnrollModal 
        visible={showEnrollModal}
        onClose={handleCloseEnrollModal}
        onSuccess={handleEnrollSuccess}
      />

      <FacultySessionModal
        visible={!!facultyActiveSession}
        subjectName={facultyActiveSession?.subjectName || ''}
        correctCode={facultyActiveSession?.correctCode || ''}
        onEndSession={handleEndSession}
      />

      <SchedulingModal
        visible={!!schedulingSubject}
        subject={schedulingSubject}
        onClose={() => setSchedulingSubject(null)}
        onConfirm={handleConfirmSchedule}
        loading={isActionLoading}
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
