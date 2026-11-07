import type { AppStateStatus } from 'react-native';
import type { Violation } from '../types';

/** What the student sees; the same wording the server stores as the reason. */
export const VIOLATION_MESSAGES: Record<Violation, string> = {
  PHONE_CALL: 'Was on a phone call during attendance',
  LEFT_APP: 'Left the app during attendance',
};

/**
 * Leaving the app (switching apps, going home, locking the phone) counts; the brief
 * "inactive" state of a notification shade or system dialog does not.
 */
export function violationForAppState(next: AppStateStatus): Violation | null {
  return next === 'background' ? 'LEFT_APP' : null;
}

/** A PRESENT that arrives after a violation was already reported must not replace the INVALID. */
export function resultAfterViolation<T extends string>(status: T, violation: Violation | null): T | 'INVALID' {
  return violation && status === 'PRESENT' ? 'INVALID' : status;
}
