import React, { useEffect, useRef, useState } from 'react';
import { View, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { CountdownTimer } from './CountdownTimer';
import { Text } from './Text';
import { Hero } from './Hero';
import { colors, shadow } from '../constants/theme';

interface FacultySessionModalProps {
  visible: boolean;
  subjectName: string;
  correctCode: string;
  presentCount?: number;
  /** Seconds the attendance window stays open (from the server) */
  duration?: number;
  /** Changes for every new session so the countdown restarts */
  sessionKey?: string | number;
  /** True while the end request is in flight */
  ending?: boolean;
  onEndSession: () => void;
}

// Students get a short grace period for network delay, so the session is closed just after the countdown
const AUTO_END_DELAY_MS = 2500;

export function FacultySessionModal({
  visible,
  subjectName,
  correctCode,
  presentCount = 0,
  duration = 15,
  sessionKey,
  ending = false,
  onEndSession
}: FacultySessionModalProps) {
  const insets = useSafeAreaInsets();
  const [windowClosed, setWindowClosed] = useState(false);
  const onEndSessionRef = useRef(onEndSession);
  onEndSessionRef.current = onEndSession;

  useEffect(() => {
    setWindowClosed(false);
  }, [sessionKey, visible]);

  // When the countdown finishes, end the session automatically and show the summary
  useEffect(() => {
    if (!visible || !windowClosed) return;
    const timer = setTimeout(() => onEndSessionRef.current(), AUTO_END_DELAY_MS);
    return () => clearTimeout(timer);
  }, [visible, windowClosed]);

  // Stable callback for timer
  const handleTimerComplete = React.useCallback(() => {
    setWindowClosed(true);
  }, []);

  const digits = String(correctCode).split('');
  const digitSize = digits.length <= 4 ? 52 : digits.length <= 6 ? 38 : 26;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <Hero flat className="flex-1 px-6" style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>

        {/* Which class, and whether the window is still open */}
        <View className="items-center">
          <View className={`flex-row items-center px-3 h-8 rounded-full ${windowClosed ? 'bg-white/10' : 'bg-success'}`}>
            <View className={`w-2 h-2 rounded-full mr-2 ${windowClosed ? 'bg-white/50' : 'bg-white'}`} />
            <Text className={`text-[11px] font-bold tracking-widest ${windowClosed ? 'text-white/70' : 'text-white'}`}>
              {windowClosed ? 'WINDOW CLOSED' : 'LIVE SESSION'}
            </Text>
          </View>
          <Text className="text-white text-2xl font-extrabold text-center mt-3" numberOfLines={2}>
            {subjectName}
          </Text>
        </View>

        {/* The code students type, large enough to read from the back of the room */}
        <View className="flex-1 justify-center">
          <View className="bg-white rounded-[32px] px-4 py-7 items-center" style={shadow.glow}>
            <Text className="text-light-muted text-xs font-bold tracking-widest mb-4">STUDENT VERIFICATION CODE</Text>
            <View
              className="flex-row justify-center self-stretch"
              accessible
              accessibilityLabel={`Verification code ${digits.join(' ')}`}
            >
              {digits.map((digit, i) => (
                <View
                  key={i}
                  className="flex-1 mx-1 rounded-2xl bg-light-primaryBg items-center justify-center"
                  style={{ height: digitSize + 36, maxWidth: 72 }}
                >
                  <Text className="text-navy font-extrabold" style={{ fontSize: digitSize }}>{digit}</Text>
                </View>
              ))}
            </View>

            <View className="flex-row items-center bg-success-bg px-4 h-10 rounded-full mt-5">
              <Ionicons name="people" size={16} color={colors.success} style={{ marginRight: 8 }} />
              <Text className="text-success text-[15px] font-bold">{presentCount} marked present</Text>
            </View>
          </View>

          <View className="items-center mt-8">
            <CountdownTimer
              key={visible ? `active-${sessionKey ?? ''}` : 'inactive'}
              duration={duration}
              size={132}
              strokeWidth={9}
              tone="dark"
              onComplete={handleTimerComplete}
            />
            <Text className="text-white/70 text-[13px] font-medium mt-4 text-center">
              {windowClosed ? 'Time is up. Preparing the lecture summary...' : 'Remaining time for submissions'}
            </Text>
          </View>
        </View>

        <View>
          <Text className="text-white/60 text-center text-[13px] leading-5 px-2">
            Show this code to your students. They have {duration} seconds to type it on their devices. Compare the present count with the headcount in the room.
          </Text>
          <Button
            title={windowClosed ? 'View Summary' : 'End Attendance Session'}
            onPress={onEndSession}
            loading={ending}
            variant={windowClosed ? 'primary' : 'dangerSoft'}
            icon={windowClosed ? 'stats-chart' : 'stop-circle-outline'}
            className="mt-5 w-full"
          />
        </View>
      </Hero>
    </Modal>
  );
}
