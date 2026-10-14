import React, { useEffect, useRef, useState } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, Alert, TouchableOpacity, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
 getMySubjects, 
 getAttendanceHistory,
 registerPushToken, 
 startSession, 
 endSession,
 getActiveSession,
 getMyActiveSession,
} from '../../services/attendance';
import { CreateSubjectModal } from '../../components/CreateSubjectModal';
import { EnrollModal } from '../../components/EnrollModal';
import { SubjectCard } from '../../components/SubjectCard';
import { FacultySessionModal } from '../../components/FacultySessionModal';
import { AttendanceSummaryModal } from '../../components/AttendanceSummaryModal';
import { useSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/authStore';
import { registerForPushNotifications } from '../../services/notification';
import type { SessionStartedPayload, Subject } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { getErrorMessage } from '../../services/api';
import { colors } from '../../constants/theme';
import { Text } from '../../components/Text';
import { Hero } from '../../components/Hero';
import { Avatar } from '../../components/Avatar';
import { Chip } from '../../components/Chip';
import { EmptyState, SectionLabel } from '../../components/EmptyState';

export default function HomeScreen() {
 const router = useRouter();
 const insets = useSafeAreaInsets();
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

 const [selectedCategory, setSelectedCategory] = useState<'theory' | 'practical' | null>(null);
 const [isActionLoading, setIsActionLoading] = useState(false);
 const [liveCount, setLiveCount] = useState<{ sessionId: number, presentCount: number } | null>(null);
 
 const [summaryData, setSummaryData] = useState<{ sessionId: number, attendances: any[] } | null>(null);
 const [actionLabel, setActionLabel] = useState('Please wait...');
 const [isEndingSession, setIsEndingSession] = useState(false);
 const endingSessionRef = useRef(false);
 const handleEndSessionRef = useRef<() => void>(() => {});

 // Subject that currently has a live session (drives the LIVE badge on its card)
 const liveSubjectId = facultyActiveSession
 ? Number(facultyActiveSession.subjectId)
 : activeSessionData
 ? Number(activeSessionData.subjectId)
 : null;

 // ─── Fetch Subjects ──────────────────────────────────────────────────────────
 const { data: subjects = [], isLoading, isError, refetch } = useQuery({
 queryKey: ['subjects'],
 queryFn: getMySubjects,
 });

 const isFaculty = user?.role === 'faculty';
 const isStudent = user?.role === 'student';

 // Students: classes attended per subject, shown on each card
 const { data: history, refetch: refetchHistory } = useQuery({
 queryKey: ['history'],
 queryFn: getAttendanceHistory,
 enabled: isStudent,
 });
 const attendanceBySubject = React.useMemo(
 () => new Map((history ?? []).map((h) => [Number(h.id), { present: h.stats.PRESENT, total: h.stats.total }])),
 [history]
 );

 const [refreshing, setRefreshing] = useState(false);
 const handleRefresh = async () => {
 setRefreshing(true);
 try {
 await Promise.all([refetch(), isStudent ? refetchHistory() : null]);
 } finally {
 setRefreshing(false);
 }
 };

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
  if (String(activeSessionId) === String(data.sessionId)) {
  setActiveSessionId(null);
  setActiveSessionData(null);
  }
  // The server closed the faculty's session by itself: fetch the roster and show the summary
  if (facultyActiveSession?.id === Number(data.sessionId)) {
  handleEndSessionRef.current();
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
 console.warn('[Home] Session recovery failed:', err);
 }
 };

 syncActiveSessions();
 return () => { cancelled = true; };
 }, [subjects.length, user?.role, activeSessionId, foregroundTick]);

 // ─── Handlers ───────────────────────────────────────────────────────────────
 // One confirmation, then the session starts right away (it always starts "now")
 const handleStartSessionPress = (subject: Subject) => {
 Alert.alert(
 'Start Attendance',
 `Start an attendance session for "${subject.name}"?\n\nStudents get a few seconds to type the code you show them, so start only when the class is ready.`,
 [
 { text: 'Cancel', style: 'cancel' },
 { text: 'Start', onPress: () => startSessionFor(subject) },
 ]
 );
 };

 const startSessionFor = async (subject: Subject) => {
 if (isActionLoading || facultyActiveSession) return;

 // The timetable slot stored with the session: now, for one hour
 const pad = (n: number) => String(n).padStart(2, '0');
 const now = new Date();
 const later = new Date(now.getTime() + 60 * 60 * 1000);
 const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
 const startTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
 const endTime = `${pad(later.getHours())}:${pad(later.getMinutes())}`;

 try {
 setIsActionLoading(true);

 setActionLabel('Starting session...');
 const session = await startSession({
 subjectId: subject.id,
 date,
 startTime,
 endTime
 });
 
 // Countdown length comes from the server's window, not a hard-coded number
 const windowMs = new Date(session.windowExpiry).getTime() - new Date(session.serverTime).getTime();
 const windowSeconds = windowMs > 0 ? Math.ceil(windowMs / 1000) : (session.windowSeconds || 15);

 setLiveCount(null);
 setFacultyActiveSession({ ...session, subjectName: subject.name, windowSeconds });
 setActiveSessionId(session.id);
 } catch (err: any) {
 Alert.alert('Could not start session', getErrorMessage(err, 'Failed to start session. Please try again.'));
 } finally {
 setIsActionLoading(false);
 }
 };

 // Also runs when the server closes the session by itself; the end call then just returns the roster
 const handleEndSession = async (target?: { id: number }) => {
 const session = target ?? facultyActiveSession;
 if (!session || endingSessionRef.current) return;
 endingSessionRef.current = true;
 setIsEndingSession(true);
 try {
 const res = await endSession(session.id);
 setFacultyActiveSession(null);
 setActiveSessionId(null);
 setActiveSessionData(null);
 setLiveCount(null);
 queryClient.invalidateQueries({ queryKey: ['recent-sessions'] });
 if (res.attendances?.length) {
 setSummaryData({ sessionId: session.id, attendances: res.attendances });
 }
 } catch (err: any) {
 // Keep the session on screen so the faculty can retry instead of silently losing it
 Alert.alert(
 'Could not end session',
 `${getErrorMessage(err, 'Something went wrong.')}\n\nThe session also closes by itself shortly after the timer runs out.`,
 [
 {
 text: 'Close',
 style: 'cancel',
 onPress: () => {
 setFacultyActiveSession(null);
 setActiveSessionId(null);
 setLiveCount(null);
 },
 },
 { text: 'Try Again', onPress: () => handleEndSessionRef.current() },
 ]
 );
 } finally {
 endingSessionRef.current = false;
 setIsEndingSession(false);
 }
 };
 handleEndSessionRef.current = () => handleEndSession();

 // ─── FACULTY SESSION RECOVERY: reopen a session that is still running ───────
 // (app was closed, reloaded, or sent to the background while the code was on screen)
 useEffect(() => {
 if (user?.role !== 'faculty' || facultyActiveSession) return;

 let cancelled = false;

 (async () => {
 try {
 const result = await getMyActiveSession();
 if (cancelled || !result?.active || !result.session) return;

 const session = result.session;
 const remainingMs = new Date(session.windowExpiry).getTime() - new Date(session.serverTime).getTime();

 if (remainingMs > 0) {
 setLiveCount({ sessionId: Number(session.id), presentCount: session.presentCount ?? 0 });
 setFacultyActiveSession({ ...session, windowSeconds: Math.ceil(remainingMs / 1000) });
 setActiveSessionId(session.id);
 } else {
 // The window is over but the session was never closed: close it and show the summary
 handleEndSession({ id: Number(session.id) });
 }
 } catch {
 // Recovery is best-effort; the server closes the session by itself anyway
 }
 })();

 return () => { cancelled = true; };
 }, [user?.role, foregroundTick]);

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
 Alert.alert('Request Sent', 'Your faculty needs to approve the request before you can mark attendance for this class.');
 }, [queryClient]);

 // ─── Renderers ──────────────────────────────────────────────────────────────
 if (isLoading) {
 return (
 <View className="flex-1 bg-light items-center justify-center">
 <ActivityIndicator size="large" color={colors.primary} />
 </View>
 );
 }

 if (isError) {
 return (
 <View className="flex-1 bg-light justify-center px-4">
 <EmptyState
 icon="cloud-offline-outline"
 tone="danger"
 title="Could not load your classes"
 text="Check your internet connection and try again."
 action={<Button title="Try Again" icon="refresh" onPress={() => refetch()} />}
 />
 </View>
 );
 }

 const openAddModal = () => (isFaculty ? setShowCreateModal(true) : setShowEnrollModal(true));
 const firstName = user?.name?.split(' ')[0] || 'there';
 const liveSubject = liveSubjectId !== null ? subjects.find((s) => s.id === liveSubjectId) : undefined;

 const categories: { key: 'theory' | 'practical' | null; label: string; count: number }[] = [
 { key: null, label: 'All', count: subjects.length },
 { key: 'theory', label: 'Theory', count: subjects.filter((s) => s.type === 'theory').length },
 { key: 'practical', label: 'Practical', count: subjects.filter((s) => s.type === 'practical').length },
 ];

 // Three numbers under the name
 const totalPresent = (history ?? []).reduce((sum, h) => sum + h.stats.PRESENT, 0);
 const totalClasses = (history ?? []).reduce((sum, h) => sum + h.stats.total, 0);
 const overview = isFaculty
 ? [
 { label: 'Subjects', value: String(subjects.length) },
 { label: 'Theory', value: String(categories[1].count) },
 { label: 'Practical', value: String(categories[2].count) },
 ]
 : [
 { label: 'Classes', value: String(subjects.length) },
 { label: 'Attended', value: `${totalPresent}/${totalClasses}` },
 { label: 'Overall', value: totalClasses > 0 ? `${Math.round((totalPresent / totalClasses) * 100)}%` : '--' },
 ];

 return (
 <View className="flex-1 bg-light">
 <FlatList
 data={filteredSubjects}
 keyExtractor={(item) => String(item.id)}
 contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
 showsVerticalScrollIndicator={false}
 refreshControl={
 <RefreshControl
 refreshing={refreshing}
 onRefresh={handleRefresh}
 tintColor={colors.primary}
 colors={[colors.primary]}
 progressViewOffset={insets.top}
 />
 }
 ListHeaderComponent={
 <View className="mb-3">
 <Hero className="px-5 pb-6" style={{ paddingTop: insets.top + 16 }}>
 <View className="flex-row items-center">
 <Avatar name={user?.name} size={48} tone="onDark" />
 <View className="flex-1 mx-3">
 <Text className="text-white text-[22px] font-extrabold" numberOfLines={1}>Hello, {firstName}</Text>
 </View>
 <TouchableOpacity
 onPress={openAddModal}
 activeOpacity={0.85}
 accessibilityRole="button"
 accessibilityLabel={isFaculty ? 'Create a subject' : 'Enroll in a class'}
 className="bg-white h-11 pl-3 pr-4 rounded-full flex-row items-center"
 >
 <Ionicons name={isFaculty ? 'add' : 'enter-outline'} size={18} color={colors.primary} style={{ marginRight: 6 }} />
 <Text className="text-primary font-bold text-sm">{isFaculty ? 'New subject' : 'Enroll'}</Text>
 </TouchableOpacity>
 </View>

 <View className="flex-row mt-5">
 {overview.map(({ label, value }, i) => (
 <View
 key={label}
 className={`flex-1 bg-white/10 border border-white/10 rounded-2xl py-3 items-center ${i > 0 ? 'ml-2' : ''}`}
 >
 <Text className="text-white text-xl font-extrabold">{value}</Text>
 <Text className="text-white/60 text-[11px] font-semibold mt-0.5">{label}</Text>
 </View>
 ))}
 </View>

 {/* What is happening right now */}
 <View className={`rounded-2xl px-4 py-3 mt-3 flex-row items-center ${liveSubject ? 'bg-white' : 'bg-white/10 border border-white/10'}`}>
 {liveSubject ? (
 <View className="w-8 h-8 rounded-full bg-success-bg items-center justify-center mr-3">
 <View className="w-2.5 h-2.5 rounded-full bg-success" />
 </View>
 ) : (
 <Ionicons name="radio-outline" size={18} color="rgba(255, 255, 255, 0.6)" style={{ marginRight: 10 }} />
 )}
 <Text className={`text-[13px] leading-[18px] flex-1 ${liveSubject ? 'text-light-text font-bold' : 'text-white/80 font-medium'}`}>
 {liveSubject
 ? `Attendance is open for ${liveSubject.name}`
 : isFaculty
 ? 'No session running. Tap Start on a subject when the class is ready.'
 : 'No session right now. You will be notified when your faculty starts one.'}
 </Text>
 </View>
 </Hero>

 {isFaculty && subjects.length > 0 && (
 <View className="flex-row px-4 mt-4">
 {categories.map(({ key, label, count }) => (
 <Chip
 key={label}
 label={`${label} · ${count}`}
 selected={selectedCategory === key}
 onPress={() => setSelectedCategory(key)}
 className="mr-2"
 />
 ))}
 </View>
 )}

 {filteredSubjects.length > 0 && (
 <SectionLabel className="px-5 mt-5">
 {isFaculty ? 'YOUR SUBJECTS' : 'YOUR CLASSES'}
 </SectionLabel>
 )}
 </View>
 }
 ListEmptyComponent={
 <View className="flex-1 justify-center px-4">
 <EmptyState
 icon={isFaculty ? 'school-outline' : 'book-outline'}
 title={isFaculty
 ? (selectedCategory ? `No ${selectedCategory} subjects yet` : 'No subjects yet')
 : 'No classes yet'}
 text={isFaculty
 ? 'Create a subject, then share its code with your students so they can enroll.'
 : 'Enter the subject code from your faculty to start tracking your attendance.'}
 action={
 <Button
 title={isFaculty ? 'Create Subject' : 'Enroll in a Class'}
 onPress={openAddModal}
 icon={isFaculty ? 'add' : 'enter-outline'}
 />
 }
 />
 </View>
 }
 renderItem={({ item }) => (
 <View className="px-4">
 <SubjectCard
 subject={item}
 sessionActive={liveSubjectId === item.id}
 attendance={isStudent && history ? attendanceBySubject.get(item.id) ?? { present: 0, total: 0 } : undefined}
 onPress={() => router.push(`/subject/${item.id}` as any)}
 onStartSession={() => handleStartSessionPress(item)}
 />
 </View>
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
 sessionKey={facultyActiveSession?.id}
 duration={facultyActiveSession?.windowSeconds || 15}
 ending={isEndingSession}
 onEndSession={() => handleEndSession()}
 />

 <AttendanceSummaryModal
 visible={!!summaryData}
 sessionId={summaryData?.sessionId || null}
 attendances={summaryData?.attendances || []}
 onClose={() => setSummaryData(null)}
 />

 {/* Global Activity Indicator for actions with Status */}
 {isActionLoading && !showCreateModal && !showEnrollModal && (
 <View className="absolute inset-0 items-center justify-center p-6" style={{ backgroundColor: colors.overlay }}>
 <View className="bg-light-card rounded-3xl px-10 py-7 items-center">
 <ActivityIndicator size="large" color={colors.primary} />
 <Text className="text-light-text font-bold mt-4 text-center">{actionLabel}</Text>
 </View>
 </View>
 )}
 </View>
 );
}
