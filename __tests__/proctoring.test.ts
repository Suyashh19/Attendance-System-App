import { VIOLATION_MESSAGES, resultAfterViolation, violationForAppState } from '../utils/proctoring';
import { isInCall } from '../modules/call-state';

describe('violationForAppState', () => {
  it('counts leaving the app', () => {
    expect(violationForAppState('background')).toBe('LEFT_APP');
  });

  it('ignores the notification shade and system dialogs, and coming back', () => {
    expect(violationForAppState('inactive')).toBeNull();
    expect(violationForAppState('active')).toBeNull();
  });
});

describe('resultAfterViolation', () => {
  it('never shows PRESENT once a violation was reported', () => {
    expect(resultAfterViolation('PRESENT', 'PHONE_CALL')).toBe('INVALID');
    expect(resultAfterViolation('PRESENT', 'LEFT_APP')).toBe('INVALID');
  });

  it('keeps other results as they are', () => {
    expect(resultAfterViolation('INVALID', 'LEFT_APP')).toBe('INVALID');
    expect(resultAfterViolation('PRESENT', null)).toBe('PRESENT');
  });
});

describe('violation messages', () => {
  it('match the reasons the server stores', () => {
    expect(VIOLATION_MESSAGES.PHONE_CALL).toBe('Was on a phone call during attendance');
    expect(VIOLATION_MESSAGES.LEFT_APP).toBe('Left the app during attendance');
  });
});

describe('isInCall', () => {
  it('reports no call where the native module is missing', () => {
    expect(isInCall()).toBe(false);
  });
});
