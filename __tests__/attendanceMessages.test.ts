import { friendlyFailure } from '../utils/attendanceMessages';

describe('friendlyFailure', () => {
  it('explains a late submission', () => {
    expect(friendlyFailure('Attendance window expired (3s ago)').desc).toMatch(/few seconds late/);
  });

  it('tells a student on the wrong phone how to link it', () => {
    expect(friendlyFailure('Device mismatch. Expected registered device.').desc).toMatch(/Use This Phone/);
  });

  it('tells apart a phone that belongs to another account', () => {
    const desc = friendlyFailure('Device already registered to another user!').desc;
    expect(desc).toMatch(/another student/);
    expect(desc).not.toMatch(/Use This Phone/);
  });

  it('explains too many wrong codes', () => {
    expect(friendlyFailure('Incorrect attendance code entered').desc).toMatch(/wrongly too many times/);
  });

  it('explains a pending or rejected enrollment', () => {
    expect(friendlyFailure('Your enrollment is pending approval or was rejected').desc).toMatch(/approved/);
  });

  it('explains a closed session', () => {
    expect(friendlyFailure('Session is no longer active').desc).toMatch(/closed/);
  });

  it('keeps an unknown reason visible instead of hiding it', () => {
    expect(friendlyFailure('Something new from the server').desc).toBe('Reason: Something new from the server');
  });

  it('handles a missing reason', () => {
    expect(friendlyFailure(undefined).desc).toMatch(/teacher/);
    expect(friendlyFailure('').title).toBe("Couldn't mark attendance");
  });
});
