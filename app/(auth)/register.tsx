import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useRouter } from 'expo-router';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { registerUser, loginUser } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import { useDeviceId } from '../../hooks/useDeviceId';
import { Ionicons } from '@expo/vector-icons';
import type { UserRole } from '../../types';

const registerSchema = z.object({
 name: z.string().min(2, 'Name is required'),
 email: z.string().email('Please enter a valid email address'),
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

export default function RegisterScreen() {
 const [loading, setLoading] = useState(false);
 const router = useRouter();
 const login = useAuthStore((s) => s.login);
 const deviceId = useDeviceId();

 const {
 control,
 handleSubmit,
 setValue,
 watch,
 formState: { errors },
 } = useForm<RegisterFormData>({
 resolver: zodResolver(registerSchema),
 defaultValues: {
 name: '',
 email: '',
 password: '',
 role: 'student',
 },
 });

 const selectedRole = watch('role');

 const onSubmit = async (data: RegisterFormData) => {
 if (!deviceId) {
 Alert.alert('Registration Failed', 'Unable to fetch device ID. Please restart the app and try again.');
 return;
 }

 try {
 setLoading(true);
 // 1. Register the user
 const registerRes = await registerUser({ ...data, deviceId });
 
 // 2. Since register doesn't return a token on this backend, 
 // we must log in manually to get the session token
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
 const msg = err.response?.data?.message || 'Failed to register. Please try again.';
 Alert.alert('Registration Failed', msg);
 } finally {
 setLoading(false);
 }
 };

 return (
 <KeyboardAvoidingView 
 className="flex-1 bg-light"
 behavior={Platform.OS === 'ios' ? 'padding' : undefined}
 >
 <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
 <View className="flex-1 justify-center px-6 py-12">
 
 <View className="mb-8">
 <Text className="text-3xl font-bold text-light-text mb-2">
 Create Account Let's get started.
 </Text>
 <Text className="text-light-muted text-base">
 Join the real-time attendance system.
 </Text>
 </View>

 <View className="bg-light-card shadow-sm p-6 rounded-3xl border border-light-border shadow-md">
 
 {/* Role Selector */}
 <View className="mb-6">
 <Text className="text-light-muted font-medium mb-2 ml-1 text-sm">I am a...</Text>
 <View className="flex-row justify-between">
 <TouchableOpacity
 activeOpacity={0.7}
 onPress={() => setValue('role', 'student')}
 className={`w-[48%] py-3 rounded-xl border flex-row items-center justify-center ${
 selectedRole === 'student' ? 'bg-primary/20 border-primary' : 'bg-transparent border-light-border'
 }`}
 >
 <Ionicons name="school" size={18} color={selectedRole === 'student' ? '#6366F1' : '#6B7280'} className="mr-2" />
 <Text className={`font-bold ${selectedRole === 'student' ? 'text-primary' : 'text-light-muted'}`}>
 Student
 </Text>
 </TouchableOpacity>

 <TouchableOpacity
 activeOpacity={0.7}
 onPress={() => setValue('role', 'faculty')}
 className={`w-[48%] py-3 rounded-xl border flex-row items-center justify-center ${
 selectedRole === 'faculty' ? 'bg-primary/20 border-primary' : 'bg-transparent border-light-border'
 }`}
 >
 <Ionicons name="briefcase" size={18} color={selectedRole === 'faculty' ? '#6366F1' : '#6B7280'} className="mr-2" />
 <Text className={`font-bold ${selectedRole === 'faculty' ? 'text-primary' : 'text-light-muted'}`}>
 Faculty
 </Text>
 </TouchableOpacity>
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
 </View>

 <View className="flex-row justify-center mt-8">
 <Text className="text-light-muted">Already have an account? </Text>
 <Link href="/(auth)/login" asChild>
 <Text className="text-primary font-bold">Sign In</Text>
 </Link>
 </View>

 </View>
 </ScrollView>
 </KeyboardAvoidingView>
 );
}
