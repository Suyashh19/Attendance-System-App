import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { showAlert } from '../../store/dialogStore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useRouter } from 'expo-router';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { AuthShell } from '../../components/AuthShell';
import { Text } from '../../components/Text';
import { registerUser, loginUser, sendSignupOtp, verifySignupOtp } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import { useDeviceId } from '../../hooks/useDeviceId';
import { Ionicons } from '@expo/vector-icons';
import type { UserRole } from '../../types';
import { colors } from '../../constants/theme';

const registerSchema = z.object({
 name: z.string().min(2, 'Name is required'),
 email: z.string().email('Please enter a valid email address'),
 otp: z.string().min(6, 'OTP must be 6 digits').max(6),
 password: z.string().min(6, 'Password must be at least 6 characters'),
 role: z.enum(['student', 'faculty'] as const),
 prn: z.string().optional(),
}).refine((data) => {
 if (data.role === 'student' && (!data.prn || data.prn.trim() === '')) {
 return false;
 }
 return true;
}, {
 message: 'PRN is required for students',
 path: ['prn'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const STEPS = ['email', 'otp', 'details'] as const;
const STEP_LABELS = { email: 'Your email', otp: 'Verify code', details: 'Your profile' };

const ROLES = [
 { value: 'student' as const, label: 'Student', icon: 'school' as const },
 { value: 'faculty' as const, label: 'Faculty', icon: 'briefcase' as const },
];

export default function RegisterScreen() {
 const [step, setStep] = useState<'email' | 'otp' | 'details'>('email');
 const [loading, setLoading] = useState(false);
 const [cooldown, setCooldown] = useState(0);
 
 const router = useRouter();
 const login = useAuthStore((s) => s.login);
 const deviceId = useDeviceId();

 const {
 control,
 handleSubmit,
 setValue,
 getValues,
 trigger,
 watch,
 formState: { errors },
 } = useForm<RegisterFormData>({
 resolver: zodResolver(registerSchema),
 defaultValues: {
 name: '',
 email: '',
 otp: '',
 password: '',
 role: 'student',
 },
 });

 const selectedRole = watch('role');

 useEffect(() => {
   let timer: NodeJS.Timeout;
   if (cooldown > 0) {
     timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
   }
   return () => clearTimeout(timer);
 }, [cooldown]);

 const onSendOtp = async () => {
   const isEmailValid = await trigger('email');
   if (!isEmailValid) return;

   try {
     setLoading(true);
     await sendSignupOtp(getValues('email'));
     setStep('otp');
     setCooldown(30);
   } catch (err: any) {
     const msg = err.response?.data?.error || 'Failed to send OTP. Please try again.';
     showAlert('Error', msg);
   } finally {
     setLoading(false);
   }
 };

 const onVerifyOtp = async () => {
   const isOtpValid = await trigger('otp');
   if (!isOtpValid) return;

   try {
     setLoading(true);
     await verifySignupOtp(getValues('email'), getValues('otp'));
     setStep('details');
   } catch (err: any) {
     const msg = err.response?.data?.error || 'Invalid or expired OTP.';
     showAlert('Verification Failed', msg);
   } finally {
     setLoading(false);
   }
 };

 const onSubmit = async (data: RegisterFormData) => {
 if (!deviceId) {
 showAlert('Registration Failed', 'Unable to fetch device ID. Please restart the app and try again.');
 return;
 }

 try {
 setLoading(true);
 // 1. Register the user
 const registerRes = await registerUser({ ...data, deviceId });
 
 // 2. Log in manually
 const loginRes = await loginUser({ 
 email: data.email, 
 password: data.password,
 deviceId: deviceId || undefined
 });
 
 // 3. Save session and redirect
 await login(loginRes.token, loginRes.user || registerRes);
 router.replace('/(tabs)/home');
 
 } catch (err: any) {
 console.error(err);
 const msg = err.response?.data?.error || 'Failed to register. Please try again.';
 showAlert('Registration Failed', msg);
 } finally {
 setLoading(false);
 }
 };

 return (
 <AuthShell
      title="Create account"
      subtitle={
        step === 'email'
          ? "Let's verify your email first"
          : step === 'otp'
            ? 'Enter the code sent to your email'
            : 'Complete your profile'
      }
      footer={
        <View className="flex-row justify-center mt-6">
          <Text className="text-light-muted">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Text className="text-primary font-bold">Sign In</Text>
          </Link>
        </View>
      }
    >
      {/* Progress through the three steps */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-primary text-xs font-bold tracking-widest">
          STEP {STEPS.indexOf(step) + 1} OF {STEPS.length}
        </Text>
        <Text className="text-light-muted text-xs font-semibold">{STEP_LABELS[step]}</Text>
      </View>
      <View className="flex-row mb-6">
        {STEPS.map((s, i) => (
          <View
            key={s}
            className={`flex-1 h-1.5 rounded-full ${i > 0 ? 'ml-2' : ''} ${i <= STEPS.indexOf(step) ? 'bg-primary' : 'bg-light-border'}`}
          />
        ))}
      </View>

 {step === 'email' && (
   <>
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
     />
     )}
     />
     <Button
     title="Send OTP"
     onPress={onSendOtp}
     loading={loading}
     className="mt-4"
     />
   </>
 )}

 {step === 'otp' && (
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
     <Button
     title="Verify OTP"
     onPress={onVerifyOtp}
     loading={loading}
     className="mt-4"
     />
     <TouchableOpacity 
       className="mt-4 items-center p-2" 
       onPress={onSendOtp}
       disabled={cooldown > 0 || loading}
     >
       <Text className={`font-semibold ${cooldown > 0 ? "text-light-muted" : "text-primary"}`}>
         {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
       </Text>
     </TouchableOpacity>
   </>
 )}

 {step === 'details' && (
   <>
   {/* Role Selector */}
   <View className="mb-5">
   <Text className="text-light-text font-semibold mb-2 ml-1 text-[13px]">I am a...</Text>
   <View className="flex-row">
   {ROLES.map(({ value, label, icon }, i) => {
   const selected = selectedRole === value;
   return (
   <TouchableOpacity
   key={value}
   activeOpacity={0.8}
   onPress={() => setValue('role', value)}
   accessibilityRole="button"
   accessibilityState={{ selected }}
   className={`flex-1 p-4 rounded-2xl items-center ${i > 0 ? 'ml-3' : ''}`}
   style={{
   borderWidth: 1.5,
   borderColor: selected ? colors.primary : colors.border,
   backgroundColor: selected ? colors.primaryBg : colors.bg,
   }}
   >
   <View className={`w-11 h-11 rounded-full items-center justify-center mb-2 ${selected ? 'bg-primary' : 'bg-light-card'}`}>
   <Ionicons name={icon} size={20} color={selected ? colors.white : colors.muted} />
   </View>
   <Text className={`font-bold ${selected ? 'text-primary' : 'text-light-muted'}`}>{label}</Text>
   </TouchableOpacity>
   );
   })}
   </View>
   </View>

   <Controller
   control={control}
   name="name"
   render={({ field: { onChange, onBlur, value } }) => (
   <Input
   label="Full Name"
   placeholder="John Doe"
   icon="person-outline"
   onBlur={onBlur}
   onChangeText={onChange}
   value={value}
   error={errors.name?.message}
   />
   )}
   />

   {selectedRole === 'student' && (
   <Controller
   control={control}
   name="prn"
   render={({ field: { onChange, onBlur, value } }) => (
   <Input
   label="PRN (Permanent Reg. No.)"
   placeholder="e.g. 1032210001"
   keyboardType="numeric"
   icon="id-card-outline"
   onBlur={onBlur}
   onChangeText={onChange}
   value={value || ''}
   error={errors.prn?.message}
   />
   )}
   />
   )}

   <Controller
   control={control}
   name="password"
   render={({ field: { onChange, onBlur, value } }) => (
   <Input
   label="Password"
   placeholder="Min 6 characters"
   secureTextEntry
   icon="lock-closed-outline"
   onBlur={onBlur}
   onChangeText={onChange}
   value={value}
   error={errors.password?.message}
   />
   )}
   />

   <Button
   title="Create Account"
   onPress={handleSubmit(onSubmit)}
   loading={loading}
   className="mt-4"
   />
   </>
 )}
 </AuthShell>
  );
}
