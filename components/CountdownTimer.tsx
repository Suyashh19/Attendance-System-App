import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
 useSharedValue,
 useAnimatedProps,
 withTiming,
 Easing,
 interpolateColor,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../constants/theme';
import { Text } from './Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Ring colour as time runs out: plenty of time -> hurry -> almost over
const RING_COLORS = [colors.success, colors.warning, colors.danger];

interface CountdownTimerProps {
 duration: number; // in seconds
 onComplete?: () => void;
 size?: number;
 strokeWidth?: number;
 /** dark: white numbers, for use on the hero gradient */
 tone?: 'light' | 'dark';
}

export function CountdownTimer({
 duration,
 onComplete,
 size = 120,
 strokeWidth = 8,
 tone = 'light',
}: CountdownTimerProps) {
 const radius = (size - strokeWidth) / 2;
 const circumference = radius * 2 * Math.PI;

 const progress = useSharedValue(1);
 const colorProgress = useSharedValue(0);

 const [timeLeft, setTimeLeft] = React.useState(Number(duration) || 15);

 const onCompleteRef = useRef(onComplete);
 const intervalRef = useRef<NodeJS.Timeout | null>(null);
 const isStarted = useRef(false);

 // Update ref when onComplete changes without re-triggering effect
 useEffect(() => {
 onCompleteRef.current = onComplete;
 }, [onComplete]);

 useEffect(() => {
 // Only initialize once for a given duration/session
 if (isStarted.current) return;
 
 const effectiveDuration = Math.max(0, Number(duration) || 0);
 setTimeLeft(effectiveDuration);

 if (effectiveDuration <= 0) {
 if (onCompleteRef.current) onCompleteRef.current();
 return;
 }

 isStarted.current = true;

 // Animate stroke dashoffset
 progress.value = withTiming(0, {
 duration: effectiveDuration * 1000,
 easing: Easing.linear,
 });

 // Animate color from green (0) to red (1)
 colorProgress.value = withTiming(1, {
 duration: effectiveDuration * 1000,
 easing: Easing.linear,
 });

 // Update text
 intervalRef.current = setInterval(() => {
 setTimeLeft((prev) => {
 if (prev <= 1) {
 if (intervalRef.current) clearInterval(intervalRef.current);
 if (onCompleteRef.current) onCompleteRef.current();
 return 0;
 }
 return prev - 1;
 });
 }, 1000);

 return () => {
 if (intervalRef.current) clearInterval(intervalRef.current);
 };
 }, [duration]); // Only reset if duration changes (e.g. new session)

 const animatedProps = useAnimatedProps(() => {
 const strokeDashoffset = circumference - circumference * progress.value;
 const stroke = interpolateColor(
 colorProgress.value,
 [0, 0.5, 1],
 RING_COLORS
 );

 return {
 strokeDashoffset,
 stroke,
 };
 });

 return (
 <View className="items-center justify-center" style={{ width: size, height: size }}>
 <View className="absolute z-10 items-center justify-center">
 <Text className={`text-[40px] font-extrabold ${tone === 'dark' ? 'text-white' : 'text-light-text'}`}>{timeLeft}</Text>
 <Text className={`text-[10px] font-bold tracking-widest ${tone === 'dark' ? 'text-white/60' : 'text-light-muted'}`}>SECONDS</Text>
 </View>
 <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
 {/* Background track */}
 <Circle
 stroke={tone === 'dark' ? 'rgba(255, 255, 255, 0.14)' : colors.border}
 fill="none"
 cx={size / 2}
 cy={size / 2}
 r={radius}
 strokeWidth={strokeWidth}
 />
 {/* Animated progress */}
 <AnimatedCircle
 fill="none"
 cx={size / 2}
 cy={size / 2}
 r={radius}
 strokeWidth={strokeWidth}
 strokeDasharray={circumference}
 animatedProps={animatedProps}
 strokeLinecap="round"
 />
 </Svg>
 </View>
 );
}
