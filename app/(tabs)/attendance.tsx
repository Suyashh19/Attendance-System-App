import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Alert } from 'react-native';
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

export default function AttendanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [sessionData, setSessionData] = useState<SessionStartedPayload | null>(null);
  const deviceId = useDeviceId();
  const { location, getLocation, error: locationError } = useLocation();
  const queryClient = useQueryClient();

  // Selected code & submission state
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultStatus, setResultStatus] = useState<AttendanceStatus | 'LOADING' | null>(null);
  const [resultMessage, setResultMessage] = useState<string | undefined>();
  
  // Real-time verification state
  const [verification, setVerification] = useState<VerificationState>({
    sessionActive: true,
    deviceMatched: null,
    locationVerified: null,
    timeValid: true,
  });

  // Track if time ran out
  const [timeExpired, setTimeExpired] = useState(false);

  // ─── 1. Load Session Data ───────────────────────────────────────────────────
  useEffect(() => {
    if (params.sessionData) {
      try {
        const parsed = JSON.parse(params.sessionData as string);
        setSessionData(parsed);
      } catch (err) {
        console.error('Failed to parse session data', err);
        router.replace('/(tabs)/home');
      }
    }
  }, [params.sessionData, router]);

  // ─── 2. Fetch Location Immediately ──────────────────────────────────────────
  useEffect(() => {
    if (sessionData && !location) {
      getLocation().then((loc) => {
        setVerification((prev) => ({
          ...prev,
          locationVerified: !!loc, // True if we got coords. Backend does actual distance check
        }));
      });
    }
    
    if (deviceId) {
      setVerification((prev) => ({ ...prev, deviceMatched: true })); // Pre-checked frontend
    }
  }, [sessionData, location, deviceId, getLocation]);

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
  const handleSubmit = async (code: string) => {
    if (!sessionData || !deviceId || !location || timeExpired) return;

    setSelectedCode(code);
    setIsSubmitting(true);
    setResultStatus('LOADING');

    try {
      // Fire and forget via REST -> result comes via Socket
      await submitAttendance({
        sessionId: sessionData.sessionId,
        selectedCode: code,
        deviceId: deviceId,
        latitude: location.latitude,
        longitude: location.longitude,
      });
    } catch (err: any) {
      setIsSubmitting(false);
      const msg = err.response?.data?.message || 'Submission failed';
      setResultStatus('INVALID');
      setResultMessage(msg);
    }
  };

  const handleTimeComplete = () => {
    setTimeExpired(true);
    setVerification((prev) => ({ ...prev, timeValid: false }));
    
    if (!isSubmitting && !resultStatus) {
      setResultStatus('ABSENT');
      setResultMessage('You did not select a code within the 15-second window.');
    }
  };

  const handleModalDismiss = () => {
    setResultStatus(null);
    router.replace('/(tabs)/home');
  };

  // ─── Renderers ──────────────────────────────────────────────────────────────
  if (!sessionData) return null;

  return (
    <View className="flex-1 bg-dark px-6 py-12 items-center">
      
      {/* Header Info */}
      <View className="items-center mb-8 w-full">
        <Text className="text-white font-bold text-2xl mb-1 text-center">
          {sessionData.subjectName}
        </Text>
        <View className="bg-primary/20 px-3 py-1 rounded-full flex-row items-center border border-primary/30">
          <View className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse" />
          <Text className="text-primary font-bold text-xs tracking-wider">
            ATTENDANCE WINDOW OPEN
          </Text>
        </View>
      </View>

      {/* Countdown Timer */}
      <View className="mb-10">
        <CountdownTimer 
          duration={sessionData.windowSeconds} 
          onComplete={handleTimeComplete}
          size={160}
          strokeWidth={12}
        />
      </View>

      {/* Verification Layer Status */}
      <View className="w-full mb-8">
        <VerificationStatus state={verification} />
        {locationError && (
          <Text className="text-danger text-xs font-bold mt-2 text-center">
            GPS Error: {locationError}. Please enable location.
          </Text>
        )}
      </View>

      {/* Code Selection */}
      <View className="w-full flex-1">
        <Text className="text-white font-bold text-lg mb-2 ml-1 text-center">
          Select Displayed Code
        </Text>
        <Text className="text-dark-muted text-center text-sm mb-2 px-4">
          Look at the faculty's screen and match the 3-digit code before time runs out.
        </Text>
        
        <AttendanceCodeSelector
          options={sessionData.options}
          selectedCode={selectedCode}
          onSelect={handleSubmit}
          disabled={timeExpired || isSubmitting || !location}
        />
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
