import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../store/dialogStore';
import { useAuthStore } from '../store/authStore';
import { requestPasswordChange, confirmPasswordChange, updateUserPassword } from '../services/auth';
import { getErrorMessage } from '../services/api';
import { maskEmail } from '../utils/maskEmail';
import { colors } from '../constants/theme';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Input } from './Input';
import { SettingsRow } from './SettingsRow';
import { Text } from './Text';

type Mode = 'password' | 'code';

const MIN_LENGTH = 6;

/**
 * "Update Password". It asks for the current password first. If that is forgotten or wrong,
 * the person can switch to a 6-digit code sent to their registered email instead.
 */
export function ChangePasswordRow({ divider = false }: { divider?: boolean }) {
  const user = useAuthStore((s) => s.user);

  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<Mode>('password');
  const [currentPassword, setCurrentPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  // Set when the server refuses the current password (wrong, or too many wrong tries)
  const [refused, setRefused] = useState<string | null>(null);

  const open = () => {
    setMode('password');
    setCurrentPassword('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setRefused(null);
    setVisible(true);
  };

  const finish = (message?: string) => {
    setVisible(false);
    setCurrentPassword('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setRefused(null);
    showAlert('Success', message || 'Password updated successfully.');
  };

  // What is wrong with the new password, if anything
  const newPasswordProblem = (): string | null => {
    if (!newPassword || !confirmPassword) return 'Enter and confirm your new password.';
    if (newPassword.length < MIN_LENGTH) return `New password must be at least ${MIN_LENGTH} characters.`;
    if (newPassword !== confirmPassword) return 'New passwords do not match.';
    return null;
  };

  const saveWithCurrentPassword = async () => {
    if (!currentPassword) {
      showAlert('Error', 'Enter your current password.');
      return;
    }
    const problem = newPasswordProblem();
    if (problem) {
      showAlert('Error', problem);
      return;
    }
    if (currentPassword === newPassword) {
      showAlert('Error', 'The new password must be different from your current one.');
      return;
    }

    try {
      setSaving(true);
      setRefused(null);
      const res = await updateUserPassword({ currentPassword, newPassword });
      finish(res?.message);
    } catch (err: any) {
      const message = getErrorMessage(err, 'Please try again.');
      // A wrong current password, or a lock after too many wrong tries: offer the email code
      if (err?.response?.status === 429 || /current password/i.test(message)) setRefused(message);
      else showAlert('Could not update password', message);
    } finally {
      setSaving(false);
    }
  };

  const askToSendCode = () => {
    showAlert(
      'Use an email code instead?',
      `We will email a 6-digit code to ${maskEmail(user?.email)} to confirm it is you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send code', onPress: () => sendCode(true) },
      ]
    );
  };

  const sendCode = async (switchToCode: boolean) => {
    try {
      setSending(true);
      await requestPasswordChange();
      setOtp('');
      if (switchToCode) {
        setCurrentPassword('');
        setRefused(null);
        setMode('code');
      } else {
        showAlert('Code Sent', `A new code is on its way to ${maskEmail(user?.email)}.`);
      }
    } catch (err: any) {
      showAlert('Could not send code', getErrorMessage(err, 'Please try again.'));
    } finally {
      setSending(false);
    }
  };

  const saveWithCode = async () => {
    if (otp.trim().length !== 6) {
      showAlert('Error', 'Enter the 6-digit code from your email.');
      return;
    }
    const problem = newPasswordProblem();
    if (problem) {
      showAlert('Error', problem);
      return;
    }

    try {
      setSaving(true);
      const res = await confirmPasswordChange({ otp: otp.trim(), newPassword });
      finish(res?.message);
    } catch (err: any) {
      showAlert('Could not update password', getErrorMessage(err, 'Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const newPasswordFields = (
    <>
      <Input label="New Password" secureTextEntry icon="key-outline" value={newPassword} onChangeText={setNewPassword} />
      <Input
        label="Confirm New Password"
        secureTextEntry
        icon="shield-checkmark-outline"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
      />
    </>
  );

  return (
    <>
      <SettingsRow
        icon="lock-closed"
        title="Update Password"
        subtitle="Change the password you sign in with"
        onPress={open}
        divider={divider}
      />

      <BottomSheet
        visible={visible}
        onClose={() => setVisible(false)}
        title="Update Password"
        subtitle={
          mode === 'password'
            ? 'Enter your current password, then choose a new one.'
            : `Enter the code we emailed to ${maskEmail(user?.email)}, then choose a new password.`
        }
      >
        {mode === 'password' ? (
          <>
            <Input
              label="Current Password"
              secureTextEntry
              icon="lock-closed-outline"
              value={currentPassword}
              onChangeText={(t) => {
                setCurrentPassword(t);
                if (refused) setRefused(null);
              }}
              autoCapitalize="none"
            />

            {refused ? (
              <View className="bg-danger-bg rounded-2xl px-4 py-3 mb-4">
                <View className="flex-row items-start">
                  <Ionicons name="alert-circle" size={16} color={colors.danger} style={{ marginRight: 8, marginTop: 1 }} />
                  <Text className="text-danger text-[13px] font-semibold flex-1">{refused}</Text>
                </View>
                <Button
                  title="Email me a code instead"
                  variant="outline"
                  size="sm"
                  icon="mail-outline"
                  onPress={askToSendCode}
                  loading={sending}
                  className="mt-3"
                />
              </View>
            ) : (
              <TouchableOpacity
                onPress={askToSendCode}
                disabled={sending}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                className="mt-[-8px] mb-4 self-end"
              >
                <Text className="text-primary font-semibold text-xs">
                  {sending ? 'Sending...' : 'Forgot your current password?'}
                </Text>
              </TouchableOpacity>
            )}

            {newPasswordFields}
            <Button title="Save Password" onPress={saveWithCurrentPassword} loading={saving} className="mt-2" />
          </>
        ) : (
          <>
            <Input
              label="6-digit code"
              placeholder="123456"
              icon="mail-outline"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, ''))}
            />
            <TouchableOpacity
              onPress={() => sendCode(false)}
              disabled={sending}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="mt-[-8px] mb-4 self-end"
            >
              <Text className="text-primary font-semibold text-xs">{sending ? 'Sending...' : 'Resend code'}</Text>
            </TouchableOpacity>

            {newPasswordFields}
            <Button title="Save Password" onPress={saveWithCode} loading={saving} className="mt-2" />
            <TouchableOpacity
              onPress={() => setMode('password')}
              className="mt-4 items-center p-2"
              accessibilityRole="button"
            >
              <Text className="text-light-muted font-semibold">I remember my current password</Text>
            </TouchableOpacity>
          </>
        )}
      </BottomSheet>
    </>
  );
}
