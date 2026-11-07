import React, { useState } from 'react';
import { View, ScrollView, Linking } from 'react-native';
import { showAlert } from '../../store/dialogStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Ionicons } from '@expo/vector-icons';
import { useDeviceId } from '../../hooks/useDeviceId';
import { updatePrn, deleteAccount, requestDeviceChange, confirmDeviceChange } from '../../services/auth';
import { maskEmail } from '../../utils/maskEmail';
import { getErrorMessage, SERVER_URL } from '../../services/api';
import { colors } from '../../constants/theme';
import { Text } from '../../components/Text';
import { Hero } from '../../components/Hero';
import { Card } from '../../components/Card';
import { BottomSheet } from '../../components/BottomSheet';
import { SectionLabel } from '../../components/EmptyState';
import { SettingsRow } from '../../components/SettingsRow';

// Shown in the Help section as "Contact support"
const SUPPORT_EMAIL = 'spgroup177@gmail.com';

export default function ProfileScreen() {
 const { user, logout, setUser } = useAuthStore();
 const deviceId = useDeviceId();
 const router = useRouter();
 const insets = useSafeAreaInsets();
 
 const [prnInput, setPrnInput] = useState('');
 const [isUpdating, setIsUpdating] = useState(false);

 // Delete Account State
 const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
 const [deletePassword, setDeletePassword] = useState('');
 const [isDeleting, setIsDeleting] = useState(false);

 // Device Change State
 const [isDeviceModalVisible, setDeviceModalVisible] = useState(false);
 const [deviceOtp, setDeviceOtp] = useState('');
 const [isRequestingDeviceOtp, setIsRequestingDeviceOtp] = useState(false);
 const [isConfirmingDevice, setIsConfirmingDevice] = useState(false);

 const handleLogout = () => {
 showAlert(
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

 const openLink = async (url: string) => {
   try {
     await Linking.openURL(url);
   } catch {
     showAlert('Could not open', 'Please try again, or copy the address into your browser.');
   }
 };

 const handleUpdatePrn = async () => {
 if (!prnInput.trim()) {
 showAlert('Error', 'Please enter a valid PRN');
 return;
 }

 showAlert(
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
 showAlert('Success', 'PRN saved successfully and is now locked.');
 } catch (err: any) {
 const msg = err.response?.data?.error || 'Failed to update PRN';
 showAlert('Error', msg);
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
 showAlert('Could not send code', getErrorMessage(err, 'Please try again.'));
 } finally {
 setIsRequestingDeviceOtp(false);
 }
 };

 const handleConfirmDeviceChange = async () => {
 if (!user || !deviceId) return;
 if (deviceOtp.trim().length !== 6) {
 showAlert('Error', 'Enter the 6-digit code from your email.');
 return;
 }

 try {
 setIsConfirmingDevice(true);
 const res = await confirmDeviceChange({ otp: deviceOtp.trim(), deviceId });
 setUser({ ...user, deviceId: res.user?.deviceId ?? deviceId });
 setDeviceModalVisible(false);
 setDeviceOtp('');
 showAlert('Phone Linked', 'You can now mark attendance from this phone.');
 } catch (err: any) {
 showAlert('Could not link phone', getErrorMessage(err, 'Please try again.'));
 } finally {
 setIsConfirmingDevice(false);
 }
 };

 // Opens the password sheet: deleting needs the account password, not just a tap
 const confirmDeleteAccount = () => {
 setDeletePassword('');
 setDeleteModalVisible(true);
 };

 const handleDeleteAccount = async () => {
 if (!deletePassword) {
 showAlert('Error', 'Enter your password to delete your account.');
 return;
 }
 try {
 setIsDeleting(true);
 await deleteAccount(deletePassword);
 setDeleteModalVisible(false);
 await logout();
 router.replace('/(auth)/login');
 showAlert('Account Deleted', 'Your data has been removed from our servers.');
 } catch (err: any) {
 showAlert('Could not delete account', getErrorMessage(err, 'Please try again.'));
 } finally {
 setIsDeleting(false);
 setDeletePassword('');
 }
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

 {user?.role === 'student' && (
 <View className="p-4 flex-row items-start">
 <View className="w-11 h-11 rounded-2xl bg-light-primaryBg items-center justify-center mr-4">
 <Ionicons name="hardware-chip" size={20} color={colors.primary} />
 </View>
 <View className="flex-1">
 <Text className="text-light-muted text-[11px] font-bold tracking-widest mb-1">LINKED PHONE</Text>
 <Text className="text-light-text font-semibold text-sm">
   {!deviceId ? 'Checking this phone...' : isOnDifferentDevice ? "Not the phone linked to your account" : 'This phone is linked to your account'}
   </Text>
   {deviceId ? (
   <Text className="text-light-subtle font-mono text-[10px] mt-1">Ref ...{deviceId.slice(-6)}</Text>
   ) : null}
 <Text className="text-light-muted flex-wrap text-xs leading-[18px] mt-2">
 Attendance can only be marked from the phone linked to your account. This stops anyone else marking it for you.
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
 )}

 </Card>

 <SectionLabel className="mb-3 ml-1">ACCOUNT</SectionLabel>
 <Card className="overflow-hidden mb-6">
 <SettingsRow
 icon="settings"
 title="Settings"
 subtitle={user?.role === 'faculty' ? 'Password, semester months and preferences' : 'Password and account security'}
 onPress={() => router.push('/settings' as any)}
 divider
 />
 <SettingsRow
 icon="log-out"
 title="Sign Out"
 subtitle="You will need to sign in again"
 onPress={handleLogout}
 />
 </Card>

 <SectionLabel className="mb-3 ml-1">HELP</SectionLabel>
 <Card className="overflow-hidden mb-6">
 <SettingsRow
 icon="help-buoy"
 title="Contact support"
 subtitle="Email us if something is not working"
 onPress={() => openLink(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Attendance System help')}`)}
 divider
 />
 <SettingsRow
 icon="shield-checkmark"
 title="Privacy policy"
 subtitle="How your data is used"
 onPress={() => openLink(`${SERVER_URL}/privacy`)}
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
 Attendance System v{Constants.expoConfig?.version ?? '1.2.3'}
 </Text>
 </View>

 {/* Link This Phone Modal */}
 <BottomSheet
 visible={isDeviceModalVisible}
 onClose={() => setDeviceModalVisible(false)}
 title="Link This Phone"
 subtitle={`Enter the 6-digit code sent to ${maskEmail(user?.email)}. Your old phone will no longer be able to mark attendance.`}
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

 {/* Delete Account Modal */}
 <BottomSheet
 visible={isDeleteModalVisible}
 onClose={() => !isDeleting && setDeleteModalVisible(false)}
 title="Delete Account"
 subtitle="This permanently deletes your profile and attendance records. It cannot be undone."
 >
 <Input
 label="Enter your password to confirm"
 secureTextEntry
 icon="lock-closed-outline"
 value={deletePassword}
 onChangeText={setDeletePassword}
 autoCapitalize="none"
 />
 <View className="flex-row mt-2">
 <Button title="Cancel" variant="outline" onPress={() => setDeleteModalVisible(false)} disabled={isDeleting} className="flex-1 mr-3" />
 <Button title="Delete" variant="danger" onPress={handleDeleteAccount} loading={isDeleting} disabled={!deletePassword} className="flex-1" />
 </View>
 </BottomSheet>

 </ScrollView>
 );
}

