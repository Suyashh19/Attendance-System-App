import React, { useState } from 'react';
import { View, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SubjectHistory } from '../types';
import { colors, classesNeeded } from '../constants/theme';
import { classesCanMiss, isBelowMinimum } from '../utils/historyView';
import { Text } from './Text';
import { Card } from './Card';
import { ProgressRing } from './ProgressRing';
import { StatusPill } from './StatusPill';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HistorySubjectCardProps {
  subject: SubjectHistory;
}

export function HistorySubjectCard({ subject }: HistorySubjectCardProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(date);
    } catch {
      return 'Invalid Date';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    } catch {
      return '--:--';
    }
  };

  const held = subject.stats.total > 0;
  const percentage = held ? Math.round((subject.stats.PRESENT / subject.stats.total) * 100) : 0;
  const below = isBelowMinimum(subject.stats.PRESENT, subject.stats.total);
  const canMiss = classesCanMiss(subject.stats.PRESENT, subject.stats.total);
  // No class held yet is neutral, not a failing 0%
  const tone = !held ? colors.subtle : below ? colors.danger : canMiss === 0 ? colors.warning : colors.success;
  const guidance = !held
    ? 'No classes held yet'
    : below
      ? `Attend the next ${classesNeeded(subject.stats.PRESENT, subject.stats.total)} to recover`
      : canMiss === 0
        ? "Don't miss the next class"
        : `Can miss ${canMiss} more`;
  const isTheory = subject.type === 'theory';

  return (
    <Card className="mb-3 overflow-hidden">
      {/* Header / Subject Summary */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={toggleExpand}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        className="p-4 flex-row items-center"
      >
        <ProgressRing percent={percentage} size={56} strokeWidth={6} color={tone}>
          <Text className="text-[12px] font-extrabold" style={{ color: tone }}>{held ? `${percentage}%` : '--'}</Text>
        </ProgressRing>

        <View className="flex-1 ml-3 mr-2">
          <Text className="text-light-text font-bold text-[16px]" numberOfLines={1}>
            {subject.name}
          </Text>
          <View className="flex-row items-center mt-1">
            <View className="bg-light px-2 py-0.5 rounded-md mr-2">
              <Text className="text-light-muted text-[11px] font-bold tracking-wide">{subject.code}</Text>
            </View>
            <View className={`px-2 py-0.5 rounded-md ${isTheory ? 'bg-light-primaryBg' : 'bg-gold-bg'}`}>
              <Text className={`text-[10px] font-bold uppercase ${isTheory ? 'text-primary' : 'text-gold'}`}>
                {subject.type}
              </Text>
            </View>
          </View>
          <Text className="text-xs font-bold mt-1.5" style={{ color: tone }}>
            {guidance}
          </Text>
        </View>

        <View className="items-end mr-2">
          <Text className="text-light-text font-extrabold text-lg">
            {subject.stats.PRESENT}
            <Text className="text-light-muted text-sm font-semibold">/{subject.stats.total}</Text>
          </Text>
          <Text className="text-light-muted text-[10px] font-bold uppercase tracking-wide">Sessions</Text>
        </View>
        <View className="w-8 h-8 rounded-full bg-light items-center justify-center">
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      {expanded && (
        <View className="px-4 pb-2 border-t border-light-border bg-light/60">
          {subject.records.map((record, index) => (
            <View
              key={record.id || index}
              className={`flex-row items-center justify-between py-3 ${index !== subject.records.length - 1 ? 'border-b border-light-border' : ''}`}
            >
              <View className="flex-row items-center">
                <View className={`w-2.5 h-2.5 rounded-full mr-3 ${record.status === 'PRESENT' ? 'bg-success' : record.status === 'ABSENT' ? 'bg-danger' : record.status === 'EXCUSED' ? 'bg-info' : 'bg-warning'}`} />
                <View>
                  <Text className="text-light-text font-bold text-sm">{formatDate(record.date)}</Text>
                  <Text className="text-light-muted text-xs font-medium mt-0.5">{formatTime(record.date)}</Text>
                </View>
              </View>

              <StatusPill status={record.status} />
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}
