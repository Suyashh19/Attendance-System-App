import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { useDeviceId } from '../../hooks/useDeviceId';
import { submitAttendance } from '../../services/attendance';
import { useSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/authStore';

import { CountdownTimer } from '../../components/CountdownTimer';
import { AttendanceCodeInput } from '../../components/AttendanceCodeInput';
import { VerificationStatus } from '../../components/VerificationStatus';
import { AttendanceResultModal } from '../../components/AttendanceResultModal';
import type { SessionStartedPayload, VerificationState, AttendanceStatus } from '../../types';

type SessionState = 'IDLE' | 'ACTIVE' | 'EXPIRED' | 'LOCKED';

const DEFAULT_CODE_LENGTH = 4;

export default function AttendanceScreen() {
 const router = useRouter();
 const params = useLocalSearchParams();
 const { user } = useAuthStore();

 // Guard: Redirect non-students
 useEffect(() => {
 if (user && user.role !== 'student') {
 router.replace('/(tabs)/home');
 }
 }, [user, router]);

 const [sessionData, setSessionData] = useState<SessionStartedPayload | null>(null);
 const deviceId = useDeviceId();
 const queryClient = useQueryClient();

 // Typed code & submission state
 const [code, setCode] = useState('');
 const [codeError, setCodeError] = useState<string | undefined>();
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [resultStatus, setResultStatus] = useState<AttendanceStatus | 'LOADING' | null>(null);
 const [resultMessage, setResultMessage] = useState<string | undefined>();

 // Real-time verification state
 const [verification, setVerification] = useState<VerificationState>({
 sessionActive: true,
 deviceMatched: true, // Optimistic, will be refined in useEffect
 timeValid: true,
 });

 // Strictly controlled session state machine
 const [sessionState, setSessionState] = useState<SessionState>('IDLE');
 const [timeOffset, setTimeOffset] = useState<number>(0);
 const [initialTimeLeft, setInitialTimeLeft] = useState<number>(15);

 const codeLength = sessionData?.codeLength || DEFAULT_CODE_LENGTH;

 // ─── 3. Handlers ────────────────────────────────────────────────────────
 const handleTimeComplete = useCallback(() => {
 if (sessionState === 'EXPIRED' || sessionState === 'LOCKED') return;

 console.log('[DEBUG] Timer completed or expired. Locking session.');
 setSessionState('EXPIRED');
 setVerification((prev) => ({ ...prev, timeValid: false, sessionActive: false }));

 // If nothing is in flight and there is no result yet, show EXPIRED status
 if (!isSubmitting && !resultStatus) {
 setResultStatus('EXPIRED');
 setResultMessage('Attendance window closed before the correct code was entered.');
 }

 // Auto-transition to LOCKED after a brief delay to prevent any UI flicker or race conditions
 setTimeout(() => setSessionState('LOCKED'), 500);
 }, [sessionState, isSubmitting, resultStatus]);

 // ─── 1. Load Session Data ───────────────────────────────────────────────────
 useEffect(() => {
 if (params.sessionData) {
 try {
 const parsed = JSON.parse(params.sessionData as string) as SessionStartedPayload;
 console.log('[DEBUG] AttendanceScreen received sessionData:', parsed);

 // --- 1. Reset ALL States for New Session ---
 setSessionData(null); setSessionState('IDLE');
 setCode('');
 setCodeError(undefined);
 setIsSubmitting(false);
 setResultStatus(null);
 setResultMessage(undefined);
 setSessionState('IDLE');
  setVerification({ sessionActive: true, deviceMatched: true, timeValid: true, }); // Initial state reset

 // --- 2. Initialize New Data ---
 let offset = 0;
 if (parsed.serverTime) {
 offset = new Date(parsed.serverTime).getTime() - Date.now();
 setTimeOffset(offset);
 }

 const expiryTime = new Date(parsed.windowExpiry).getTime();
 const nowSynced = Date.now() + offset;
 const remaining = Math.max(0, (expiryTime - nowSynced) / 1000);

 const isValidTime = !isNaN(expiryTime);
 if (isValidTime) {
 setInitialTimeLeft(Math.ceil(remaining));
 }

  parsed.sessionId = parsed.sessionId || String(parsed.id);
  if (!parsed.windowExpiry && parsed.startTime) {
    const start = new Date(parsed.startTime).getTime();
    parsed.windowExpiry = new Date(start + (parsed.windowSeconds || 15) * 1000).toISOString();
  }
  setSessionData(parsed);
  setSessionState('ACTIVE');

 // Immediate device check
 if (deviceId && user) {
 const isMatch = !user.deviceId || user.deviceId === deviceId;
 setVerification(prev => ({ ...prev, deviceMatched: isMatch }));
 }

 if (isValidTime && remaining <= 0) {
 setSessionState('EXPIRED');
 setResultStatus('EXPIRED');
 setResultMessage('Attendance window already closed.');
 setVerification(prev => ({ ...prev, timeValid: false, sessionActive: false }));
 }
 } catch (err) {
 console.error('Failed to parse session data', err);
 router.replace('/(tabs)/home');
 }
 }
 }, [params.sessionData, router, deviceId, user]);

 // ─── 1.5 Robust Background Sync ───────────────────────────────────────────
 useEffect(() => {
 if (!sessionData || sessionState !== 'ACTIVE') return;

 const interval = setInterval(() => {
 const expiryTime = new Date(sessionData.windowExpiry).getTime();
 if (isNaN(expiryTime)) return;

 const nowSynced = Date.now() + timeOffset;
 if (nowSynced >= expiryTime) {
 handleTimeComplete();
 clearInterval(interval);
 }
 }, 1000);

 return () => clearInterval(interval);
 }, [sessionData, timeOffset, sessionState, handleTimeComplete]);


 // ─── 2. Real-time Session Sync ──────────────────────────────────────────
 useSocket({
 subjectIds: sessionData ? [String(sessionData.subjectId)] : [],
 onSessionEnded: (data) => {
 if (sessionData && String(data.sessionId) === String(sessionData.sessionId)) {
 console.log('[DEBUG] Session ended by faculty, triggering expiration');
 handleTimeComplete();
 setResultMessage('The session was closed by the faculty.');
 }
 },
 });

 // ─── 2.5 Update verification status based on final result ──────────────
 useEffect(() => {
 if (resultStatus === 'PRESENT') {
 setVerification(prev => ({
 ...prev,
 deviceMatched: true,
 timeValid: true,
 sessionActive: true
 }));
 } else if (resultStatus === 'INVALID' && resultMessage) {
 const msg = resultMessage.toLowerCase();
 // Heuristic parsing of backend reason to update specific verification dots
 if (msg.includes('device')) {
 setVerification(prev => ({ ...prev, deviceMatched: false }));
 }
 if (msg.includes('late') || msg.includes('time') || msg.includes('expired')) {
 setVerification(prev => ({ ...prev, timeValid: false }));
 }
 }
 }, [resultStatus, resultMessage]);

 // ─── 3. Listen for Results via Socket ────────────────────────────────────────
 useSocket({
 onAttendanceResult: (data) => {
 // If modal is already showing LOADING, update to actual result
 if (data.sessionId === sessionData?.sessionId) {
 setResultStatus(data.status);
 setResultMessage(data.message);
 setIsSubmitting(false);
 queryClient.invalidateQueries({ queryKey: ['history'] });
 }
 },
 onSessionEnded: (data) => {
 if (data.sessionId === sessionData?.sessionId) {
 setVerification((prev) => ({ ...prev, sessionActive: false }));
 if (!resultStatus) {
 Alert.alert('Session Ended', 'The faculty has closed the attendance window.');
 router.replace('/(tabs)/home');
 }
 }
 }
 });

 // ─── Handlers ───────────────────────────────────────────────────────────────
 const handleSubmit = async (submittedCode: string) => {
 if (!sessionData || sessionState !== 'ACTIVE' || isSubmitting || !submittedCode) return;

 if (!deviceId) {
 Alert.alert('Error', 'Unable to verify device ID. Please restart the app to mark attendance.');
 return;
 }

 setIsSubmitting(true);
 setCodeError(undefined);

 try {
 const result = await submitAttendance({
 sessionId: sessionData.sessionId,
 code: submittedCode,
 deviceId: deviceId,
 });

 // Wrong code with attempts left: stay on the keypad so the student can retype
 if (result.status === 'WRONG_CODE') {
 setCode('');
 setCodeError(result.reason || 'Incorrect code. Try again.');
 setIsSubmitting(false);
 return;
 }

 // Final Result Update
 if (result.status) {
 setResultStatus(result.status);
 setResultMessage(result.reason || result.message);
 setIsSubmitting(false);
 queryClient.invalidateQueries({ queryKey: ['history'] });
 }

 } catch (err: any) {
 setIsSubmitting(false);
 const msg = err.response?.data?.message || err.response?.data?.error || 'Submission failed';
 setResultStatus('INVALID');
 setResultMessage(msg);
 }
 };


 const handleModalDismiss = () => {
 setResultStatus(null);
 router.replace('/(tabs)/home');
 };

 // ─── Renderers ──────────────────────────────────────────────────────────────
 if (!sessionData || user?.role !== 'student') return null;

 return (
 <View className="flex-1 bg-light">
 <ScrollView
 className="flex-1"
 contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 48, alignItems: 'center', flexGrow: 1 }}
 keyboardShouldPersistTaps="handled"
 showsVerticalScrollIndicator={false}
 >

 {/* Header Info */}
 <View className="items-center mb-6 w-full">
 <Text className="text-light-text font-bold text-2xl mb-1 text-center">
 {sessionData.subjectName}
 </Text>
 <View className="bg-primary/20 px-3 py-1 rounded-full flex-row items-center border border-primary/30">
 <View className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse" />
 <Text className="text-primary font-bold text-xs tracking-wider">
 ATTENDANCE WINDOW OPEN
 </Text>
 </View>
 </View>

 {/* Code Entry (kept at the top so the keyboard never covers it) */}
 <View className="w-full mb-4">
 <Text className="text-light-text font-bold text-lg mb-1 ml-1 text-center">
 Enter Displayed Code
 </Text>
 <Text className="text-light-muted text-center text-sm px-4">
 Type the {codeLength}-digit code shown by your faculty before time runs out.
 </Text>
 <AttendanceCodeInput
 key={sessionData.sessionId}
 value={code}
 length={codeLength}
 onChange={setCode}
 onComplete={handleSubmit}
 disabled={sessionState !== 'ACTIVE'}
 loading={isSubmitting}
 error={codeError}
 />
 </View>

 {/* Countdown Timer (Synchronized & Immediate) */}
 <View className="mb-6">
 <CountdownTimer
 key={sessionData.sessionId} // Re-mount timer if session changes
 duration={initialTimeLeft}
 onComplete={handleTimeComplete}
 size={140}
 strokeWidth={10}
 />
 </View>

 {/* Verification Layer Status */}
 <View className="w-full mb-6">
 <VerificationStatus state={verification} />
 </View>

 </ScrollView>

 {/* Result Modal Overlay */}
 <AttendanceResultModal
 visible={resultStatus !== null}
 status={resultStatus}
 message={resultMessage}
 onDismiss={handleModalDismiss}
 />

 </View>
 );
}
