import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAttendanceHistory, getMySubjects, deleteSubjectHistory, getRecentSessions } from '../../services/attendance';
import { exportAttendanceData } from '../../services/analytics';
import { HistorySubjectCard } from '../../components/HistorySubjectCard';
import { ExportFilterModal } from '../../components/ExportFilterModal';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import type { SubjectHistory, Subject, RecentSession } from '../../types';
import { useRouter } from 'expo-router';

export default function HistoryScreen() {
  const queryClient = useQueryClient();
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
    if (!selectedCategory) return [];
    return subjects.filter(s => s.type === selectedCategory);
  }, [subjects, selectedCategory]);

  const deleteMutation = useMutation({
    mutationFn: deleteSubjectHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      Alert.alert('Success', 'Subject history cleared successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.error || 'Failed to delete history');
    }
  });

  const handleDeleteSubject = (subjectId: number) => {
    Alert.alert(
      'Delete History',
      'Are you sure you want to delete all attendance records for this subject? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteMutation.mutate(subjectId)
        }
      ]
    );
  };

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
      <View className="flex-1 bg-dark items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const renderHeader = () => (
    <View className="mb-6">
      <View className="flex-row justify-between items-center mb-6">
        <View>
          {isFaculty && selectedCategory ? (
            <TouchableOpacity onPress={() => setSelectedCategory(null)} className="flex-row items-center mb-2">
              <Ionicons name="chevron-back" size={20} color="#6366F1" />
              <Text className="text-primary font-bold ml-1">Back to Categories</Text>
            </TouchableOpacity>
          ) : null}
          <Text className="text-3xl font-bold text-white mb-1">
            {isFaculty ? (selectedCategory ? (selectedCategory === 'theory' ? 'Theory Reports' : 'Practical Reports') : 'Reports') : 'History'}
          </Text>
          <Text className="text-dark-muted text-base">
            {isFaculty ? (selectedCategory ? `Select a ${selectedCategory} subject to download analytics` : 'Subject analytics & classroom reports') : 'Your personal attendance records.'}
          </Text>
        </View>
      </View>

      {isFaculty && !selectedCategory && (
        <View>
          <View className="flex-row gap-4 mt-2 mb-8">
            <TouchableOpacity 
              onPress={() => setSelectedCategory('theory')}
              className="flex-1 bg-dark-card border border-dark-border p-8 rounded-3xl items-center shadow-md"
            >
              <View className="bg-primary/20 p-4 rounded-2xl mb-4">
                <Ionicons name="book-outline" size={32} color="#6366F1" />
              </View>
              <Text className="text-white font-bold text-lg">Theory</Text>
              <Text className="text-dark-muted text-xs mt-1">{subjects.filter(s => s.type === 'theory').length} Subjects</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setSelectedCategory('practical')}
              className="flex-1 bg-dark-card border border-dark-border p-8 rounded-3xl items-center shadow-md"
            >
              <View className="bg-success/20 p-4 rounded-2xl mb-4">
                <Ionicons name="flask-outline" size={32} color="#10B981" />
              </View>
              <Text className="text-white font-bold text-lg">Practical</Text>
              <Text className="text-dark-muted text-xs mt-1">{subjects.filter(s => s.type === 'practical').length} Subjects</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white font-bold text-xl">Recent Classes</Text>
            {recentSessions.length > 0 && (
              <Ionicons name="time-outline" size={20} color="#64748B" />
            )}
          </View>

          {recentSessions.length === 0 ? (
            <View className="bg-dark-card border border-dark-border p-8 rounded-3xl items-center mb-6">
              <Ionicons name="calendar-outline" size={48} color="#334155" className="mb-3" />
              <Text className="text-dark-muted text-base font-medium">No recent classes found</Text>
            </View>
          ) : (
            <View className="mb-6">
              {recentSessions.map((session) => (
                <TouchableOpacity 
                  key={session.id}
                  onPress={() => router.push(`/lecture-detail?id=${session.id}` as any)}
                  className="bg-dark-card border border-dark-border p-5 rounded-3xl mb-4 shadow-sm"
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2">
                        <View className={`px-2 py-0.5 rounded-md mr-2 ${session.subjectType === 'theory' ? 'bg-primary/20' : 'bg-success/20'}`}>
                          <Text className={`text-[10px] font-black uppercase ${session.subjectType === 'theory' ? 'text-primary' : 'text-success'}`}>
                            {session.subjectType}
                          </Text>
                        </View>
                        <Text className="text-dark-muted text-xs font-bold">
                          {new Date(session.startTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                        </Text>
                      </View>
                      <Text className="text-white font-black text-lg mb-1" numberOfLines={1}>{session.subjectName}</Text>
                      <Text className="text-dark-muted text-xs font-medium uppercase tracking-widest">{session.subjectCode}</Text>
                    </View>

                    <View className="items-end">
                      <View className="bg-dark p-2 px-3 rounded-2xl border border-dark-border">
                        <Text className="text-white font-black text-sm">
                          {session.presentCount}
                          <Text className="text-dark-muted text-[10px]"> / {session.totalEnrolled}</Text>
                        </Text>
                        <Text className="text-[9px] text-success font-bold text-center mt-0.5">PRESENT</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#475569" className="mt-2" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {isStudent && history.length > 0 && (
        <View className="flex-row justify-between mb-4">
          <View className="w-[48%] bg-dark-card p-4 rounded-3xl border border-dark-border shadow-sm">
            <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center mb-3">
              <Ionicons name="pie-chart" size={20} color="#6366F1" />
            </View>
            <Text className="text-white text-3xl font-black mb-1">{stats.percentage}%</Text>
            <Text className="text-dark-muted font-bold text-xs tracking-wider">OVERALL RATE</Text>
          </View>

          <View className="w-[48%] flex-col justify-between">
            <View className="bg-success/10 p-3 rounded-2xl border border-success/20 flex-row items-center mb-3 flex-1 px-4">
              <Ionicons name="checkmark-circle" size={18} color="#10B981" className="mr-3" />
              <View>
                <Text className="text-success font-bold text-lg">{stats.present}</Text>
                <Text className="text-success/70 text-xs font-bold uppercase">Present</Text>
              </View>
            </View>
            
            <View className="bg-danger/10 p-3 rounded-2xl border border-danger/20 flex-row items-center flex-1 px-4">
              <Ionicons name="close-circle" size={18} color="#EF4444" className="mr-3" />
              <View>
                <Text className="text-danger font-bold text-lg">{stats.missed}</Text>
                <Text className="text-danger/70 text-xs font-bold uppercase">Missed</Text>
              </View>
            </View>
          </View>
        </View>
      )}
      
      {isStudent && <Text className="text-white font-bold text-lg mt-4 mb-2">My Subjects</Text>}
    </View>
  );

  return (
    <View className="flex-1 bg-dark">
      <FlatList
        data={(isStudent ? history : filteredFacultySubjects) as any[]}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          isStudent ? (
            <View className="flex-1 items-center justify-center mt-10 p-6">
              <Ionicons name="document-text-outline" size={64} color="#334155" className="mb-4" />
              <Text className="text-dark-muted font-medium text-lg text-center">
                {isError 
                  ? 'Failed to load history' 
                  : 'No attendance records found yet.'}
              </Text>
            </View>
          ) : isFaculty && selectedCategory ? (
            <View className="flex-1 items-center justify-center mt-10 p-6">
              <Ionicons name="library-outline" size={64} color="#334155" className="mb-4" />
              <Text className="text-dark-muted font-medium text-lg text-center">
                No {selectedCategory} subjects assigned to you.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          if (isStudent) {
            return (
              <HistorySubjectCard 
                subject={item as SubjectHistory} 
                onDelete={handleDeleteSubject} 
              />
            );
          }
          
          const subject = item as unknown as Subject;
          return (
            <View className="bg-dark-card border border-dark-border p-5 rounded-3xl mb-4 shadow-sm">
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-white font-black text-lg mr-2">{subject.code}</Text>
                    <View className={`px-2 py-0.5 rounded-md ${subject.type === 'theory' ? 'bg-primary/20' : 'bg-success/20'}`}>
                      <Text className={`text-[10px] font-black uppercase ${subject.type === 'theory' ? 'text-primary' : 'text-success'}`}>
                        {subject.type}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-dark-muted font-medium text-sm" numberOfLines={1}>{subject.name}</Text>
                </View>
                
                <TouchableOpacity 
                  onPress={() => {
                    setInitialSubjectId(Number(subject.id));
                    setShowExportModal(true);
                  }}
                  className="bg-primary/10 border border-primary/20 px-4 py-3 rounded-2xl flex-row items-center"
                >
                  <Ionicons name="download" size={18} color="#6366F1" className="mr-2" />
                  <Text className="text-primary font-black text-sm">DOWNLOAD</Text>
                </TouchableOpacity>
              </View>
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
            Alert.alert('Export Failed', err.message || 'Could not generate report.');
          } finally {
            setIsExporting(false);
          }
        }}
      />
    </View>
  );
}
