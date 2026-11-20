import React, { useState, memo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { showAlert } from '../../store/dialogStore';
import { BottomSheet } from '../BottomSheet';
import { Input } from '../Input';
import { Button } from '../Button';
import { Text } from '../Text';
import { Ionicons } from '@expo/vector-icons';
import { addManualStudent } from '../../services/attendance';
import { getErrorMessage } from '../../services/api';
import { colors } from '../../constants/theme';

interface AddStudentModalProps {
  visible: boolean;
  subjectId: number;
  onClose: () => void;
  onSuccess: (studentName: string) => void;
}

export const AddStudentModal = memo(
  ({ visible, subjectId, onClose, onSuccess }: AddStudentModalProps) => {
    const [name, setName] = useState('');
    const [prn, setPrn] = useState('');
    const [email, setEmail] = useState('');
    const [platform, setPlatform] = useState<'ios' | 'android'>('ios');
    const [loading, setLoading] = useState(false);

    const reset = () => {
      setName('');
      setPrn('');
      setEmail('');
      setPlatform('ios');
      setLoading(false);
    };

    const handleClose = () => {
      reset();
      onClose();
    };

    const handleSubmit = async () => {
      const cleanName = name.trim();
      const cleanPrn = prn.trim();
      const cleanEmail = email.trim();

      if (!cleanName) {
        showAlert('Missing Name', 'Please enter the student’s full name.');
        return;
      }
      if (!cleanPrn) {
        showAlert('Missing PRN', 'Please enter the student’s PRN.');
        return;
      }
      if (!cleanEmail) {
        showAlert('Missing Email', 'Please enter the student’s email address.');
        return;
      }
      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        showAlert('Invalid Email', 'Please enter a valid email address.');
        return;
      }

      try {
        setLoading(true);
        await addManualStudent(subjectId, {
          name: cleanName,
          prn: cleanPrn,
          email: cleanEmail,
          platform,
        });

        showAlert(
          'Student Added',
          `${cleanName} (${platform === 'ios' ? 'iOS' : 'Android'}) was successfully enrolled into this subject.`
        );
        onSuccess(cleanName);
        handleClose();
      } catch (err: any) {
        showAlert('Could not add student', getErrorMessage(err, 'Something went wrong. Please check the details.'));
      } finally {
        setLoading(false);
      }
    };

    return (
      <BottomSheet
        visible={visible}
        onClose={handleClose}
        title="Add Student Manually"
        subtitle="Manually enroll an iPhone student or student without the Android app."
      >
        <View className="mb-4">
          {/* Platform Selector */}
          <Text className="text-light-text font-semibold mb-2 ml-1 text-[13px]">
            Student Device Platform
          </Text>
          <View className="flex-row bg-light-bg p-1 rounded-2xl mb-4 border border-light-border">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setPlatform('ios')}
              className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
                platform === 'ios' ? 'bg-primary' : 'bg-transparent'
              }`}
            >
              <Ionicons
                name="logo-apple"
                size={16}
                color={platform === 'ios' ? colors.white : colors.muted}
                style={{ marginRight: 6 }}
              />
              <Text
                className={`text-xs font-bold ${
                  platform === 'ios' ? 'text-white' : 'text-light-muted'
                }`}
              >
                iOS (iPhone)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setPlatform('android')}
              className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
                platform === 'android' ? 'bg-primary' : 'bg-transparent'
              }`}
            >
              <Ionicons
                name="logo-android"
                size={16}
                color={platform === 'android' ? colors.white : colors.muted}
                style={{ marginRight: 6 }}
              />
              <Text
                className={`text-xs font-bold ${
                  platform === 'android' ? 'text-white' : 'text-light-muted'
                }`}
              >
                Android
              </Text>
            </TouchableOpacity>
          </View>

          <Input
            label="Full Name"
            placeholder="e.g. Rahul Sharma"
            icon="person-outline"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Input
            label="PRN"
            placeholder="e.g. 2104012"
            icon="card-outline"
            value={prn}
            onChangeText={setPrn}
            autoCapitalize="characters"
          />

          <Input
            label="Email Address"
            placeholder="e.g. rahul@college.edu"
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Button
            title={loading ? 'Adding Student...' : 'Add Student to Class'}
            icon="person-add-outline"
            onPress={handleSubmit}
            loading={loading}
            className="mt-2"
          />
        </View>
      </BottomSheet>
    );
  }
);
