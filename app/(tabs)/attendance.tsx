import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { useLocation } from '../../hooks/useLocation';
import { useDeviceId } from '../../hooks/useDeviceId';
import { submitAttendance } from '../../services/attendance';
import { useSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/authStore';

import { CountdownTimer } from '../../components/CountdownTimer';
import { AttendanceCodeSelector } from '../../components/AttendanceCodeSelector';
import { VerificationStatus } from '../../components/VerificationStatus';
import { AttendanceResultModal } from '../../components/AttendanceResultModal';
import { Button } from '../../components/Button';
import type { SessionStartedPayload, VerificationState, AttendanceStatus } from '../../types';

type SessionState = 'IDLE' | 'ACTIVE' | 'EXPIRED' | 'LOCKED';

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
 const { location, getLocation, getHybridPosition, error: locationError } = useLocation();
 const queryClient = useQueryClient();

 // Selected code & submission state
 const [selectedCode, setSelectedCode] = useState<string | null>(null);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [resultStatus, setResultStatus] = useState<AttendanceStatus | 'LOADING' | null>(null);
 const [resultMessage, setResultMessage] = useState<string | undefined>();
 
 // Real-time verification state
 const [verification, setVerification] = useState<VerificationState>({
 sessionActive: true,
 deviceMatched: true, // Optimistic, will be refined in useEffect
 locationVerified: null,
 timeValid: true,
 });

 // Strictly controlled session state machine
 const [sessionState, setSessionState] = useState<SessionState>('IDLE');
 const [timeOffset, setTimeOffset] = useState<number>(0);
 const [initialTimeLeft, setInitialTimeLeft] = useState<number>(15);
 const isTransitioning = useRef(false);
 const selectionTimeRef = useRef<number>(0);

 // ─── 3. Handlers ────────────────────────────────────────────────────────
 const handleTimeComplete = useCallback(() => {
 if (sessionState === 'EXPIRED' || sessionState === 'LOCKED') return;
 
 console.log('[DEBUG] Timer completed or expired. Locking session.');
 setSessionState('EXPIRED');
 setVerification((prev) => ({ ...prev, timeValid: false, sessionActive: false }));
 
 // If no code was selected and not currently submitting, show EXPIRED status
 if (!selectedCode && !isSubmitting && !resultStatus) {
 setResultStatus('EXPIRED');
 setResultMessage('Attendance window closed. No code was selected.');
 }
 
 // Auto-transition to LOCKED after a brief delay to prevent any UI flicker or race conditions
 setTimeout(() => setSessionState('LOCKED'), 500);
 }, [sessionState, selectedCode, isSubmitting, resultStatus]);

 // ─── 1. Load Session Data ───────────────────────────────────────────────────
 useEffect(() => {
 if (params.sessionData) {
 try {
 const parsed = JSON.parse(params.sessionData as string) as SessionStartedPayload;
 console.log('[DEBUG] AttendanceScreen received sessionData:', parsed);
 
 // --- 1. Reset ALL States for New Session ---
 setSessionData(null); setSessionState('IDLE'); 
 setSelectedCode(null);
 setIsSubmitting(false);
 setResultStatus(null);
 setResultMessage(undefined);
 setSessionState('IDLE');
  setVerification({ sessionActive: true, deviceMatched: true, locationVerified: null, timeValid: true, }); // Initial state reset

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

     // ─── 2.5 Fetch Location & Auto-Retry Loop ───────────────────────────────────
  const locationSignalRef = useRef<'waiting' | 'ready' | 'failed'>('waiting');

  useEffect(() => {
   if (!sessionData || resultStatus) return;

   locationSignalRef.current = 'waiting';
   let isMounted = true;

   const resolveLocation = async () => {
   if (!isMounted) return;
   

   // Use ref (not state) to avoid re-render loop in deps array
   if (locationSignalRef.current === 'ready') return;

   console.log('[DEBUG] Scanning for GPS signal...');
   const loc = await getHybridPosition();

   if (!isMounted) return;
   const isAccuracyPoor = loc && loc.accuracy && loc.accuracy > 100;

   if (loc && !isAccuracyPoor) {
   locationSignalRef.current = 'ready';
   setVerification((prev) => ({ ...prev, locationVerified: 'ready' }));
   } else if (loc && isAccuracyPoor) {
   locationSignalRef.current = 'failed';
   setVerification((prev) => ({ ...prev, locationVerified: false }));
   }
   };

   resolveLocation();

   const interval = setInterval(() => {
   if (locationSignalRef.current === 'waiting') resolveLocation();
   else clearInterval(interval);
   }, 4000);

   return () => { isMounted = false; clearInterval(interval); };
   }, [sessionData, resultStatus, getHybridPosition]);


 // ─── 2.5 Update verification status based on final result ──────────────
 useEffect(() => {
 if (resultStatus === 'PRESENT') {
 setVerification(prev => ({
 ...prev,
 deviceMatched: true,
 locationVerified: true,
 timeValid: true,
 sessionActive: true
 }));
 } else if (resultStatus === 'INVALID' && resultMessage) {
 const msg = resultMessage.toLowerCase();
 // Heuristic parsing of backend reason to update specific verification dots
 if (msg.includes('device')) {
 setVerification(prev => ({ ...prev, deviceMatched: false }));
 }
 if (msg.includes('location') || msg.includes('range')) {
 setVerification(prev => ({ ...prev, locationVerified: false }));
 }
 if (msg.includes('late') || msg.includes('time')) {
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
 const handleSubmit = async (code: string, isRetryAttempt = false) => {
 if (!sessionData || sessionState === 'EXPIRED' || sessionState === 'LOCKED' || !code) return;

 if (!deviceId) {
 Alert.alert('Error', 'Unable to verify device ID. Please restart the app to mark attendance.');
 return;
 }

 setSelectedCode(code);
 setIsSubmitting(true);
 setResultStatus('LOADING');
 
 if (!isRetryAttempt) {
 selectionTimeRef.current = Date.now();
 } else {
 setResultMessage('Improving accuracy... One more attempt...');
 }

 try {
 // 1. Get/Resolve Location (Initial or Reuse)
 const currentLoc = location || await getHybridPosition();
 
 // 2. Validate Accuracy Cap (Absolute rule: 100m)
 if (!currentLoc || (currentLoc.accuracy && currentLoc.accuracy > 100)) {
 setIsSubmitting(false);
 setResultStatus('INVALID');
 setResultMessage('Location signal too weak. Please move near a window or outdoors.');
 return;
 }

 // 3. Submit via REST
 const result = await submitAttendance({
 sessionId: sessionData.sessionId,
 selectedCode: code,
 deviceId: deviceId,
 latitude: currentLoc.latitude,
 longitude: currentLoc.longitude,
 accuracy: currentLoc.accuracy ?? undefined,
 isRetry: isRetryAttempt,
 });

 // 4. Handle Conditional Retry
 if (result.status === ('RETRY_REQUIRED' as any)) {
 console.log('[DEBUG] Backend requested retry. Fetching fresh high-accuracy GPS...');
 setResultMessage('Accuracy low. Fetching fresh GPS for final attempt...');
 
 // Fetch fresh high-accuracy GPS (3s limit)
 const freshLoc = await getHybridPosition(); 
 
 // Strict Validation for Retry:
 // A. Max Accuracy 50m
 // B. Anti-Movement/Spoof Timestamp Check (Selection + 2s)
 const isAccuracyOk = freshLoc && freshLoc.accuracy && freshLoc.accuracy <= 50;
 const isTimeOk = freshLoc && freshLoc.timestamp <= selectionTimeRef.current + 2500; // 2.5s tolerance

 if (!isAccuracyOk || !isTimeOk) {
 setResultStatus('INVALID');
 setResultMessage(!isAccuracyOk ? 'Retry failed: Poor accuracy (>50m).' : 'Retry failed: Stale location detected.');
 setIsSubmitting(false);
 return;
 }
 
 // Re-submit with retry flag and the fresh validated location
 return handleSubmit(code, true);
 }

 // 5. Final Result Update
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
 <View className="flex-1 bg-light px-6 py-12 items-center">
 
 {/* Header Info */}
 <View className="items-center mb-8 w-full">
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
 {locationError && (
 <Text className="text-danger text-xs font-bold mt-2 text-center">
 GPS Error: {locationError}. Please enable location.
 </Text>
 )}
 </View>

 {/* Code Selection */}
 <View style={{ flex: 1, width: '100%' }}>
 <Text className="text-light-text font-bold text-lg mb-1 ml-1 text-center">
 Select Displayed Code
 </Text>
 <Text className="text-light-muted text-center text-sm mb-1 px-4">
 Match the 3-digit code before time runs out.
 </Text>
 
 <ScrollView 
 style={{ flex: 1 }}
 contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
 showsVerticalScrollIndicator={false}
 className="w-full"
 >
 <View style={{ flex: 1, width: '100%' }}>
 <AttendanceCodeSelector
 options={sessionData.options}
 selectedCode={selectedCode}
 onSelect={(code) => handleSubmit(code)}
 disabled={sessionState !== 'ACTIVE' || isSubmitting}
 />
 </View>
 </ScrollView>
 </View>

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
