import React, { useState, useMemo } from 'react';
import { View, FlatList, RefreshControl, TouchableOpacity, TextInput } from 'react-native';
import { showAlert } from '../../store/dialogStore';
import { useQuery } from '@tanstack/react-query';
import { getAttendanceHistory, getMySubjects, getRecentSessions } from '../../services/attendance';
import { exportAttendanceData } from '../../services/analytics';
import { HistorySubjectCard } from '../../components/HistorySubjectCard';
import { ExportFilterModal } from '../../components/ExportFilterModal';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import type { SubjectHistory, Subject, RecentSession } from '../../types';
import { useRouter } from 'expo-router';
import { colors, MIN_ATTENDANCE_PERCENT } from '../../constants/theme';
import { semesterSpanLabel } from '../../utils/attendanceCalendar';
import {
  ALL_TIME,
  NO_LIST_FILTERS,
  applyStudentFilters,
  buildStudentList,
  defaultScope,
  inScope,
  isBelowMinimum,
  listFilterCount,
  scopeOptions,
  studentListSummary,
  summarizeHistory,
  type StudentListFilters,
} from '../../utils/historyView';
import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { AttendanceCalendar } from '../../components/AttendanceCalendar';
import { AttendanceFilterSheet } from '../../components/AttendanceFilterSheet';
import { LeaveEntryCard } from '../../components/LeaveEntryCard';
import { SemesterSwitcher, type SemesterItem } from '../../components/SemesterSwitcher';
import { ClassFilterSheet } from '../../components/ClassFilterSheet';
import { SearchFilterBar } from '../../components/SearchFilterBar';
import { ProgressRing } from '../../components/ProgressRing';
import { TabHeader } from '../../components/ScreenHeader';
import { EmptyState, SectionLabel } from '../../components/EmptyState';
import { SegmentedControl } from '../../components/SegmentedControl';
import { TabSkeleton } from '../../components/Skeleton';
import {
  NO_FILTERS,
  activeFilterCount,
  applyClassFilters,
  buildClassList,
  defaultFilters,
  filterSummary,
  yearChoices,
  type ClassEntry,
  type ClassFilters,
} from '../../utils/classesView';
import {
  applyRecentFilters,
  groupSessionsByDate,

  recentSummary,
  type RecentEntry,
} from '../../utils/recentView';

export default function HistoryScreen() {
 const router = useRouter();
 const user = useAuthStore((s) => s.user);
 const isStudent = user?.role === 'student';
 const isFaculty = user?.role === 'faculty';

 const { data: history = [], isLoading: historyLoading, isError, refetch: refetchHistory } = useQuery({
 queryKey: ['history'],
 queryFn: getAttendanceHistory,
 enabled: isStudent,
 });
 
 const { data: recentSessions = [], isLoading: recentLoading, refetch: refetchRecent } = useQuery({
 queryKey: ['recent-sessions'],
 queryFn: () => getRecentSessions(),
 enabled: isFaculty,
 });

 const refetch = isStudent ? refetchHistory : refetchRecent;

 const [showExportModal, setShowExportModal] = useState(false);
 const [isExporting, setIsExporting] = useState(false);
 const [initialSubjectId, setInitialSubjectId] = useState<number | undefined>(undefined);
 const [facultyTab, setFacultyTab] = useState<'reports' | 'recent'>('reports');
 const [query, setQuery] = useState('');
 const [recentQuery, setRecentQuery] = useState('');
 const [recentFilters, setRecentFilters] = useState<ClassFilters>(NO_FILTERS);
 // null = not touched yet, so the list opens on the running academic year and term
 const [chosenFilters, setChosenFilters] = useState<ClassFilters | null>(null);
 const [showFilters, setShowFilters] = useState(false);

 const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
 queryKey: ['subjects'],
 queryFn: getMySubjects,
 enabled: isFaculty || isStudent,
 });

 // Students also wait for their subjects, which say which semester each belongs to
 const isLoading = isStudent ? historyLoading || subjectsLoading : recentLoading;

 const filters = useMemo(() => chosenFilters ?? defaultFilters(subjects), [chosenFilters, subjects]);
 const filterCount = activeFilterCount(filters);

 const filteredFacultySubjects = useMemo(
 () => applyClassFilters(subjects, filters, query),
 [subjects, filters, query]
 );
 const reportEntries = useMemo(() => buildClassList(filteredFacultySubjects, null), [filteredFacultySubjects]);
 const clearReportFilters = () => { setChosenFilters(NO_FILTERS); setQuery(''); };

 // The newest 10 until something is typed or filtered, then every fetched class that matches
 const spanBySubject = useMemo(() => new Map(subjects.map((s) => [Number(s.id), s.span])), [subjects]);
 const visibleRecent = useMemo(
 () => applyRecentFilters(recentSessions, recentFilters, recentQuery, spanBySubject),
 [recentSessions, recentFilters, recentQuery, spanBySubject]
 );
 const recentEntries = useMemo(() => groupSessionsByDate(visibleRecent), [visibleRecent]);
 const recentFilterCount = activeFilterCount(recentFilters);
 const clearRecentFilters = () => { setRecentFilters(NO_FILTERS); setRecentQuery(''); };
 const recentSubject = subjects.find((s) => Number(s.id) === recentFilters.subjectId);

 // Student: which semester the page is about. Untouched = the running one (or their newest).
 const [chosenScope, setChosenScope] = useState<string | null>(null);
 const spanById = useMemo(() => new Map(subjects.map((s) => [Number(s.id), s.span])), [subjects]);
 const scopeOpts = useMemo(() => scopeOptions(history, spanById), [history, spanById]);
 const scope = chosenScope && (chosenScope === ALL_TIME || scopeOpts.some((o) => o.key === chosenScope))
 ? chosenScope
 : defaultScope(scopeOpts);
 const scopedHistory = useMemo(() => inScope(history, scope, spanById), [history, scope, spanById]);
 const summary = useMemo(() => summarizeHistory(scopedHistory), [scopedHistory]);
 // Search, type and standing narrow the subject list only; the summary and calendar stay about the whole semester
 const [listQuery, setListQuery] = useState('');
 const [listFilters, setListFilters] = useState<StudentListFilters>(NO_LIST_FILTERS);
 const [showListFilters, setShowListFilters] = useState(false);
 const listFilteredHistory = useMemo(
 () => applyStudentFilters(scopedHistory, listFilters, listQuery),
 [scopedHistory, listFilters, listQuery]
 );
 const studentEntries = useMemo(() => buildStudentList(listFilteredHistory), [listFilteredHistory]);
 const listFilterTotal = listFilterCount(listFilters);
 const clearListFilters = () => { setListFilters(NO_LIST_FILTERS); setListQuery(''); };
 const listCounts = useMemo(() => ({
 all: scopedHistory.length,
 theory: scopedHistory.filter((s) => s.type === 'theory').length,
 practical: scopedHistory.filter((s) => s.type === 'practical').length,
 below: scopedHistory.filter((s) => isBelowMinimum(s.stats.PRESENT, s.stats.total)).length,
 ok: scopedHistory.filter((s) => s.stats.total > 0 && !isBelowMinimum(s.stats.PRESENT, s.stats.total)).length,
 }), [scopedHistory]);
 // One entry per semester for the switcher, each with how the student did in it
 const semesterItems = useMemo<SemesterItem[]>(
 () => scopeOpts.map((o) => {
 const subjectsHere = inScope(history, o.key, spanById);
 const sum = summarizeHistory(subjectsHere);
 return {
 key: o.key,
 label: o.label,
 dates: semesterSpanLabel(o.key) ?? 'No academic year set',
 subjects: subjectsHere.length,
 percent: sum.percent,
 belowCount: sum.belowCount,
 };
 }),
 [scopeOpts, history, spanById]
 );
 const allTimeItem = useMemo<SemesterItem>(() => {
 const sum = summarizeHistory(history);
 return { key: ALL_TIME, label: 'All time', dates: 'Every semester', subjects: history.length, percent: sum.percent, belowCount: sum.belowCount };
 }, [history]);
 const scopeLabel = scope === ALL_TIME ? 'ALL TIME' : (scopeOpts.find((o) => o.key === scope)?.label ?? '').toUpperCase();
 const hasClasses = summary.total > 0;
 const hasBelow = summary.belowCount > 0;
 const overallTone = !hasClasses ? colors.subtle : hasBelow ? colors.danger : colors.success;

 // Called as a plain function (not used as <Component />) so the input stays mounted while typing
 const renderSearchBox = (value: string, onChange: (text: string) => void, placeholder: string) => (
 <View className="flex-row items-center rounded-2xl px-4 h-12 mb-4 bg-light-card border border-light-border">
 <Ionicons name="search" size={18} color={colors.subtle} style={{ marginRight: 10 }} />
 <TextInput
 value={value}
 onChangeText={onChange}
 placeholder={placeholder}
 placeholderTextColor={colors.subtle}
 selectionColor={colors.primary}
 autoCapitalize="none"
 autoCorrect={false}
 returnKeyType="search"
 className="flex-1 text-light-text font-medium text-[15px] h-full"
 />
 {value.length > 0 && (
 <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Clear search">
 <Ionicons name="close-circle" size={18} color={colors.subtle} />
 </TouchableOpacity>
 )}
 </View>
 );

 const renderHeader = () => (
 <View className="mb-1">
 <TabHeader
 eyebrow={isFaculty ? 'ATTENDANCE REPORTS' : 'YOUR RECORD'}
 title={isFaculty ? 'Reports' : 'Attendance'}
 />

 <View className="px-4 pt-5">
 {isFaculty && (
 <View>
 <SegmentedControl
 options={[
 { key: 'reports', label: 'Download reports', icon: 'download-outline' },
 { key: 'recent', label: 'Recent classes', icon: 'time-outline' },
 ]}
 value={facultyTab}
 onChange={setFacultyTab}
 className="mb-4"
 />

 {facultyTab === 'reports' && subjects.length > 0 && (
 <View className="mb-1">
 <SearchFilterBar
 value={query}
 onChangeText={setQuery}
 placeholder="Search by subject name or code"
 filterCount={filterCount}
 onOpenFilters={() => setShowFilters(true)}
 summary={filterSummary(filteredFacultySubjects.length, filters)}
 onShowAll={clearReportFilters}
 />
 </View>
 )}

 {facultyTab === 'recent' && recentSessions.length > 0 && (
 <View className="mb-1">
 <SearchFilterBar
 value={recentQuery}
 onChangeText={setRecentQuery}
 placeholder="Search by subject or date, e.g. 12 oct"
 filterCount={recentFilterCount}
 onOpenFilters={() => setShowFilters(true)}
 summary={recentSummary(visibleRecent.length, recentFilters, recentQuery, recentSubject?.name)}
 onShowAll={clearRecentFilters}
 />
 </View>
 )}
 </View>
 )}

 {isStudent && history.length > 0 && (
 <View>
 <SemesterSwitcher items={semesterItems} allItem={allTimeItem} scope={scope} onChange={setChosenScope} />

 <Card className="p-5 mb-6">
 <SectionLabel>{scopeLabel ? `ATTENDANCE · ${scopeLabel}` : 'ATTENDANCE'}</SectionLabel>
 <View className="flex-row items-center mt-4">
 <ProgressRing percent={summary.percent ?? 0} size={108} strokeWidth={11} color={overallTone}>
 <Text className="text-[26px] font-extrabold" style={{ color: overallTone }}>
 {summary.percent !== null ? `${summary.percent}%` : '--'}
 </Text>
 </ProgressRing>
 <View className="flex-1 ml-5">
 <View className={`self-start flex-row items-center px-2.5 h-7 rounded-full mb-2 ${!hasClasses ? 'bg-light' : hasBelow ? 'bg-danger-bg' : 'bg-success-bg'}`}>
 <Ionicons
 name={!hasClasses ? 'time-outline' : hasBelow ? 'alert-circle' : 'checkmark-circle'}
 size={14}
 color={overallTone}
 style={{ marginRight: 5 }}
 />
 <Text className="text-[11px] font-bold" style={{ color: overallTone }}>
 {!hasClasses
 ? 'No classes yet'
 : hasBelow
 ? `${summary.belowCount} ${summary.belowCount === 1 ? 'subject' : 'subjects'} below ${MIN_ATTENDANCE_PERCENT}%`
 : 'All subjects on track'}
 </Text>
 </View>
 <Text className="text-light-text font-bold text-base">
 {summary.present} of {summary.total} classes
 </Text>
 {summary.excused > 0 && (
 <Text className="text-xs font-semibold mt-0.5" style={{ color: colors.info }}>
 {summary.excused} excused on leave
 </Text>
 )}
 {summary.weakest ? (
 <Text className="text-light-muted text-xs font-medium mt-1" numberOfLines={2}>
 Lowest: {summary.weakest.name}, {summary.weakest.percent}%
 </Text>
 ) : summary.tightest ? (
 <Text className="text-light-muted text-xs font-medium mt-1" numberOfLines={2}>
 {summary.tightest.canMiss > 0
 ? `Closest to the limit: ${summary.tightest.name}, can miss ${summary.tightest.canMiss} more`
 : `Closest to the limit: ${summary.tightest.name}. Don't miss the next class.`}
 </Text>
 ) : (
 <Text className="text-light-muted text-xs font-medium mt-1">Minimum required: {MIN_ATTENDANCE_PERCENT}%</Text>
 )}
 </View>
 </View>

 {summary.byType.theory && summary.byType.practical && (
 <View className="mt-5">
 {([['Theory', summary.byType.theory], ['Practical', summary.byType.practical]] as const).map(([label, b], i) => {
 const low = (b.percent ?? 0) < MIN_ATTENDANCE_PERCENT;
 return (
 <View key={label} className={i > 0 ? 'mt-3' : ''}>
 <View className="flex-row justify-between mb-1.5">
 <Text className="text-light-text text-xs font-bold">{label}</Text>
 <Text className="text-xs font-bold" style={{ color: low ? colors.danger : colors.success }}>
 {b.percent}% · {b.present}/{b.total}
 </Text>
 </View>
 <View className="h-2 rounded-full bg-light-border overflow-hidden">
 <View className="h-full rounded-full" style={{ width: `${b.percent ?? 0}%`, backgroundColor: low ? colors.danger : colors.success }} />
 </View>
 </View>
 );
 })}
 </View>
 )}

 <View className="flex-row mt-5">
 <View className="flex-1 bg-success-bg rounded-2xl p-3 mr-3 flex-row items-center">
 <View className="w-9 h-9 rounded-xl bg-white items-center justify-center mr-3">
 <Ionicons name="checkmark-circle" size={20} color={colors.success} />
 </View>
 <View>
 <Text className="text-success font-extrabold text-lg">{summary.present}</Text>
 <Text className="text-success text-xs font-semibold">Present</Text>
 </View>
 </View>
 <View className="flex-1 bg-danger-bg rounded-2xl p-3 flex-row items-center">
 <View className="w-9 h-9 rounded-xl bg-white items-center justify-center mr-3">
 <Ionicons name="close-circle" size={20} color={colors.danger} />
 </View>
 <View>
 <Text className="text-danger font-extrabold text-lg">{summary.missed}</Text>
 <Text className="text-danger text-xs font-semibold">Missed</Text>
 </View>
 </View>
 </View>
 </Card>

 <AttendanceCalendar key={scope} subjects={scopedHistory} scope={scope} />

 <LeaveEntryCard />

 <SearchFilterBar
 value={listQuery}
 onChangeText={setListQuery}
 placeholder="Search your subjects"
 filterCount={listFilterTotal}
 onOpenFilters={() => setShowListFilters(true)}
 summary={studentListSummary(listFilteredHistory.length, listFilters)}
 onShowAll={clearListFilters}
 />
 </View>
 )}
 </View>
 </View>
 );

 const renderRecentItem = (session: RecentSession) => {
 const start = new Date(session.startTime);
 return (
 <View className="px-4">
 <TouchableOpacity
 activeOpacity={0.85}
 onPress={() => router.push(`/lecture-detail?id=${session.id}` as any)}
 >
 <Card className="p-4 mb-3 flex-row items-center">
 <View className="w-12 h-14 rounded-2xl bg-light-primaryBg items-center justify-center mr-3">
 <Text className="text-primary text-[10px] font-bold uppercase tracking-wide">
 {start.toLocaleString('en-US', { month: 'short' })}
 </Text>
 <Text className="text-primary text-lg font-extrabold">{start.getDate()}</Text>
 </View>

 <View className="flex-1 mr-3">
 <Text className="text-light-text font-bold text-base" numberOfLines={1}>{session.subjectName}</Text>
 <Text className="text-light-muted text-xs font-medium mt-1" numberOfLines={1}>
 {session.subjectCode} · {session.subjectType === 'theory' ? 'Theory' : 'Practical'} · {start.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
 </Text>
 </View>

 <View className="items-end mr-2">
 <Text className="text-light-text font-extrabold text-base">
 {session.presentCount}
 <Text className="text-light-muted text-xs font-semibold"> / {session.totalEnrolled}</Text>
 </Text>
 <Text className="text-success text-[11px] font-bold">Present</Text>
 </View>
 <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
 </Card>
 </TouchableOpacity>
 </View>
 );
 };

 return (
 <View className="flex-1 bg-light">
 <FlatList
 data={(isStudent ? studentEntries : facultyTab === 'recent' ? recentEntries : reportEntries) as any[]}
 keyExtractor={(item) => (item.kind === 'header' ? `header-${item.key}` : item.kind === 'subject' ? String(item.subject.id) : item.kind === 'session' ? String(item.session.id) : String(item.id))}
 contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
 showsVerticalScrollIndicator={false}
 keyboardShouldPersistTaps="handled"
 refreshControl={
 <RefreshControl
 refreshing={isLoading}
 onRefresh={refetch}
 tintColor={colors.primary}
 colors={[colors.primary]}
 />
 }
 ListHeaderComponent={renderHeader()}
 ListEmptyComponent={
 isStudent && history.length > 0 && !isError ? (
 <View className="px-4">
 <EmptyState
 icon="search-outline"
 title="No subjects match"
 text={listQuery.trim() ? `Nothing found for "${listQuery.trim()}" with these filters.` : 'No subjects fit the filters you picked.'}
 action={<Button title="Clear filters" variant="outline" icon="close" onPress={clearListFilters} />}
 />
 </View>
 ) : isStudent ? (
 <View className="flex-1 justify-center px-4">
 <EmptyState
 icon={isError ? 'cloud-offline-outline' : 'document-text-outline'}
 tone={isError ? 'danger' : 'primary'}
 title={isError ? 'Could not load your history' : 'No attendance yet'}
 text={isError
 ? 'Pull down to try again.'
 : 'Your record for each subject appears here after your first class.'}
 />
 </View>
 ) : (
 <View className="px-4">
 <Card className="p-6 items-center">
 <View className="w-14 h-14 rounded-full bg-light items-center justify-center">
 <Ionicons name={facultyTab === 'recent' ? 'calendar-outline' : 'library-outline'} size={26} color={colors.subtle} />
 </View>
 <Text className="text-light-muted text-sm font-medium mt-3 text-center">
 {facultyTab === 'recent'
 ? recentSessions.length > 0
 ? 'No classes match your search or filters.'
 : 'Classes you take attendance for will appear here.'
 : subjects.length === 0
 ? 'Create a subject to download its report.'
 : query.trim()
 ? 'No subjects match your search.'
 : 'No subjects fit the filters you picked.'}
 </Text>
 </Card>
 </View>
 )
 }
 renderItem={({ item }) => {
 if (isStudent) {
 const entry = item as unknown as ClassEntry<SubjectHistory>;
 if (entry.kind === 'header') {
 return (
 <SectionLabel className="px-5 mt-2 mb-3">
 {entry.label.toUpperCase()} · {entry.count}
 </SectionLabel>
 );
 }
 return (
 <View className="px-4">
 <HistorySubjectCard subject={entry.subject} />
 </View>
 );
 }

 if (facultyTab === 'recent') {
 const entry = item as unknown as RecentEntry<RecentSession>;
 if (entry.kind === 'header') {
 return (
 <SectionLabel className="px-5 mt-2 mb-3">
 {entry.label.toUpperCase()} · {entry.count}
 </SectionLabel>
 );
 }
 return renderRecentItem(entry.session);
 }

 const entry = item as unknown as ClassEntry<Subject>;
 if (entry.kind === 'header') {
 return (
 <SectionLabel className="px-5 mt-2 mb-3">
 {entry.label.toUpperCase()} · {entry.count}
 </SectionLabel>
 );
 }
 const subject = entry.subject;
 const isPractical = subject.type === 'practical';
 return (
 <View className="px-4">
 <Card className="p-4 mb-3 flex-row items-center">
 <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-3 ${isPractical ? 'bg-gold-bg' : 'bg-light-primaryBg'}`}>
 <Ionicons
 name={isPractical ? 'flask' : 'book'}
 size={20}
 color={isPractical ? colors.gold : colors.primary}
 />
 </View>
 <View className="flex-1 mr-3">
 <Text className="text-light-text font-bold text-base" numberOfLines={1}>{subject.name}</Text>
 <Text className="text-light-muted text-xs font-medium mt-1">
 {subject.code} · {subject.type === 'theory' ? 'Theory' : 'Practical'}{subject.span ? ` · ${subject.span}` : ''}
 </Text>
 </View>

 <TouchableOpacity
 onPress={() => {
 setInitialSubjectId(Number(subject.id));
 setShowExportModal(true);
 }}
 activeOpacity={0.85}
 accessibilityRole="button"
 accessibilityLabel={`Download report for ${subject.name}`}
 className="bg-light-primaryBg h-11 px-4 rounded-full flex-row items-center"
 >
 <Ionicons name="download-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
 <Text className="text-primary font-bold text-sm">Excel</Text>
 </TouchableOpacity>
 </Card>
 </View>
 );
 }}
 />

 <AttendanceFilterSheet
 visible={showListFilters}
 onClose={() => setShowListFilters(false)}
 filters={listFilters}
 onChange={setListFilters}
 counts={listCounts}
 />

 <ClassFilterSheet
 visible={showFilters}
 onClose={() => setShowFilters(false)}
 filters={facultyTab === 'recent' ? recentFilters : filters}
 onChange={facultyTab === 'recent' ? setRecentFilters : setChosenFilters}
 years={yearChoices(subjects)}
 subjects={facultyTab === 'recent' ? subjects : undefined}
 counts={facultyTab === 'recent'
 ? {
 all: recentSessions.length,
 theory: recentSessions.filter((s) => s.subjectType === 'theory').length,
 practical: recentSessions.filter((s) => s.subjectType === 'practical').length,
 }
 : {
 all: subjects.length,
 theory: subjects.filter((s) => s.type === 'theory').length,
 practical: subjects.filter((s) => s.type === 'practical').length,
 }}
 />

 <ExportFilterModal
 visible={showExportModal}
 onClose={() => setShowExportModal(false)}
 subjects={subjects}
 initialSubjectId={initialSubjectId}
 loading={isExporting}
 onConfirm={async (filters) => {
 try {
 setIsExporting(true);
 await exportAttendanceData(filters.subjectId, {
 startDate: filters.startDate,
 endDate: filters.endDate,
 });
 setShowExportModal(false);
 } catch (err: any) {
 showAlert('Export Failed', 'Could not generate the report. Check your connection and try again.');
 } finally {
 setIsExporting(false);
 }
 }}
 />
 </View>
 );
}
