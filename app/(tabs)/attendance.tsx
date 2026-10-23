import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { showAlert } from '../../store/dialogStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { useDeviceId } from '../../hooks/useDeviceId';
import { submitAttendance } from '../../services/attendance';
import { getErrorMessage } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/authStore';

import { CountdownTimer } from '../../components/CountdownTimer';
import { AttendanceCodeInput } from '../../components/AttendanceCodeInput';
import { VerificationStatus } from '../../components/VerificationStatus';
import { AttendanceResultModal } from '../../components/AttendanceResultModal';
import { Text } from '../../components/Text';
import { Hero } from '../../components/Hero';
import { Card } from '../../components/Card';
import type { SessionStartedPayload, VerificationState, AttendanceStatus } from '../../types';

type SessionState = 'IDLE' | 'ACTIVE' | 'EXPIRED' | 'LOCKED';

const DEFAULT_CODE_LENGTH = 4;

export default function AttendanceScreen() {
 const router = useRouter();
 const params = useLocalSearchParams();
 const { user } = useAuthStore();
 const insets = useSafeAreaInsets();

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

 // Which session payload is on screen, and whether its result was already closed by the student
 const loadedSessionParamRef = useRef<string | null>(null);
 const dismissedRef = useRef(false);

 // ─── 3. Handlers ────────────────────────────────────────────────────────
 const handleTimeComplete = useCallback(() => {
 if (sessionState === 'EXPIRED' || sessionState === 'LOCKED') return;

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
 // Only a NEW session resets the screen; a profile or device-id refresh must not wipe what was typed
 if (loadedSessionParamRef.current === params.sessionData) return;
 loadedSessionParamRef.current = params.sessionData as string;
 dismissedRef.current = false;

 try {
 const parsed = JSON.parse(params.sessionData as string) as SessionStartedPayload;

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
 onAttendanceResult: (data) => {
 // Ignore results for other sessions, and ones that arrive after the student closed the result
 if (!sessionData || dismissedRef.current) return;
 if (String(data.sessionId) !== String(sessionData.sessionId)) return;

 setResultStatus(data.status);
 setResultMessage(data.reason || undefined);
 setIsSubmitting(false);
 queryClient.invalidateQueries({ queryKey: ['history'] });
 },
 onSessionEnded: (data) => {
 if (!sessionData || dismissedRef.current) return;
 if (String(data.sessionId) !== String(sessionData.sessionId)) return;

 setVerification((prev) => ({ ...prev, sessionActive: false }));
 if (!resultStatus) {
 handleTimeComplete();
 setResultMessage('The session was closed by the faculty.');
 }
 },
 });

 // Device check against the profile (which can finish loading after the session opens)
 useEffect(() => {
 if (!deviceId || !user) return;
 const isMatch = !user.deviceId || user.deviceId === deviceId;
 setVerification((prev) => ({ ...prev, deviceMatched: isMatch }));
 }, [deviceId, user, sessionData?.sessionId]);

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
 // ─── Handlers ───────────────────────────────────────────────────────────────
 const handleSubmit = async (submittedCode: string) => {
 if (!sessionData || sessionState !== 'ACTIVE' || isSubmitting || !submittedCode) return;

 if (!deviceId) {
 showAlert('Error', 'Unable to verify device ID. Please restart the app to mark attendance.');
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
 setResultMessage(result.reason || undefined);
 setIsSubmitting(false);
 queryClient.invalidateQueries({ queryKey: ['history'] });
 }

 } catch (err: any) {
 setIsSubmitting(false);

 // No answer from the server: nothing was recorded, so let the student try again while time remains
 if (!err.response) {
 setCode('');
 setCodeError('Network problem. Type the code again.');
 return;
 }

 setResultStatus('INVALID');
 setResultMessage(getErrorMessage(err, 'Submission failed'));
 }
 };


 const handleModalDismiss = () => {
 dismissedRef.current = true;
 setResultStatus(null);
 router.replace('/(tabs)/home');
 };

 // ─── Renderers ──────────────────────────────────────────────────────────────
 if (!sessionData || user?.role !== 'student') return null;

 const windowOpen = sessionState === 'ACTIVE';

 return (
 <View className="flex-1 bg-light">
 <ScrollView
 className="flex-1"
 contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 32 }}
 keyboardShouldPersistTaps="handled"
 showsVerticalScrollIndicator={false}
 >

 {/* Gradient banner: which class this is */}
 <Hero className="px-6 pb-20 items-center" style={{ paddingTop: insets.top + 20 }}>
 <View className={`px-3 h-8 rounded-full flex-row items-center ${windowOpen ? 'bg-success' : 'bg-white/10'}`}>
 <View className={`w-2 h-2 rounded-full mr-2 ${windowOpen ? 'bg-white' : 'bg-white/50'}`} />
 <Text className={`font-bold text-[11px] tracking-widest ${windowOpen ? 'text-white' : 'text-white/70'}`}>
 {windowOpen ? 'WINDOW OPEN' : 'WINDOW CLOSED'}
 </Text>
 </View>
 <Text className="text-white/60 text-xs font-bold tracking-widest mt-4 mb-1">MARK ATTENDANCE</Text>
 <Text className="text-white font-extrabold text-[26px] text-center" numberOfLines={2}>
 {sessionData.subjectName}
 </Text>
 </Hero>

 <View className="px-5 -mt-12">

 {/* Code Entry (kept at the top so the keyboard never covers it) */}
 <Card className="px-4 pt-6 pb-3 rounded-[28px]">
 <Text className="text-light-text font-extrabold text-xl text-center">
 Enter the code
 </Text>
 <Text className="text-light-muted text-center text-sm leading-5 px-4 mt-1">
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
 </Card>

 {/* Countdown Timer (Synchronized & Immediate) */}
 <Card className="p-5 mt-4 flex-row items-center">
 <CountdownTimer
 key={sessionData.sessionId} // Re-mount timer if session changes
 duration={initialTimeLeft}
 onComplete={handleTimeComplete}
 size={108}
 strokeWidth={9}
 />
 <View className="flex-1 ml-5">
 <Text className="text-light-muted font-bold text-xs tracking-widest mb-1">TIME LEFT</Text>
 <Text className="text-light-text font-bold text-base">
 {windowOpen ? 'The window is open' : 'The window has closed'}
 </Text>
 <Text className="text-light-muted text-[13px] leading-[18px] mt-1">
 {windowOpen
 ? 'Your code is sent as soon as you type the last digit.'
 : 'Codes can no longer be submitted for this class.'}
 </Text>
 </View>
 </Card>

 {/* Verification Layer Status */}
 <View className="w-full mt-4">
 <VerificationStatus state={verification} />
 </View>

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
