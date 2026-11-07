import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getMySubjects } from '../../services/attendance';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../constants/theme';
import { ScreenHeader } from '../../components/ScreenHeader';
import { EmptyState } from '../../components/EmptyState';
import { ListSkeleton } from '../../components/Skeleton';
import { FacultySubjectView } from '../../components/subject/FacultySubjectView';
import { StudentSubjectView } from '../../components/subject/StudentSubjectView';

// One subject's page. Faculty manage the class here; students see their own record.
export default function SubjectScreen() {
  const { id } = useLocalSearchParams();
  const subjectId = Number(id);
  const user = useAuthStore((s) => s.user);

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: getMySubjects,
  });
  const subject = subjects.find((s) => s.id === subjectId);

  if (!subject) {
    return (
      <View className="flex-1 bg-light">
        <ScreenHeader title="Subject" />
        {isLoading ? (
          <ListSkeleton />
        ) : (
          <View className="flex-1 items-center justify-center p-6">
            <EmptyState icon="alert-circle-outline" text="This subject is no longer available." />
          </View>
        )}
      </View>
    );
  }

  return user?.role === 'faculty'
    ? <FacultySubjectView subject={subject} />
    : <StudentSubjectView subject={subject} />;
}
