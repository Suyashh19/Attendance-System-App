import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Alert, TouchableOpacity, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
 getMySubjects, 
 registerPushToken, 
 startSession, 
 endSession,
 getActiveSession,
 deleteSubject,
 unenrollSubject
} from '../../services/attendance';
import { CreateSubjectModal } from '../../components/CreateSubjectModal';
import { EnrollModal } from '../../components/EnrollModal';
import { SubjectCard } from '../../components/SubjectCard';
import { FacultySessionModal } from '../../components/FacultySessionModal';
import { SchedulingModal } from '../../components/SchedulingModal';
import { PendingApprovalsModal } from '../../components/PendingApprovalsModal';
import { AttendanceSummaryModal } from '../../components/AttendanceSummaryModal';
import { useSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/authStore';
import { registerForPushNotifications } from '../../services/notification';
import type { SessionStartedPayload, Subject } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';

export default function HomeScreen() {
 const router = useRouter();
 const queryClient = useQueryClient();
 const user = useAuthStore((s) => s.user);
 
 const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
 const [activeSessionData, setActiveSessionData] = useState<SessionStartedPayload | null>(null);
 const [timeOffset, setTimeOffset] = useState<number>(0); // server - local
 const [facultyActiveSession, setFacultyActiveSession] = useState<any>(null);
 // Sessions already opened on the attendance screen, so recovery never reopens one
 const handledSessionsRef = useRef<Set<string>>(new Set());
 const [foregroundTick, setForegroundTick] = useState(0);

 // Modals
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [showEnrollModal, setShowEnrollModal] = useState(false);
 const [schedulingSubject, setSchedulingSubject] = useState<Subject | null>(null);

 const [selectedCategory, setSelectedCategory] = useState<'theory' | 'practical' | null>(null);
 const [isActionLoading, setIsActionLoading] = useState(false);
 const [liveCount, setLiveCount] = useState<{ sessionId: number, presentCount: number } | null>(null);
 
 const [pendingSubjectId, setPendingSubjectId] = useState<number | null>(null);
 const [summaryData, setSummaryData] = useState<{ sessionId: number, attendances: any[] } | null>(null);

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
  handledSessionsRef.current.add(String(data.sessionId));
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
  if (facultyActiveSession?.id === Number(data.sessionId)) {
  setFacultyActiveSession(null);
  }
  },
  onAttendanceCount: (data) => setLiveCount({ sessionId: Number(data.sessionId), presentCount: data.presentCount }),
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

 // Re-check for a live session whenever the app returns to the foreground (e.g. opened from a push)
 useEffect(() => {
 const subscription = AppState.addEventListener('change', (state) => {
 if (state === 'active') setForegroundTick((t) => t + 1);
 });
 return () => subscription.remove();
 }, []);

 // ─── SESSION RECOVERY: Check for active sessions on mount/load ──────────────
 useEffect(() => {
 if (user?.role !== 'student' || subjects.length === 0 || activeSessionId) return;

 let cancelled = false;

 const syncActiveSessions = async () => {
 try {
 console.log('[DEBUG] Syncing active sessions for enrolled subjects...');
 // Check active sessions for all enrolled subjects in parallel
 const results = await Promise.all(
 subjects.map(s => getActiveSession(s.id).catch(() => null))
 );
 if (cancelled) return;

 for (let i = 0; i < results.length; i++) {
 const result = results[i];
 if (!result?.active || !result.session) continue;

 const data = result.session;
 const sId = String(data.sessionId || data.id);
 if (handledSessionsRef.current.has(sId)) continue;

 // A session stays "active" until the faculty ends it; only recover it while its window is open
 const offset = data.serverTime ? new Date(data.serverTime).getTime() - Date.now() : 0;
 const expiryTime = new Date(data.windowExpiry).getTime();
 if (isNaN(expiryTime) || Date.now() + offset >= expiryTime) continue;

 console.log('[DEBUG] Recovered active session:', sId);
 handledSessionsRef.current.add(sId);
 const payload = { ...data, sessionId: sId, subjectName: subjects[i].name };

 setTimeOffset(offset);
 setActiveSessionId(sId);
 setActiveSessionData(payload);

 router.push({
 pathname: '/(tabs)/attendance',
 params: { sessionData: JSON.stringify(payload) },
 });
 break;
 }
 } catch (err) {
 console.error('[DEBUG] Session recovery failed:', err);
 }
 };

 syncActiveSessions();
 return () => { cancelled = true; };
 }, [subjects.length, user?.role, activeSessionId, foregroundTick]);

 // ─── Handlers ───────────────────────────────────────────────────────────────
 const handleStartSessionPress = (subject: Subject) => {
 setSchedulingSubject(subject);
 };

 const handleConfirmSchedule = async (date: string, startTime: string, endTime: string) => {
 if (!schedulingSubject) return;
 try {
 setIsActionLoading(true);

 const session = await startSession({
 subjectId: schedulingSubject.id,
 date,
 startTime,
 endTime
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
 const res = await endSession(facultyActiveSession.id);
 setFacultyActiveSession(null);
 setActiveSessionId(null);
 if (res.attendances) {
 setSummaryData({ sessionId: facultyActiveSession.id, attendances: res.attendances });
 }
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

 const handleDeleteSubject = (subject: Subject) => {
 Alert.alert(
 'Delete Subject',
 `Are you sure you want to delete "${subject.name}"? This will permanently wipe all attendance data for this class.\n\nNote: If you want to keep a record of this data, you should go to Reports (or History) to download the Excel file first.`,
 [
 { text: 'Cancel', style: 'cancel' },
 { 
 text: 'Delete Subject', 
 style: 'destructive',
 onPress: async () => {
 try {
 setIsActionLoading(true);
 await deleteSubject(subject.id);
 queryClient.invalidateQueries({ queryKey: ['subjects'] });
 } catch (err: any) {
 Alert.alert('Error', err.response?.data?.error || 'Failed to delete subject');
 } finally {
 setIsActionLoading(false);
 }
 }
 }
 ]
 );
 };

 const handleUnenrollSubject = (subject: Subject) => {
 Alert.alert(
 'Leave Class',
 `Are you sure you want to unenroll from "${subject.name}"? This will remove your attendance record for this subject.\n\nNote: If you want to save your current attendance, you can download your data from the Reports section before leaving.`,
 [
 { text: 'Cancel', style: 'cancel' },
 { 
 text: 'Unenroll Subject', 
 style: 'destructive',
 onPress: async () => {
 try {
 setIsActionLoading(true);
 await unenrollSubject(subject.id);
 queryClient.invalidateQueries({ queryKey: ['subjects'] });
 } catch (err: any) {
 Alert.alert('Error', err.response?.data?.error || 'Failed to unenroll');
 } finally {
 setIsActionLoading(false);
 }
 }
 }
 ]
 );
 };

 // ─── Renderers ──────────────────────────────────────────────────────────────
 if (isLoading) {
 return (
 <View className="flex-1 bg-light items-center justify-center">
 <ActivityIndicator size="large" color="#6366F1" />
 </View>
 );
 }

 if (isError) {
 return (
 <View className="flex-1 bg-light items-center justify-center p-6">
 <Ionicons name="alert-circle-outline" size={48} color="#1A1D1F" className="mb-4" />
 <Text className="text-light-text text-lg font-bold mb-2">Failed to load classes</Text>
 <Text className="text-light-muted text-center mb-6">
 Could not connect to the server. Please pull to refresh.
 </Text>
 <Button title="Try Again" onPress={() => refetch()} className="w-full" />
 </View>
 );
 }

 return (
 <View className="flex-1 bg-light">
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
 <Text className="text-3xl font-bold text-light-text">
 {selectedCategory ? (selectedCategory === 'theory' ? 'Theory Classes' : 'Practical Classes') : `Hello, ${user?.name?.split(' ')[0] || 'User'} 👋`}
 </Text>
 </View>
 <TouchableOpacity 
 onPress={() => user?.role === 'faculty' ? setShowCreateModal(true) : setShowEnrollModal(true)}
 className="bg-primary/20 px-3 py-2 rounded-xl border border-primary/30 flex-row items-center"
 >
 <Ionicons 
 name={user?.role === "faculty" ?"add" :"enter"} 
 size={20} 
 color="#6366F1" 
 />
 {user?.role === 'student' && (
 <Text className="text-primary font-bold ml-1">Enroll here</Text>
 )}
 </TouchableOpacity>
 </View>

 <Text className="text-light-muted text-base">
 {user?.role === 'student'
 ?"Waiting for a session to start. Keep this app open or wait for a push notification."
 : (selectedCategory ? `Managing your ${selectedCategory} subjects:` :"Select a category to manage your classes:")}
 </Text>

 {user?.role === 'faculty' && !selectedCategory && (
 <View className="flex-row gap-4 mt-8">
 <TouchableOpacity 
 onPress={() => setSelectedCategory('theory')}
 className="flex-1 bg-light-card shadow-sm border border-light-border p-8 rounded-3xl items-center shadow-xl"
 >
 <View className="bg-primary/20 p-4 rounded-2xl mb-4">
 <Ionicons name="book-outline" size={32} color="#6366F1" />
 </View>
 <Text className="text-light-text font-bold text-lg">Theory</Text>
 <Text className="text-light-muted text-xs mt-1">{subjects.filter(s => s.type === 'theory').length} Subjects</Text>
 </TouchableOpacity>

 <TouchableOpacity 
 onPress={() => setSelectedCategory('practical')}
 className="flex-1 bg-light-card shadow-sm border border-light-border p-8 rounded-3xl items-center shadow-xl"
 >
 <View className="bg-success/20 p-4 rounded-2xl mb-4">
 <Ionicons name="flask-outline" size={32} color="#059669" />
 </View>
 <Text className="text-light-text font-bold text-lg">Practical</Text>
 <Text className="text-light-muted text-xs mt-1">{subjects.filter(s => s.type === 'practical').length} Subjects</Text>
 </TouchableOpacity>
 </View>
 )}
 </View>
 }
 ListEmptyComponent={
 <View className="flex-1 items-center justify-center mt-20 p-6">
 <View className="bg-light-card shadow-sm p-6 rounded-full mb-6 border border-light-border">
 <Ionicons 
 name={user?.role === 'faculty' ?"school-outline" :"rocket-outline"} 
 size={64} 
 color="#6366F1" 
 />
 </View>
 {/* Removed empty state title text */}

 <Text className="text-light-muted text-center mb-8 px-4">
 {user?.role === 'faculty' 
 ?"Start managing your attendance. " 
 :"Enter a subject code provided by your faculty to start tracking your attendance."}
 </Text>
 <Button 
 title={user?.role === 'faculty' ?"Create Subject" :"Enroll in Class"}
 onPress={() => user?.role === 'faculty' ? setShowCreateModal(true) : setShowEnrollModal(true)}
 variant="primary"
 className="w-full max-w-[200px]"
 icon={user?.role === 'faculty' ?"add" :"enter"}
 />
 </View>
 }
 renderItem={({ item }) => (
 <SubjectCard 
 subject={item} 
 sessionActive={activeSessionId === String(item.id)} 
 onStartSession={() => handleStartSessionPress(item)}
 onDelete={() => handleDeleteSubject(item)}
 onManagePending={() => setPendingSubjectId(item.id)}
 onUnenroll={() => handleUnenrollSubject(item)}
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
 presentCount={liveCount && liveCount.sessionId === Number(facultyActiveSession?.id) ? liveCount.presentCount : 0}
 onEndSession={handleEndSession}
 />

 <SchedulingModal
 visible={!!schedulingSubject}
 subject={schedulingSubject}
 onClose={() => setSchedulingSubject(null)}
 onConfirm={handleConfirmSchedule}
 loading={isActionLoading}
 />

 <PendingApprovalsModal
 visible={!!pendingSubjectId}
 subjectId={pendingSubjectId}
 onClose={() => setPendingSubjectId(null)}
 />

 <AttendanceSummaryModal
 visible={!!summaryData}
 sessionId={summaryData?.sessionId || null}
 attendances={summaryData?.attendances || []}
 onClose={() => setSummaryData(null)}
 />
 
 {/* Global Activity Indicator for actions with Status */}
 {isActionLoading && !showCreateModal && !showEnrollModal && (
 <View className="absolute inset-0 bg-black/60 items-center justify-center p-6">
 <ActivityIndicator size="large" color="#6366F1" />
 <Text className="text-light-text font-bold mt-4 text-center">Starting Session...</Text>
 </View>
 )}
 </View>
 );
}
