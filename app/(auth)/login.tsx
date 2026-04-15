import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useRouter } from 'expo-router';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { loginUser } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import { useDeviceId } from '../../hooks/useDeviceId';
import { Ionicons } from '@expo/vector-icons';

const loginSchema = z.object({
 email: z.string().email('Please enter a valid email address'),
 password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
 const [loading, setLoading] = useState(false);
 const router = useRouter();
 const login = useAuthStore((s) => s.login);
 const deviceId = useDeviceId();

 const {
 control,
 handleSubmit,
 formState: { errors },
 } = useForm<LoginFormData>({
 resolver: zodResolver(loginSchema),
 defaultValues: {
 email: '',
 password: '',
 },
 });

 const onSubmit = async (data: LoginFormData) => {
 try {
 setLoading(true);
 const res = await loginUser({ email: data.email, password: data.password, deviceId: deviceId || undefined });
 
 // Zustand store login (saves token + sets auth state)
 await login(res.token, res.user);
 
 // Router will automatically redirect based on auth state in _layout.tsx
 // But we can be explicit here too
 router.replace('/(tabs)/home');
 
 } catch (err: any) {
 console.error(err);
 const msg = err.response?.data?.message || 'Failed to login. Please try again.';
 Alert.alert('Login Failed', msg);
 } finally {
 setLoading(false);
 }
 };

 return (
 <KeyboardAvoidingView 
 className="flex-1 bg-light"
 behavior="padding"
 >
 <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
 <View className="flex-1 justify-center px-6 py-12">
 
 <View className="items-center mb-10">
 <View className="w-20 h-20 bg-primary/20 rounded-full items-center justify-center mb-6">
 <Ionicons name="scan" size={40} color="#6366F1" />
 </View>
 <Text className="text-3xl font-bold text-light-text mb-2 text-center">
 Welcome Back
 </Text>
 <Text className="text-light-muted text-base text-center">
 Sign in to manage your attendance
 </Text>
 </View>

 <View className="bg-light-card shadow-sm p-6 rounded-3xl border border-light-border shadow-md">
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

 <Controller
 control={control}
 name="password"
 render={({ field: { onChange, onBlur, value } }) => (
 <Input
 label="Password"
 placeholder="Enter your password"
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
 title="Sign In"
 onPress={handleSubmit(onSubmit)}
 loading={loading}
 className="mt-6"
 />

 <View className="mt-4 items-center">
   <Link href="/(auth)/forgot-password" asChild>
     <TouchableOpacity p-2>
       <Text className="text-primary font-medium">Forgot Password?</Text>
     </TouchableOpacity>
   </Link>
 </View>
 </View>

 <View className="flex-row justify-center mt-8">
 <Text className="text-light-muted">Don't have an account? </Text>
 <Link href="/(auth)/register" asChild>
 <Text className="text-primary font-bold">Register here</Text>
 </Link>
 </View>

 </View>
 </ScrollView>
 </KeyboardAvoidingView>
 );
}
