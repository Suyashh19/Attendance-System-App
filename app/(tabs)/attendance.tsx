import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, ScrollView, BackHandler } from 'react-native';
import { showAlert } from '../../store/dialogStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { useDeviceId } from '../../hooks/useDeviceId';
import { submitAttendance } from '../../services/attendance';
import { getErrorMessage } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/authStore';
import { useProctoring } from '../../hooks/useProctoring';
import { isInCall } from '../../modules/call-state';
import { VIOLATION_MESSAGES, resultAfterViolation } from '../../utils/proctoring';

import { CountdownTimer } from '../../components/CountdownTimer';
import { AttendanceCodeInput } from '../../components/AttendanceCodeInput';
import { VerificationStatus } from '../../components/VerificationStatus';
import { AttendanceResultModal } from '../../components/AttendanceResultModal';
import { Text } from '../../components/Text';
import { Hero } from '../../components/Hero';
import { Card } from '../../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import type { SessionStartedPayload, VerificationState, AttendanceStatus, Violation } from '../../types';

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

 // The student stays on this screen until the window closes, whether or not they have marked
 const [forceRelease, setForceRelease] = useState(false);
 const [secondsLeft, setSecondsLeft] = useState(0);
 const windowHeld = !!sessionData && sessionState === 'ACTIVE' && verification.sessionActive && !forceRelease;

 const codeLength = sessionData?.codeLength || DEFAULT_CODE_LENGTH;

 // Which session payload is on screen, and whether its result was already closed by the student
 const loadedSessionParamRef = useRef<string | null>(null);
 const dismissedRef = useRef(false);

 // Proctoring: the first rule broken in this window, and whether the server has recorded it
 const [violation, setViolation] = useState<Violation | null>(null);
 const violationRef = useRef<Violation | null>(null);
 const violationSentRef = useRef<'idle' | 'sending' | 'done'>('idle');

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
 setCodeError(undefined); setIsSubmitting(false); setResultStatus(null); setForceRelease(false);
 setResultMessage(undefined);
 setSessionState('IDLE');
 setViolation(null); violationRef.current = null; violationSentRef.current = 'idle';
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

 // A PRESENT that crosses with a reported violation must not hide the INVALID
 if (violationRef.current && data.status === 'PRESENT') return;
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

 // ─── Proctoring ─────────────────────────────────────────────────────────────
 // Tells the server about the violation; retried when the app comes back if the phone was offline
 const sendViolation = async () => {
   const broken = violationRef.current;
   if (!broken || !sessionData || !deviceId || violationSentRef.current !== 'idle') return;
   violationSentRef.current = 'sending';
   try {
     const result = await submitAttendance({
       sessionId: sessionData.sessionId,
       code: code || '',
       deviceId,
       violation: broken,
     });
     violationSentRef.current = 'done';
     setResultStatus(resultAfterViolation(result.status, broken) as AttendanceStatus);
     setResultMessage(result.reason || VIOLATION_MESSAGES[broken]);
     queryClient.invalidateQueries({ queryKey: ['history'] });
   } catch (err: any) {
     // Nothing reached the server: try again the next time the app is in front
     violationSentRef.current = err?.response ? 'done' : 'idle';
   }
 };

 const handleViolation = (broken: Violation) => {
   if (violationRef.current) return;
   violationRef.current = broken;
   setViolation(broken);
   setIsSubmitting(false);
   setCodeError(undefined);
   // Shown straight away; the server's answer replaces it when it arrives
   setResultStatus('INVALID');
   setResultMessage(VIOLATION_MESSAGES[broken]);
   sendViolation();
 };

 // Watched for the whole window, also after the code was accepted
 useProctoring({
   active: !!sessionData && sessionState === 'ACTIVE',
   onViolation: handleViolation,
   onResume: sendViolation,
 });

 // ─── 3. Listen for Results via Socket ────────────────────────────────────────
 // ─── Handlers ───────────────────────────────────────────────────────────────
 const handleSubmit = async (submittedCode: string) => {
 if (!sessionData || sessionState !== 'ACTIVE' || isSubmitting || !submittedCode) return;
 if (violationRef.current) return;
 // Checked once more at the moment of sending, so a call started a split second ago still counts
 if (isInCall()) {
   handleViolation('PHONE_CALL');
   return;
 }

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

 // Final Result Update (a violation reported meanwhile wins over PRESENT)
 if (violationRef.current && result.status === 'PRESENT') return;
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


 // Android back button does nothing while the window is open
 useEffect(() => {
   if (!windowHeld) return;
   const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
   return () => sub.remove();
 }, [windowHeld]);

 // Seconds the student still has to wait, shown on the result popup
 useEffect(() => {
   if (!sessionData || !windowHeld) return;
   const expiry = new Date(sessionData.windowExpiry).getTime();
   if (isNaN(expiry)) return;
   const tick = () => setSecondsLeft(Math.max(0, Math.ceil((expiry - (Date.now() + timeOffset)) / 1000)));
   tick();
   const id = setInterval(tick, 500);
   return () => clearInterval(id);
 }, [sessionData, timeOffset, windowHeld]);

 // Safety net: a student is never kept here past the window, even if an update never arrives
 useEffect(() => {
   if (!sessionData) return;
   const expiry = new Date(sessionData.windowExpiry).getTime();
   const wait = isNaN(expiry) ? 0 : Math.max(0, expiry - (Date.now() + timeOffset)) + 3000;
   const id = setTimeout(() => setForceRelease(true), wait);
   return () => clearTimeout(id);
 }, [sessionData, timeOffset]);

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
 disabled={sessionState !== 'ACTIVE' || !!violation}
 loading={isSubmitting}
 error={codeError}
 />
 <View className="flex-row items-start bg-warning-bg rounded-2xl px-3 py-2.5 mt-3 mb-1">
 <Ionicons name="shield-checkmark-outline" size={16} color={colors.warning} style={{ marginRight: 8, marginTop: 1 }} />
 <Text className="text-warning text-[12px] font-semibold leading-[17px] flex-1">
 Stay in this app and don't be on a call until the timer ends. Leaving the app or being on a call marks you INVALID.
 </Text>
 </View>
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
      holdSeconds={windowHeld ? Math.max(secondsLeft, 1) : 0}
 />

 </View>
 );
}
