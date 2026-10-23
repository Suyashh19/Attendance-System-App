import React, { useState } from 'react';
import { View } from 'react-native';
import { showAlert } from '../../store/dialogStore';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useRouter } from 'expo-router';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { AuthShell } from '../../components/AuthShell';
import { Text } from '../../components/Text';
import { forgotPassword, resetPassword } from '../../services/auth';

const step1Schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const step2Schema = step1Schema.extend({
  otp: z.string().min(6, 'OTP must be 6 digits').max(6),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof step2Schema>;

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: (step === 'email' ? zodResolver(step1Schema) : zodResolver(step2Schema)) as Resolver<FormData>,
    defaultValues: { email: '', otp: '', newPassword: '' },
  });

  const onSendOtp = async (data: any) => {
    try {
      setLoading(true);
      const res = await forgotPassword(data.email);
      showAlert('OTP Sent', res.message || 'Check your email for the OTP.');
      setStep('reset');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to send OTP.';
      showAlert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const onResetPassword = async (data: FormData) => {
    try {
      setLoading(true);
      await resetPassword({
        email: data.email,
        otp: data.otp,
        newPassword: data.newPassword,
      });
      showAlert('Success', 'Password has been reset successfully.', [
        { text: 'Login', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to reset password.';
      showAlert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle={
        step === 'email'
          ? 'Enter your email to receive a code'
          : 'Enter the code from your email and a new password'
      }
      footer={
        <View className="flex-row justify-center mt-6">
          <Link href="/(auth)/login" asChild>
            <Text className="text-primary font-bold">Back to Login</Text>
          </Link>
        </View>
      }
    >
            
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email Address"
                  placeholder="name@university.edu"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon="mail-outline"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.email?.message}
                  editable={step === 'email'}
                />
              )}
            />

            {step === 'email' ? (
              <Button
                title="Send Code"
                onPress={handleSubmit(onSendOtp)}
                loading={loading}
                className="mt-4"
              />
            ) : (
              <>
                <Controller
                  control={control}
                  name="otp"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Enter OTP"
                      placeholder="6-digit code"
                      keyboardType="numeric"
                      icon="keypad-outline"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={errors.otp?.message}
                    />
                  )}
                />
                
                <Controller
                  control={control}
                  name="newPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="New Password"
                      placeholder="Min 6 characters"
                      secureTextEntry
                      icon="lock-closed-outline"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={errors.newPassword?.message}
                    />
                  )}
                />

                <Button
                  title="Reset Password"
                  onPress={handleSubmit(onResetPassword)}
                  loading={loading}
                  className="mt-4"
                />
              </>
            )}
          </AuthShell>
  );
}
