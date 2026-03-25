import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import type { Subject } from '../types';

interface SchedulingModalProps {
  visible: boolean;
  subject: Subject | null;
  onClose: () => void;
  onConfirm: (date: string, startTime: string, endTime: string) => void;
  loading?: boolean;
}

export function SchedulingModal({ 
  visible, 
  subject, 
  onClose, 
  onConfirm,
  loading 
}: SchedulingModalProps) {
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(Date.now() + 60 * 60 * 1000)); // +1 hour

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const handleConfirm = () => {
    if (endTime <= startTime) {
      Alert.alert('Invalid Time', 'End time must be after start time.');
      return;
    }
    onConfirm(formatDate(date), formatTime(startTime), formatTime(endTime));
  };

  if (!subject) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View className="flex-1 bg-black/70 justify-center p-6">
        <View className="bg-dark-card rounded-3xl p-6 border border-dark-border shadow-2xl">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-white text-xl font-bold">Schedule Lecture</Text>
              <Text className="text-dark-muted font-medium">{subject.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2 bg-dark rounded-full">
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          <View className="mb-4">
            <Text className="text-dark-muted text-xs font-bold uppercase mb-2 ml-1">Date</Text>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              className="bg-dark p-4 rounded-xl flex-row items-center border border-dark-border"
            >
              <Ionicons name="calendar-outline" size={20} color="#6366F1" className="mr-3" />
              <Text className="text-white text-base">{formatDate(date)}</Text>
            </TouchableOpacity>
          </View>

          {/* Time Range */}
          <View className="flex-row space-x-4 mb-8">
            <View className="flex-1">
              <Text className="text-dark-muted text-xs font-bold uppercase mb-2 ml-1">Start Time</Text>
              <TouchableOpacity 
                onPress={() => setShowStartTimePicker(true)}
                className="bg-dark p-4 rounded-xl flex-row items-center border border-dark-border"
              >
                <Ionicons name="time-outline" size={20} color="#6366F1" className="mr-3" />
                <Text className="text-white text-base">{formatTime(startTime)}</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-1">
              <Text className="text-dark-muted text-xs font-bold uppercase mb-2 ml-1">End Time</Text>
              <TouchableOpacity 
                onPress={() => setShowEndTimePicker(true)}
                className="bg-dark p-4 rounded-xl flex-row items-center border border-dark-border"
              >
                <Ionicons name="time-outline" size={20} color="#6366F1" className="mr-3" />
                <Text className="text-white text-base">{formatTime(endTime)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Button 
            title="Start Attendance Session" 
            onPress={handleConfirm} 
            loading={loading}
            className="w-full"
          />

          {/* Native Pickers */}
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          {showStartTimePicker && (
            <DateTimePicker
              value={startTime}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                setShowStartTimePicker(false);
                if (selectedTime) setStartTime(selectedTime);
              }}
            />
          )}

          {showEndTimePicker && (
            <DateTimePicker
              value={endTime}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                setShowEndTimePicker(false);
                if (selectedTime) setEndTime(selectedTime);
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
