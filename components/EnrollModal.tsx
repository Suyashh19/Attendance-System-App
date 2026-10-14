import React, { useState, memo } from 'react';
import { View, TextInput, Alert } from 'react-native';
import { Button } from './Button';
import { BottomSheet } from './BottomSheet';
import { enrollInSubject } from '../services/attendance';
import { getErrorMessage } from '../services/api';
import { colors, fonts } from '../constants/theme';

interface EnrollModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EnrollModal = memo(({ visible, onClose, onSuccess }: EnrollModalProps) => {
  const [enrollCode, setEnrollCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEnroll = async () => {
    if (!enrollCode.trim()) return;
    try {
      setLoading(true);
      await enrollInSubject(enrollCode.trim().toUpperCase());
      onSuccess();
      setEnrollCode('');
    } catch (err: any) {
      Alert.alert('Could not enroll', getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Enroll in a class"
      subtitle="Enter the subject code provided by your faculty."
    >
      <TextInput
        placeholder="e.g. IT101"
        placeholderTextColor={colors.subtle}
        selectionColor={colors.primary}
        className="h-16 px-4 rounded-2xl text-light-text mb-6 text-center text-2xl"
        style={{
          fontFamily: fonts.extrabold,
          letterSpacing: 4,
          borderWidth: 1.5,
          borderColor: focused ? colors.primary : colors.border,
          backgroundColor: focused ? colors.card : colors.bg,
        }}
        value={enrollCode}
        onChangeText={setEnrollCode}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <View className="flex-row">
        <Button title="Cancel" variant="outline" onPress={onClose} disabled={loading} className="flex-1 mr-3" />
        <Button
          title="Enroll"
          onPress={handleEnroll}
          className="flex-1"
          loading={loading}
          disabled={!enrollCode.trim()}
        />
      </View>
    </BottomSheet>
  );
});
