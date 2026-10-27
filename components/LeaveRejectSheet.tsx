import React, { useEffect, useState } from 'react';
import { View, TextInput } from 'react-native';
import { colors } from '../constants/theme';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Text } from './Text';

const MAX_NOTE_LENGTH = 200;

interface LeaveRejectSheetProps {
  visible: boolean;
  studentName: string;
  onClose: () => void;
  /** Called with the note, which may be empty */
  onConfirm: (note: string) => void;
}

/** Rejecting a leave request: an optional note the student will see. */
export function LeaveRejectSheet({ visible, studentName, onClose, onConfirm }: LeaveRejectSheetProps) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) setNote('');
  }, [visible]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Not approving this leave"
      subtitle={`${studentName} will be told. A short note helps them understand.`}
    >
      <Text className="text-light-muted font-bold text-xs tracking-widest mb-2">NOTE (OPTIONAL)</Text>
      <View className="bg-light rounded-2xl border border-light-border px-4 py-3 mb-1">
        <TextInput
          value={note}
          onChangeText={(t) => setNote(t.slice(0, MAX_NOTE_LENGTH))}
          placeholder="e.g. Please bring a medical certificate"
          placeholderTextColor={colors.subtle}
          selectionColor={colors.primary}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          className="text-light-text font-medium text-[15px]"
          style={{ minHeight: 70 }}
        />
      </View>
      <Text className="text-light-subtle text-[11px] font-medium text-right mb-4">
        {note.length}/{MAX_NOTE_LENGTH}
      </Text>

      <View className="flex-row">
        <Button title="Cancel" variant="outline" onPress={onClose} className="flex-1 mr-3" />
        <Button title="Reject" variant="danger" onPress={() => onConfirm(note.trim())} className="flex-1" />
      </View>
    </BottomSheet>
  );
}
