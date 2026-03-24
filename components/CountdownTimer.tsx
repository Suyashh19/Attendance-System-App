import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CountdownTimerProps {
  duration: number; // in seconds
  onComplete?: () => void;
  size?: number;
  strokeWidth?: number;
}

export function CountdownTimer({
  duration,
  onComplete,
  size = 120,
  strokeWidth = 8,
}: CountdownTimerProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const progress = useSharedValue(1);
  const colorProgress = useSharedValue(0);

  const [timeLeft, setTimeLeft] = React.useState(duration);

  useEffect(() => {
    // Animate stroke dashoffset
    progress.value = withTiming(0, {
      duration: duration * 1000,
      easing: Easing.linear,
    });

    // Animate color from green (0) to red (1)
    colorProgress.value = withTiming(1, {
      duration: duration * 1000,
      easing: Easing.linear,
    });

    // Update text
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onComplete) onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - circumference * progress.value;
    const stroke = interpolateColor(
      colorProgress.value,
      [0, 0.5, 1],
      ['#10B981', '#F59E0B', '#EF4444'] // success -> warning -> danger
    );

    return {
      strokeDashoffset,
      stroke,
    };
  });

  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <View className="absolute z-10 items-center justify-center">
        <Text className="text-4xl font-bold text-white tracking-widest">{timeLeft}</Text>
        <Text className="text-xs text-dark-muted font-medium tracking-widest mt-1">SECONDS</Text>
      </View>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background track */}
        <Circle
          stroke="#1E293B" // dark.card
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
