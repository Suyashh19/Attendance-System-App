import React, { useState, useMemo } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
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
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { ProgressRing } from '../../components/ProgressRing';
import { TabHeader } from '../../components/ScreenHeader';
import { EmptyState, SectionLabel } from '../../components/EmptyState';

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
 queryFn: getRecentSessions,
 enabled: isFaculty,
 });

 const isLoading = isStudent ? historyLoading : recentLoading;
 const refetch = isStudent ? refetchHistory : refetchRecent;

 const [showExportModal, setShowExportModal] = useState(false);
 const [isExporting, setIsExporting] = useState(false);
 const [selectedCategory, setSelectedCategory] = useState<'theory' | 'practical' | null>(null);
 const [initialSubjectId, setInitialSubjectId] = useState<number | undefined>(undefined);

 const { data: subjects = [] } = useQuery({
 queryKey: ['subjects'],
 queryFn: getMySubjects,
 enabled: isFaculty,
 });

 const filteredFacultySubjects = useMemo(() => {
 if (!selectedCategory) return subjects;
 return subjects.filter(s => s.type === selectedCategory);
 }, [subjects, selectedCategory]);

 // Stats calculation (Overall)
 const stats = useMemo(() => {
 if (!history.length) return { present: 0, missed: 0, percentage: 0 };
 
 let totalPresent = 0;
 let totalSessions = 0;
 
 history.forEach(s => {
 totalPresent += s.stats.PRESENT;
 totalSessions += s.stats.total;
 });
 
 return {
 present: totalPresent,
 missed: totalSessions - totalPresent,
 percentage: totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0
 };
 }, [history]);

 if (isLoading && (isStudent || (isFaculty && !subjects.length))) {
 return (
 <View className="flex-1 bg-light items-center justify-center">
 <ActivityIndicator size="large" color={colors.primary} />
 </View>
 );
 }

 const categories: { key: 'theory' | 'practical' | null; label: string; count: number }[] = [
 { key: null, label: 'All', count: subjects.length },
 { key: 'theory', label: 'Theory', count: subjects.filter((s) => s.type === 'theory').length },
 { key: 'practical', label: 'Practical', count: subjects.filter((s) => s.type === 'practical').length },
 ];

 const onTrack = stats.percentage >= MIN_ATTENDANCE_PERCENT;
 const overallTone = onTrack ? colors.success : colors.danger;

 const renderHeader = () => (
 <View className="mb-1">
 <TabHeader
 eyebrow={isFaculty ? 'ATTENDANCE REPORTS' : 'YOUR RECORD'}
 title={isFaculty ? 'Reports' : 'History'}
 />

 <View className="px-4 pt-5">
 {isFaculty && (
 <View>
 <SectionLabel className="mb-3 ml-1">RECENT CLASSES</SectionLabel>

 {recentSessions.length === 0 ? (
 <Card className="p-6 items-center mb-6">
 <View className="w-14 h-14 rounded-full bg-light items-center justify-center">
 <Ionicons name="calendar-outline" size={26} color={colors.subtle} />
 </View>
 <Text className="text-light-muted text-sm font-medium mt-3 text-center">
 Classes you take attendance for will appear here.
 </Text>
 </Card>
 ) : (
 <View className="mb-3">
 {recentSessions.map((session) => {
 const start = new Date(session.startTime);
 return (
 <TouchableOpacity
 key={session.id}
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
 );
 })}
 </View>
 )}

 <SectionLabel className="mb-3 ml-1">DOWNLOAD REPORTS</SectionLabel>
 {subjects.length > 0 && (
 <View className="flex-row mb-4">
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
 </View>
 )}

 {isStudent && history.length > 0 && (
 <View>
 <Card className="p-5 mb-6">
 <SectionLabel>OVERALL ATTENDANCE</SectionLabel>
 <View className="flex-row items-center mt-4">
 <ProgressRing percent={stats.percentage} size={108} strokeWidth={11} color={overallTone}>
 <Text className="text-[26px] font-extrabold" style={{ color: overallTone }}>
 {stats.percentage}%
 </Text>
 </ProgressRing>
 <View className="flex-1 ml-5">
 <View className={`self-start flex-row items-center px-2.5 h-7 rounded-full mb-2 ${onTrack ? 'bg-success-bg' : 'bg-danger-bg'}`}>
 <Ionicons
 name={onTrack ? 'trending-up' : 'trending-down'}
 size={14}
 color={overallTone}
 style={{ marginRight: 5 }}
 />
 <Text className="text-[11px] font-bold" style={{ color: overallTone }}>
 {onTrack ? 'On track' : 'Needs attention'}
 </Text>
 </View>
 <Text className="text-light-text font-bold text-base">
 {stats.present} of {stats.present + stats.missed} classes
 </Text>
 <Text className="text-light-muted text-xs font-medium mt-1">Minimum required: {MIN_ATTENDANCE_PERCENT}%</Text>
 </View>
 </View>

 <View className="flex-row mt-5">
 <View className="flex-1 bg-success-bg rounded-2xl p-3 mr-3 flex-row items-center">
 <View className="w-9 h-9 rounded-xl bg-white items-center justify-center mr-3">
 <Ionicons name="checkmark-circle" size={20} color={colors.success} />
 </View>
 <View>
 <Text className="text-success font-extrabold text-lg">{stats.present}</Text>
 <Text className="text-success text-xs font-semibold">Present</Text>
 </View>
 </View>
 <View className="flex-1 bg-danger-bg rounded-2xl p-3 flex-row items-center">
 <View className="w-9 h-9 rounded-xl bg-white items-center justify-center mr-3">
 <Ionicons name="close-circle" size={20} color={colors.danger} />
 </View>
 <View>
 <Text className="text-danger font-extrabold text-lg">{stats.missed}</Text>
 <Text className="text-danger text-xs font-semibold">Missed</Text>
 </View>
 </View>
 </View>
 </Card>

 <SectionLabel className="mb-3 ml-1">BY SUBJECT</SectionLabel>
 </View>
 )}
 </View>
 </View>
 );

 return (
 <View className="flex-1 bg-light">
 <FlatList
 data={(isStudent ? history : filteredFacultySubjects) as any[]}
 keyExtractor={(item) => String(item.id)}
 contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
 showsVerticalScrollIndicator={false}
 refreshControl={
 <RefreshControl
 refreshing={isLoading}
 onRefresh={refetch}
 tintColor={colors.primary}
 colors={[colors.primary]}
 />
 }
 ListHeaderComponent={renderHeader}
 ListEmptyComponent={
 isStudent ? (
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
 <Ionicons name="library-outline" size={26} color={colors.subtle} />
 </View>
 <Text className="text-light-muted text-sm font-medium mt-3 text-center">
 {selectedCategory ? `You have no ${selectedCategory} subjects.` : 'Create a subject to download its report.'}
 </Text>
 </Card>
 </View>
 )
 }
 renderItem={({ item }) => {
 if (isStudent) {
 return (
 <View className="px-4">
 <HistorySubjectCard subject={item as SubjectHistory} />
 </View>
 );
 }

 const subject = item as unknown as Subject;
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
 {subject.code} · {subject.type === 'theory' ? 'Theory' : 'Practical'}
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
 Alert.alert('Export Failed', 'Could not generate the report. Check your connection and try again.');
 } finally {
 setIsExporting(false);
 }
 }}
 />
 </View>
 );
}
