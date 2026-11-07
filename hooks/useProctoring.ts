import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { isInCall } from '../modules/call-state';
import { violationForAppState } from '../utils/proctoring';
import type { Violation } from '../types';

const CALL_CHECK_MS = 1000;

interface Options {
  /** Watch only while the attendance window is open */
  active: boolean;
  /** Called once per window, with the first rule the student broke */
  onViolation: (violation: Violation) => void;
  /** Called whenever the app comes back to the foreground during the window */
  onResume?: () => void;
}

/** Watches for a running call and for the student leaving the app during the attendance window. */
export function useProctoring({ active, onViolation, onResume }: Options) {
  const onViolationRef = useRef(onViolation);
  const onResumeRef = useRef(onResume);
  onViolationRef.current = onViolation;
  onResumeRef.current = onResume;

  useEffect(() => {
    if (!active) return;
    let reported = false;
    const report = (violation: Violation) => {
      if (reported) return;
      reported = true;
      onViolationRef.current(violation);
    };

    const checkCall = () => {
      if (isInCall()) report('PHONE_CALL');
    };
    checkCall();
    const timer = setInterval(checkCall, CALL_CHECK_MS);

    const sub = AppState.addEventListener('change', (next) => {
      const violation = violationForAppState(next);
      if (violation) report(violation);
      if (next === 'active') {
        checkCall();
        onResumeRef.current?.();
      }
    });

    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [active]);
}
