import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Ionicons } from '@expo/vector-icons';
import { useDeviceId } from '../../hooks/useDeviceId';
import { updatePrn, deleteAccount } from '../../services/auth';

export default function ProfileScreen() {
 const { user, logout, setUser } = useAuthStore();
 const deviceId = useDeviceId();
 const router = useRouter();
 
 const [prnInput, setPrnInput] = useState('');
 const [isUpdating, setIsUpdating] = useState(false);

 const handleLogout = () => {
 Alert.alert(
 'Sign Out',
 'Are you sure you want to sign out?',
 [
 { text: 'Cancel', style: 'cancel' },
 { 
 text: 'Sign Out', 
 style: 'destructive',
 onPress: async () => {
 await logout();
 router.replace('/(auth)/login');
 }
 },
 ]
 );
 };

 const handleUpdatePrn = async () => {
 if (!prnInput.trim()) {
 Alert.alert('Error', 'Please enter a valid PRN');
 return;
 }

 Alert.alert(
 'Confirm PRN',
 'PRN cannot be changed once saved. Please enter carefully. Do you want to save this PRN?',
 [
 { text: 'Cancel', style: 'cancel' },
 {
 text: 'Save',
 onPress: async () => {
 try {
 setIsUpdating(true);
 const updatedUser = await updatePrn(prnInput);
 setUser(updatedUser);
 Alert.alert('Success', 'PRN saved successfully and is now locked.');
 } catch (err: any) {
 const msg = err.response?.data?.error || 'Failed to update PRN';
 Alert.alert('Error', msg);
 } finally {
 setIsUpdating(false);
 }
 }
 }
 ]
 );
 };

 return (
 <ScrollView className="flex-1 bg-light" contentContainerStyle={{ padding: 16 }}>
 
 <View className="items-center py-8">
 <View className="w-24 h-24 bg-primary/20 rounded-full items-center justify-center mb-4 border-2 border-primary/30">
 <Text className="text-4xl font-bold text-primary">
 {user?.name?.charAt(0).toUpperCase() || 'U'}
 </Text>
 </View>
 <Text className="text-2xl font-bold text-light-text mb-1">{user?.name}</Text>
 <Text className="text-light-muted font-medium bg-light-card shadow-sm px-3 py-1 rounded-full border border-light-border mt-2 text-xs uppercase tracking-wider">
 {user?.role} Account
 </Text>
 </View>

 <View className="bg-light-card shadow-sm rounded-2xl border border-light-border overflow-hidden mb-6 ">
 
 <View className="p-4 border-b border-light-border flex-row items-center">
 <View className="w-10 h-10 rounded-full bg-[#F7F9FC] items-center justify-center mr-4">
 <Ionicons name="mail-outline" size={20} color="#6B7280" />
 </View>
 <View className="flex-1">
 <Text className="text-light-muted text-xs font-bold mb-1">EMAIL ADDRESS</Text>
 <Text className="text-light-text font-medium">{user?.email}</Text>
 </View>
 </View>

 {/* PRN Field - Only for Students */}
 {user?.role === 'student' && (
 <View className="p-4 border-b border-light-border">
 <View className="flex-row items-center">
 <View className="w-10 h-10 rounded-full bg-[#F7F9FC] items-center justify-center mr-4">
 <Ionicons name="id-card-outline" size={20} color={user.prn ? "#6366F1" : "#6B7280"} />
 </View>
 <View className="flex-1">
 <Text className={user.prn ?"text-primary text-xs font-bold mb-1" :"text-amber-500 text-xs font-bold mb-1"}>
 {user.prn ?"PERMANENT REGISTRATION NO. (PRN)" :"PRN REQUIRED"}
 </Text>
 
 {user.prn ? (
 <View className="flex-row items-center justify-between">
 <Text className="text-light-text font-bold text-lg">{user.prn}</Text>
 <View className="bg-primary/10 px-2 py-1 rounded-md flex-row items-center border border-primary/20">
 <Ionicons name="lock-closed" size={12} color="#6366F1" />
 <Text className="text-primary text-[10px] font-bold ml-1 uppercase">Locked</Text>
 </View>
 </View>
 ) : (
 <View className="mt-1">
 <Input
 placeholder="Enter PRN (one-time only)"
 value={prnInput}
 onChangeText={setPrnInput}
 keyboardType="numeric"
 className="mb-2"
 />
 <View className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 mb-3">
 <View className="flex-row items-center mb-1">
 <Ionicons name="warning-outline" size={14} color="#6B7280" />
 <Text className="text-amber-500 text-[11px] font-bold ml-1 uppercase">Immutable Field</Text>
 </View>
 <Text className="text-amber-500/80 text-[11px] leading-4">
 PRN cannot be changed once saved. Please enter carefully.
 </Text>
 </View>
 <Button
 title="Save & Lock PRN"
 onPress={handleUpdatePrn}
 loading={isUpdating}
 size="sm"
 />
 </View>
 )}
 </View>
 </View>
 </View>
 )}

 <View className="p-4 flex-row items-center">
 <View className="w-10 h-10 rounded-full bg-[#F7F9FC] items-center justify-center mr-4">
 <Ionicons name="hardware-chip-outline" size={20} color="#6366F1" />
 </View>
 <View className="flex-1">
 <Text className="text-primary text-xs font-bold mb-1">SECURE DEVICE ID</Text>
 <Text className="text-light-text font-medium text-xs font-mono" numberOfLines={1}>
 {deviceId || 'Loading...'}
 </Text>
 <Text className="text-light-muted flex-wrap text-xs mt-2">
 This ID binds your attendance to this physical device to prevent proxy fraud.
 </Text>
 </View>
 </View>

 </View>

 <Button
 title="Sign Out"
 variant="outline"
 icon="log-out-outline"
 onPress={handleLogout}
 className="mt-4"
 />

 <View className="mt-12 pt-8 border-t border-danger/10">
 <Text className="text-danger font-bold text-xs uppercase mb-3 ml-1 tracking-widest opacity-60">Success Zone</Text>
 <TouchableOpacity
 onPress={() => {
 Alert.alert(
 'DELETE ACCOUNT?',
 'This will permanently delete your PRN, attendance records, and profile. THIS ACTION CANNOT BE UNDONE.',
 [
 { text: 'Cancel', style: 'cancel' },
 { 
 text: 'DELETE PERMANENTLY', 
 style: 'destructive',
 onPress: async () => {
 try {
 await deleteAccount();
 await logout();
 router.replace('/(auth)/login');
 Alert.alert('Account Deleted', 'Your data has been removed from our servers.');
 } catch (err: any) {
 Alert.alert('Error', err.response?.data?.error || 'Failed to delete account');
 }
 }
 }
 ]
 );
 }}
 className="bg-danger/5 border border-danger/20 p-4 rounded-2xl flex-row items-center justify-between"
 >
 <View className="flex-row items-center">
 <View className="bg-danger/20 p-2 rounded-lg mr-4">
 <Ionicons name="trash-outline" size={18} color="#1A1D1F" />
 </View>
 <View>
 <Text className="text-danger font-bold">Delete Account</Text>
 <Text className="text-danger/50 text-[10px] uppercase font-black tracking-tighter">Permanent Wipe</Text>
 </View>
 </View>
 <Ionicons name="chevron-forward" size={16} color="#1A1D1F" opacity={0.5} />
 </TouchableOpacity>
 </View>
 
 <Text className="text-center text-light-muted text-xs mt-8">
 Attendance System v1.0.0
 </Text>

 </ScrollView>
 );
}
