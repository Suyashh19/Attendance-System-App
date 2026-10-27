import React, { useEffect, useRef, useState } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, AppState } from 'react-native';
import { showAlert } from '../../store/dialogStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
 getMySubjects, 
 getAttendanceHistory,
 startSession, 
 endSession,
 getActiveSession,
 getMyActiveSession,
} from '../../services/attendance';
import { CreateSubjectModal } from '../../components/CreateSubjectModal';
import { EnrollModal } from '../../components/EnrollModal';
import { SubjectCard } from '../../components/SubjectCard';
import { AcademicYearCard } from '../../components/AcademicYearCard';
import { TabSkeleton } from '../../components/Skeleton';
import { SegmentedControl } from '../../components/SegmentedControl';
import { FacultySessionModal } from '../../components/FacultySessionModal';
import { AttendanceSummaryModal } from '../../components/AttendanceSummaryModal';
import { useSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/authStore';
import type { SessionStartedPayload, Subject } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { getErrorMessage } from '../../services/api';
import { colors } from '../../constants/theme';
import { Text } from '../../components/Text';
import { Hero } from '../../components/Hero';
import { ClassFilterSheet } from '../../components/ClassFilterSheet';
import { SearchFilterBar } from '../../components/SearchFilterBar';
import { EmptyState, SectionLabel } from '../../components/EmptyState';
import { offerToShareSubject } from '../../utils/shareSubject';
import {
  NO_FILTERS,
  activeFilterCount,
  applyClassFilters,
  buildClassList,
  defaultFilters,
  filterSummary,
  filtersShowing,
  yearChoices,
  type ClassEntry,
  type ClassFilters,
} from '../../utils/classesView';
import {
  currentAcademicYear,
  currentTerm,
  groupByAcademicYear,
  subjectsInTerm,
  termsPresent,
  OTHER_YEAR,
  type Term,
} from '../../utils/academicYear';

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

 // Faculty: null = not touched yet, so the list opens on the running academic year and term
 const [chosenFilters, setChosenFilters] = useState<ClassFilters | null>(null);
 const [search, setSearch] = useState('');
 const [showFilters, setShowFilters] = useState(false);
 // Student: the academic year (and the term inside it) being browsed. No year = the list of years.
 const [openYear, setOpenYear] = useState<string | null>(null);
 const [pickedTerm, setPickedTerm] = useState<Term | null | undefined>(undefined);
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

 // Faculty filters. A chosen year or term that no longer matches anything simply shows an empty state with Clear.
 const filters = chosenFilters ?? defaultFilters(subjects);
 const filterCount = activeFilterCount(filters);

 // Student: subjects grouped by academic year. A single year opens straight away, with no card to tap.
 const yearGroups = React.useMemo(() => groupByAcademicYear(subjects), [subjects]);
 const studentYear = user?.role === 'student'
 ? yearGroups.find((g) => g.key === openYear) ?? (yearGroups.length === 1 ? yearGroups[0] : null)
 : null;
 const termsHere = studentYear ? termsPresent(studentYear) : [];
 // The term shown: the one picked, else the running term if it has subjects, else the first that does
 const activeTerm: Term | null = !studentYear
 ? null
 : pickedTerm !== undefined && termsHere.includes(pickedTerm)
 ? pickedTerm
 : termsHere.includes(currentTerm())
 ? currentTerm()
 : termsHere[0] ?? null;
 const showYearCards = user?.role === 'student' && subjects.length > 0 && !studentYear;

 const filteredSubjects = user?.role === 'faculty'
 ? applyClassFilters(subjects, filters, search)
 : showYearCards
 ? []
 : studentYear
 ? subjectsInTerm(studentYear.subjects, activeTerm)
 : subjects;

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
 showAlert(
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
 showAlert('Could not start session', getErrorMessage(err, 'Failed to start session. Please try again.'));
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
 showAlert(
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

 const handleCreateSuccess = React.useCallback((type: 'theory' | 'practical', created: Subject) => {
 setShowCreateModal(false);
 // Show the new subject: filter to its year and term, and drop a search that would hide it
 setChosenFilters(filtersShowing(created.span));
 setSearch('');
 queryClient.invalidateQueries({ queryKey: ['subjects'] });
 offerToShareSubject(created);
 }, [queryClient]);

 const handleEnrollSuccess = React.useCallback(() => {
 setShowEnrollModal(false);
 queryClient.invalidateQueries({ queryKey: ['subjects'] });
 showAlert('Request Sent', 'Your faculty needs to approve the request before you can mark attendance for this class.');
 }, [queryClient]);

 // ─── Renderers ──────────────────────────────────────────────────────────────
 if (isLoading) return <TabSkeleton />;

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

 // Faculty see group headers (and the live subject first); students get their subjects as they are
 const listEntries: ClassEntry<Subject>[] = isFaculty
 ? buildClassList(filteredSubjects, liveSubjectId)
 : filteredSubjects.map((subject) => ({ kind: 'subject', subject }));

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
 data={listEntries}
 keyExtractor={(entry) => (entry.kind === 'header' ? `header-${entry.key}` : String(entry.subject.id))}
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
 <View className="w-12 h-12 rounded-full bg-white/15 border border-white/10 items-center justify-center">
 <Ionicons name={isFaculty ? 'easel' : 'school'} size={22} color={colors.white} />
 </View>
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
 <View className="px-4 mt-4">
 <SearchFilterBar
 value={search}
 onChangeText={setSearch}
 placeholder="Search by name or code"
 filterCount={filterCount}
 onOpenFilters={() => setShowFilters(true)}
 summary={filterSummary(filteredSubjects.length, filters)}
 onShowAll={() => { setChosenFilters(NO_FILTERS); setSearch(''); }}
 />
 </View>
 )}

 {showYearCards && (
 <View className="px-4">
 <SectionLabel className="px-1 mt-5 mb-3">ACADEMIC YEARS</SectionLabel>
 {yearGroups.map((group) => {
 const approved = group.subjects.filter((s) => !s.enrollmentStatus || s.enrollmentStatus === 'APPROVED');
 const totals = approved.reduce(
 (sum, s) => {
 const a = attendanceBySubject.get(s.id);
 return { present: sum.present + (a?.present ?? 0), total: sum.total + (a?.total ?? 0) };
 },
 { present: 0, total: 0 }
 );
 return (
 <AcademicYearCard
 key={group.key}
 label={group.label}
 subjectCount={group.subjects.length}
 odd={group.counts.Odd}
 even={group.counts.Even}
 attendance={history ? totals : undefined}
 isCurrent={group.key === currentAcademicYear()}
 onPress={() => { setOpenYear(group.key); setPickedTerm(undefined); }}
 />
 );
 })}
 </View>
 )}

 {studentYear && (yearGroups.length > 1 || studentYear.key !== OTHER_YEAR) && (
 <View className="px-4 mt-4">
 {yearGroups.length > 1 && (
 <TouchableOpacity
 onPress={() => setOpenYear(null)}
 activeOpacity={0.7}
 accessibilityRole="button"
 accessibilityLabel="Back to all academic years"
 className="flex-row items-center self-start mb-2 -ml-1 pr-3 h-9"
 >
 <Ionicons name="chevron-back" size={18} color={colors.primary} />
 <Text className="text-primary font-bold text-sm">All years</Text>
 </TouchableOpacity>
 )}
 <Text className="text-light-text text-xl font-extrabold mb-3">
 {studentYear.key === OTHER_YEAR ? 'Other classes' : studentYear.label}
 </Text>
 {termsHere.length > 1 && (
 <SegmentedControl
 options={termsHere.map((t) => ({
 key: t ?? 'none',
 label: t ? `${t} semester` : 'No semester',
 }))}
 value={activeTerm ?? 'none'}
 onChange={(key) => setPickedTerm(key === 'none' ? null : (key as Term))}
 />
 )}
 </View>
 )}

 {!isFaculty && filteredSubjects.length > 0 && (
 <SectionLabel className="px-5 mt-5">YOUR CLASSES</SectionLabel>
 )}
 </View>
 }
 ListEmptyComponent={
 showYearCards ? null :
 isFaculty && subjects.length > 0 ? (
 <View className="px-4">
 <EmptyState
 icon="search-outline"
 title="No subjects match"
 text={search ? `Nothing found for "${search.trim()}" with these filters.` : 'No subjects fit the filters you picked.'}
 action={
 <Button
 title="Clear filters"
 variant="outline"
 icon="close"
 onPress={() => { setChosenFilters(NO_FILTERS); setSearch(''); }}
 />
 }
 />
 </View>
 ) :
 studentYear ? (
 <View className="px-4">
 <EmptyState icon="book-outline" text={`No ${activeTerm ? activeTerm + ' semester ' : ''}classes in this year yet.`} />
 </View>
 ) :
 <View className="flex-1 justify-center px-4">
 <EmptyState
 icon={isFaculty ? 'school-outline' : 'book-outline'}
 title={isFaculty ? 'No subjects yet' : 'No classes yet'}
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
 renderItem={({ item: entry }) => entry.kind === 'header' ? (
 <SectionLabel className="px-5 mt-4 mb-3">
 {entry.label.toUpperCase()} · {entry.count}
 </SectionLabel>
 ) : (
 <View className="px-4">
 <SubjectCard
 subject={entry.subject}
 sessionActive={liveSubjectId === entry.subject.id}
 attendance={isStudent && history ? attendanceBySubject.get(entry.subject.id) ?? { present: 0, total: 0 } : undefined}
 onPress={() => router.push(`/subject/${entry.subject.id}` as any)}
 onStartSession={() => handleStartSessionPress(entry.subject)}
 />
 </View>
 )}
 />

 {/* Modals */}
 <ClassFilterSheet
 visible={showFilters}
 onClose={() => setShowFilters(false)}
 filters={filters}
 onChange={setChosenFilters}
 years={yearChoices(subjects)}
 counts={{ all: subjects.length, theory: categories[1].count, practical: categories[2].count }}
 />

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
