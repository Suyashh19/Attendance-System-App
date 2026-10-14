import React, { useState } from 'react';
import { View, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Ionicons } from '@expo/vector-icons';
import { useDeviceId } from '../../hooks/useDeviceId';
import { updatePrn, deleteAccount, updateUserPassword, requestDeviceChange, confirmDeviceChange } from '../../services/auth';
import { getErrorMessage } from '../../services/api';
import { colors } from '../../constants/theme';
import { Text } from '../../components/Text';
import { Hero } from '../../components/Hero';
import { Card } from '../../components/Card';
import { BottomSheet } from '../../components/BottomSheet';
import { SectionLabel } from '../../components/EmptyState';

export default function ProfileScreen() {
 const { user, logout, setUser } = useAuthStore();
 const deviceId = useDeviceId();
 const router = useRouter();
 const insets = useSafeAreaInsets();
 
 const [prnInput, setPrnInput] = useState('');
 const [isUpdating, setIsUpdating] = useState(false);

 // Password Modal State
 const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
 const [currentPassword, setCurrentPassword] = useState('');
 const [newPassword, setNewPassword] = useState('');
 const [confirmPassword, setConfirmPassword] = useState('');
 const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

 // Device Change State
 const [isDeviceModalVisible, setDeviceModalVisible] = useState(false);
 const [deviceOtp, setDeviceOtp] = useState('');
 const [isRequestingDeviceOtp, setIsRequestingDeviceOtp] = useState(false);
 const [isConfirmingDevice, setIsConfirmingDevice] = useState(false);

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

 // A student who changed or reset their phone is still bound to the old device ID
 const isOnDifferentDevice =
 user?.role === 'student' && !!user.deviceId && !!deviceId && user.deviceId !== deviceId;

 const handleRequestDeviceChange = async () => {
 try {
 setIsRequestingDeviceOtp(true);
 await requestDeviceChange();
 setDeviceOtp('');
 setDeviceModalVisible(true);
 } catch (err: any) {
 Alert.alert('Could not send code', getErrorMessage(err, 'Please try again.'));
 } finally {
 setIsRequestingDeviceOtp(false);
 }
 };

 const handleConfirmDeviceChange = async () => {
 if (!user || !deviceId) return;
 if (deviceOtp.trim().length !== 6) {
 Alert.alert('Error', 'Enter the 6-digit code from your email.');
 return;
 }

 try {
 setIsConfirmingDevice(true);
 const res = await confirmDeviceChange({ otp: deviceOtp.trim(), deviceId });
 setUser({ ...user, deviceId: res.user?.deviceId ?? deviceId });
 setDeviceModalVisible(false);
 setDeviceOtp('');
 Alert.alert('Phone Linked', 'You can now mark attendance from this phone.');
 } catch (err: any) {
 Alert.alert('Could not link phone', getErrorMessage(err, 'Please try again.'));
 } finally {
 setIsConfirmingDevice(false);
 }
 };

 const handleUpdatePassword = async () => {
   if (!currentPassword || !newPassword || !confirmPassword) {
     Alert.alert('Error', 'All fields are required.');
     return;
   }
   if (newPassword.length < 6) {
     Alert.alert('Error', 'New password must be at least 6 characters.');
     return;
   }
   if (newPassword !== confirmPassword) {
     Alert.alert('Error', 'New passwords do not match.');
     return;
   }

   try {
     setIsUpdatingPassword(true);
     const res = await updateUserPassword({ currentPassword, newPassword });
     Alert.alert('Success', res.message || 'Password updated successfully.');
     setPasswordModalVisible(false);
     setCurrentPassword('');
     setNewPassword('');
     setConfirmPassword('');
   } catch (err: any) {
     const msg = err.response?.data?.error || 'Failed to update password.';
     Alert.alert('Error', msg);
   } finally {
     setIsUpdatingPassword(false);
   }
 };

 const confirmDeleteAccount = () => {
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
 };

 return (
 <ScrollView
 className="flex-1 bg-light"
 contentContainerStyle={{ paddingBottom: 40 }}
 showsVerticalScrollIndicator={false}
 >

 {/* Gradient banner with the avatar */}
 <Hero className="px-5 pb-16 items-center" style={{ paddingTop: insets.top + 24 }}>
 <View className="w-[100px] h-[100px] rounded-full border-2 border-gold items-center justify-center mb-4">
 <View className="w-[86px] h-[86px] bg-white/15 rounded-full items-center justify-center">
 <Text className="text-4xl font-extrabold text-white">
 {user?.name?.charAt(0).toUpperCase() || 'U'}
 </Text>
 </View>
 </View>
 <Text className="text-2xl font-extrabold text-white" numberOfLines={1}>{user?.name}</Text>
 <View className="bg-white/10 border border-white/15 px-3 h-7 rounded-full mt-2 flex-row items-center">
 <Ionicons
 name={user?.role === 'faculty' ? 'briefcase' : 'school'}
 size={12}
 color={colors.white}
 style={{ marginRight: 6 }}
 />
 <Text className="text-white text-[11px] font-bold uppercase tracking-widest">
 {user?.role} account
 </Text>
 </View>
 </Hero>

 <View className="px-4 -mt-10">
 <Card className="overflow-hidden mb-6">

 <View className="p-4 border-b border-light-border flex-row items-center">
 <View className="w-11 h-11 rounded-2xl bg-light-primaryBg items-center justify-center mr-4">
 <Ionicons name="mail" size={20} color={colors.primary} />
 </View>
 <View className="flex-1">
 <Text className="text-light-muted text-[11px] font-bold tracking-widest mb-1">EMAIL ADDRESS</Text>
 <Text className="text-light-text font-semibold text-[15px]" numberOfLines={1}>{user?.email}</Text>
 </View>
 </View>

 {/* PRN Field - Only for Students */}
 {user?.role === 'student' && (
 <View className="p-4 border-b border-light-border">
 <View className="flex-row items-start">
 <View className={`w-11 h-11 rounded-2xl items-center justify-center mr-4 ${user.prn ? 'bg-light-primaryBg' : 'bg-warning-bg'}`}>
 <Ionicons name="id-card" size={20} color={user.prn ? colors.primary : colors.warning} />
 </View>
 <View className="flex-1">
 <Text className={user.prn ? "text-light-muted text-[11px] font-bold tracking-widest mb-1" : "text-warning text-[11px] font-bold tracking-widest mb-1"}>
 {user.prn ? "PERMANENT REGISTRATION NO. (PRN)" : "PRN REQUIRED"}
 </Text>

 {user.prn ? (
 <View className="flex-row items-center justify-between">
 <Text className="text-light-text font-extrabold text-lg">{user.prn}</Text>
 <View className="bg-light-primaryBg px-2.5 h-7 rounded-full flex-row items-center">
 <Ionicons name="lock-closed" size={12} color={colors.primary} />
 <Text className="text-primary text-[10px] font-bold ml-1 uppercase tracking-wide">Locked</Text>
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
 <View className="bg-warning-bg p-3 rounded-2xl mb-3">
 <View className="flex-row items-center mb-1">
 <Ionicons name="warning-outline" size={14} color={colors.warning} />
 <Text className="text-warning text-[11px] font-bold ml-1 uppercase">Immutable Field</Text>
 </View>
 <Text className="text-warning text-[11px] leading-4">
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

 <View className="p-4 flex-row items-start">
 <View className="w-11 h-11 rounded-2xl bg-light-primaryBg items-center justify-center mr-4">
 <Ionicons name="hardware-chip" size={20} color={colors.primary} />
 </View>
 <View className="flex-1">
 <Text className="text-light-muted text-[11px] font-bold tracking-widest mb-1">SECURE DEVICE ID</Text>
 <Text className="text-light-text font-mono text-xs" numberOfLines={1}>
 {deviceId || 'Loading...'}
 </Text>
 <Text className="text-light-muted flex-wrap text-xs leading-[18px] mt-2">
 This ID binds your attendance to this physical device to prevent proxy fraud.
 </Text>

 {isOnDifferentDevice && (
 <View className="bg-warning-bg p-3 rounded-2xl mt-3">
 <Text className="text-warning text-xs font-bold mb-1">ACCOUNT LINKED TO ANOTHER PHONE</Text>
 <Text className="text-light-muted text-xs leading-4 mb-3">
 You cannot mark attendance from this phone yet. Link this phone to your account with a code sent to your email. You can do this once every 30 days.
 </Text>
 <Button
 title="Use This Phone"
 size="sm"
 icon="phone-portrait-outline"
 onPress={handleRequestDeviceChange}
 loading={isRequestingDeviceOtp}
 />
 </View>
 )}
 </View>
 </View>

 </Card>

 <SectionLabel className="mb-3 ml-1">ACCOUNT</SectionLabel>
 <Card className="overflow-hidden mb-6">
 <SettingsRow
 icon="lock-closed"
 title="Update Password"
 subtitle="Change the password you sign in with"
 onPress={() => setPasswordModalVisible(true)}
 divider
 />
 <SettingsRow
 icon="log-out"
 title="Sign Out"
 subtitle="You will need to sign in again"
 onPress={handleLogout}
 />
 </Card>

 <Text className="text-danger font-bold text-xs tracking-widest mb-3 ml-1">DANGER ZONE</Text>
 <Card className="overflow-hidden" style={{ borderColor: `${colors.danger}33` }}>
 <SettingsRow
 icon="trash"
 title="Delete Account"
 subtitle="Permanently removes your data"
 tone="danger"
 onPress={confirmDeleteAccount}
 />
 </Card>

 <Text className="text-center text-light-subtle text-xs font-medium mt-8">
 Attendance System v1.0.0
 </Text>
 </View>

 {/* Link This Phone Modal */}
 <BottomSheet
 visible={isDeviceModalVisible}
 onClose={() => setDeviceModalVisible(false)}
 title="Link This Phone"
 subtitle={`Enter the 6-digit code sent to ${user?.email}. Your old phone will no longer be able to mark attendance.`}
 >
 <Input
 label="Verification Code"
 placeholder="6-digit code"
 keyboardType="numeric"
 icon="keypad-outline"
 value={deviceOtp}
 onChangeText={(text) => setDeviceOtp(text.replace(/\D/g, '').slice(0, 6))}
 />

 <Button
 title="Link Phone"
 icon="phone-portrait-outline"
 onPress={handleConfirmDeviceChange}
 loading={isConfirmingDevice}
 className="mt-2"
 />
 </BottomSheet>

 {/* Update Password Modal */}
 <BottomSheet
 visible={isPasswordModalVisible}
 onClose={() => setPasswordModalVisible(false)}
 title="Update Password"
 subtitle="Use at least 6 characters for the new password."
 >
 <Input
 label="Current Password"
 secureTextEntry
 icon="lock-closed-outline"
 value={currentPassword}
 onChangeText={setCurrentPassword}
 />
 <TouchableOpacity
 onPress={() => {
 setPasswordModalVisible(false);
 router.push('/(auth)/forgot-password');
 }}
 hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
 className="mt-[-8px] mb-4 self-end"
 >
 <Text className="text-primary font-semibold text-xs">Forgot Password?</Text>
 </TouchableOpacity>
 <Input
 label="New Password"
 secureTextEntry
 icon="key-outline"
 value={newPassword}
 onChangeText={setNewPassword}
 />
 <Input
 label="Confirm New Password"
 secureTextEntry
 icon="shield-checkmark-outline"
 value={confirmPassword}
 onChangeText={setConfirmPassword}
 error={confirmPassword && newPassword !== confirmPassword ? "Passwords do not match" : undefined}
 />

 <Button
 title="Save Password"
 onPress={handleUpdatePassword}
 loading={isUpdatingPassword}
 className="mt-2"
 />
 </BottomSheet>

 </ScrollView>
 );
}

/** One tappable line in a settings card: icon, title, a short explanation and a chevron. */
function SettingsRow({ icon, title, subtitle, onPress, tone = 'default', divider = false }: {
 icon: keyof typeof Ionicons.glyphMap;
 title: string;
 subtitle: string;
 onPress: () => void;
 tone?: 'default' | 'danger';
 divider?: boolean;
}) {
 const danger = tone === 'danger';
 return (
 <TouchableOpacity
 onPress={onPress}
 activeOpacity={0.7}
 accessibilityRole="button"
 accessibilityLabel={title}
 className={`p-4 flex-row items-center ${divider ? 'border-b border-light-border' : ''}`}
 >
 <View className={`w-11 h-11 rounded-2xl items-center justify-center mr-4 ${danger ? 'bg-danger-bg' : 'bg-light'}`}>
 <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.text} />
 </View>
 <View className="flex-1">
 <Text className={`font-bold text-[15px] ${danger ? 'text-danger' : 'text-light-text'}`}>{title}</Text>
 <Text className={`text-xs font-medium mt-0.5 ${danger ? 'text-danger/70' : 'text-light-muted'}`}>{subtitle}</Text>
 </View>
 <Ionicons name="chevron-forward" size={18} color={danger ? colors.danger : colors.subtle} />
 </TouchableOpacity>
 );
}
