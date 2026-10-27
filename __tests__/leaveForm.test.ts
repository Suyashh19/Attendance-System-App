import {
  formatLeaveRange,
  fromDayString,
  leaveDays,
  leaveFormError,
  pickerBounds,
  toDayString,
} from '../utils/leaveForm';

const TODAY = '2026-10-27';
const form = (patch: Partial<Parameters<typeof leaveFormError>[0]> = {}) => ({
  subjectIds: [10],
  fromDay: TODAY,
  toDay: '2026-10-29',
  reason: 'Fever',
  ...patch,
});

describe('day strings', () => {
  it('round-trips a local date', () => {
    expect(toDayString(new Date(2026, 9, 7))).toBe('2026-10-07');
    expect(fromDayString('2026-10-07')).toEqual(new Date(2026, 9, 7));
  });

  it('counts both ends of a leave', () => {
    expect(leaveDays('2026-10-27', '2026-10-27')).toBe(1);
    expect(leaveDays('2026-10-27', '2026-10-29')).toBe(3);
    expect(leaveDays('2026-10-30', '2026-11-02')).toBe(4);
  });
});

describe('formatLeaveRange', () => {
  it('writes one day, a range in one month, across months and across years', () => {
    expect(formatLeaveRange('2026-10-27', '2026-10-27')).toBe('27 Oct 2026');
    expect(formatLeaveRange('2026-10-27', '2026-10-29')).toBe('27 – 29 Oct 2026');
    expect(formatLeaveRange('2026-10-30', '2026-11-02')).toBe('30 Oct – 2 Nov 2026');
    expect(formatLeaveRange('2026-12-30', '2027-01-02')).toBe('30 Dec 2026 – 2 Jan 2027');
  });
});

describe('leaveFormError', () => {
  it('accepts a sensible request', () => {
    expect(leaveFormError(form(), TODAY)).toBeNull();
    expect(leaveFormError(form({ fromDay: '2026-10-20', toDay: '2026-10-20' }), TODAY)).toBeNull();
  });

  it('explains what is missing or wrong', () => {
    expect(leaveFormError(form({ subjectIds: [] }), TODAY)).toMatch(/subject/);
    expect(leaveFormError(form({ toDay: '2026-10-26' }), TODAY)).toMatch(/before/);
    expect(leaveFormError(form({ fromDay: '2026-10-19', toDay: '2026-10-19' }), TODAY)).toMatch(/past/);
    expect(leaveFormError(form({ toDay: '2027-03-01' }), TODAY)).toMatch(/from now|at most/);
    expect(leaveFormError(form({ toDay: '2026-12-05' }), TODAY)).toMatch(/30 days/);
    expect(leaveFormError(form({ reason: '  ' }), TODAY)).toMatch(/reason/);
  });
});

describe('pickerBounds', () => {
  it('allows a week back and about three months ahead', () => {
    const { min, max } = pickerBounds(new Date(2026, 9, 27, 15, 30));
    expect(toDayString(min)).toBe('2026-10-20');
    expect(toDayString(max)).toBe('2027-01-25');
  });
});
