import React, { useState, memo } from 'react';
import { View, Alert } from 'react-native';
import { Button } from './Button';
import { Input } from './Input';
import { Text } from './Text';
import { BottomSheet } from './BottomSheet';
import { SegmentedControl } from './SegmentedControl';
import { createSubject } from '../services/attendance';
import { getErrorMessage } from '../services/api';

interface CreateSubjectModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (subjectType: 'theory' | 'practical') => void;
}

const TYPES = [
  { key: 'theory' as const, label: 'Theory', icon: 'book-outline' as const },
  { key: 'practical' as const, label: 'Practical', icon: 'flask-outline' as const },
];

export const CreateSubjectModal = memo(({ visible, onClose, onSuccess }: CreateSubjectModalProps) => {
  const [newSubject, setNewSubject] = useState({
    name: '',
    code: '',
    type: 'theory' as 'theory' | 'practical',
  });
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!newSubject.name.trim() || !newSubject.code.trim()) {
      Alert.alert('Missing details', 'Enter both a subject name and a subject code.');
      return;
    }
    try {
      setLoading(true);
      await createSubject(newSubject.name.trim(), newSubject.code.trim(), newSubject.type);
      onSuccess(newSubject.type);
      setNewSubject({ name: '', code: '', type: 'theory' });
    } catch (err: any) {
      Alert.alert('Could not create subject', getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="New subject"
      subtitle="Students enroll with the subject code you set here."
    >
      <Input
        label="Subject name"
        placeholder="e.g. Distributed Systems"
        icon="school-outline"
        value={newSubject.name}
        onChangeText={(t) => setNewSubject({ ...newSubject, name: t })}
      />
      <Input
        label="Subject code"
        placeholder="e.g. CS402"
        icon="pricetag-outline"
        value={newSubject.code}
        onChangeText={(t) => setNewSubject({ ...newSubject, code: t })}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      <Text className="text-light-text font-semibold mb-2 ml-1 text-[13px]">Type</Text>
      <SegmentedControl
        options={TYPES}
        value={newSubject.type}
        onChange={(type) => setNewSubject({ ...newSubject, type })}
        className="mb-6"
      />

      <View className="flex-row">
        <Button title="Cancel" variant="outline" onPress={onClose} disabled={loading} className="flex-1 mr-3" />
        <Button title="Create" onPress={handleCreate} className="flex-1" loading={loading} />
      </View>
    </BottomSheet>
  );
});
