import {
  DEFAULT_CALENDAR,
  academicYearOptions,
  currentAcademicYear,
  currentTerm,
  semesterBounds,
  setSemesterCalendar,
  validateCalendar,
} from '../utils/academicYear';
import { semesterRange, semesterSpanLabel } from '../utils/attendanceCalendar';
import { semesterStart } from '../utils/exportRange';
import { DEFAULT_SETTINGS, parseSettings, sameCalendar } from '../utils/settings';

// August to January is Odd, February to June is Even, July is the break
const AUG_START = { oddStart: 8, oddEnd: 1, evenStart: 2, evenEnd: 6 };

afterEach(() => setSemesterCalendar(DEFAULT_CALENDAR));

describe('validateCalendar', () => {
  it('accepts the standard months', () => {
    expect(validateCalendar(DEFAULT_CALENDAR)).toBeNull();
  });

  it('accepts a semester that runs past December', () => {
    expect(validateCalendar(AUG_START)).toBeNull();
  });

  it('accepts a break between the semesters', () => {
    expect(validateCalendar({ oddStart: 7, oddEnd: 11, evenStart: 1, evenEnd: 4 })).toBeNull();
  });

  it('rejects an Even semester that starts before Odd ends', () => {
    expect(validateCalendar({ oddStart: 6, oddEnd: 12, evenStart: 11, evenEnd: 5 })).toMatch(/after the Odd semester ends/);
  });

  it('rejects an Even semester that runs into the next Odd one', () => {
    expect(validateCalendar({ oddStart: 6, oddEnd: 10, evenStart: 11, evenEnd: 7 })).toMatch(/before the next Odd/);
  });

  it('rejects both semesters starting in the same month', () => {
    expect(validateCalendar({ oddStart: 6, oddEnd: 8, evenStart: 6, evenEnd: 12 })).not.toBeNull();
  });

  it('rejects a month outside 1 to 12', () => {
    expect(validateCalendar({ ...DEFAULT_CALENDAR, oddStart: 13 })).not.toBeNull();
    expect(validateCalendar({ ...DEFAULT_CALENDAR, evenEnd: 0 })).not.toBeNull();
  });
});

describe('the standard months', () => {
  it('give the same year and term as before', () => {
    expect(currentAcademicYear(new Date(2026, 9, 27))).toBe('2026-27');
    expect(currentTerm(new Date(2026, 9, 27))).toBe('Odd');
    expect(currentAcademicYear(new Date(2027, 1, 10))).toBe('2026-27');
    expect(currentTerm(new Date(2027, 1, 10))).toBe('Even');
    expect(currentTerm(new Date(2027, 5, 1))).toBe('Odd');
  });
});

describe('a college calendar that starts in August', () => {
  beforeEach(() => setSemesterCalendar(AUG_START));

  it('puts August to January in the Odd semester, the year of the August start', () => {
    expect(currentAcademicYear(new Date(2026, 9, 27))).toBe('2026-27');
    expect(currentTerm(new Date(2026, 9, 27))).toBe('Odd');
    expect(currentAcademicYear(new Date(2027, 0, 15))).toBe('2026-27');
    expect(currentTerm(new Date(2027, 0, 15))).toBe('Odd');
  });

  it('puts February to June in the Even semester of the same year', () => {
    expect(currentAcademicYear(new Date(2027, 2, 3))).toBe('2026-27');
    expect(currentTerm(new Date(2027, 2, 3))).toBe('Even');
  });

  it('counts the July break as the start of the next year', () => {
    expect(currentAcademicYear(new Date(2027, 6, 10))).toBe('2027-28');
    expect(currentTerm(new Date(2027, 6, 10))).toBe('Odd');
  });

  it('offers academic years around the new current one', () => {
    expect(academicYearOptions(new Date(2026, 9, 27))).toEqual(['2027-28', '2026-27', '2025-26', '2024-25', '2023-24']);
  });

  it('gives the right dates for each semester', () => {
    expect(semesterRange('2026-27 Odd')).toEqual({ start: new Date(2026, 7, 1), end: new Date(2027, 0, 31) });
    expect(semesterRange('2026-27 Even')).toEqual({ start: new Date(2027, 1, 1), end: new Date(2027, 5, 30) });
    expect(semesterRange('2026-27')).toEqual({ start: new Date(2026, 7, 1), end: new Date(2027, 5, 30) });
  });

  it('labels the dates with the new months', () => {
    expect(semesterSpanLabel('2026-27 Odd')).toBe('Aug 2026 – Jan 2027');
    expect(semesterSpanLabel('2026-27 Even')).toBe('Feb – Jun 2027');
  });

  it('starts "this semester" reports on the first day of the running semester', () => {
    expect(semesterStart(new Date(2026, 9, 27))).toEqual(new Date(2026, 7, 1));
    expect(semesterStart(new Date(2027, 2, 3))).toEqual(new Date(2027, 1, 1));
    expect(semesterStart(new Date(2027, 0, 5))).toEqual(new Date(2026, 7, 1));
  });
});

describe('setSemesterCalendar', () => {
  it('ignores a calendar that cannot be used', () => {
    setSemesterCalendar({ oddStart: 6, oddEnd: 12, evenStart: 11, evenEnd: 5 });
    expect(currentTerm(new Date(2027, 1, 10))).toBe('Even');
    expect(semesterBounds(2026, 'Odd')).toEqual({ start: new Date(2026, 5, 1), end: new Date(2026, 11, 31) });
  });
});

describe('parseSettings', () => {
  it('uses the defaults when nothing is saved', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('')).toEqual(DEFAULT_SETTINGS);
  });

  it('uses the defaults for unreadable data', () => {
    expect(parseSettings('{not json')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('42')).toEqual(DEFAULT_SETTINGS);
  });

  it('reads saved settings back', () => {
    const saved = { calendar: AUG_START, confirmStart: false, homeStart: 'years', sessionSeconds: 12 };
    expect(parseSettings(JSON.stringify(saved))).toEqual(saved);
  });

  it('defaults the attendance time to 15 seconds', () => {
    expect(DEFAULT_SETTINGS.sessionSeconds).toBe(15);
    expect(parseSettings(JSON.stringify({ confirmStart: false })).sessionSeconds).toBe(15);
  });

  it('keeps any attendance time from 10 to 15 seconds', () => {
    for (const seconds of [10, 11, 12, 13, 14, 15]) {
      expect(parseSettings(JSON.stringify({ sessionSeconds: seconds })).sessionSeconds).toBe(seconds);
    }
  });

  it('replaces an attendance time outside 10-15 seconds with 15', () => {
    for (const bad of [9, 16, 0, 60, 12.5, '12', null]) {
      expect(parseSettings(JSON.stringify({ sessionSeconds: bad })).sessionSeconds).toBe(15);
    }
  });

  it('replaces an unusable calendar but keeps the other settings', () => {
    const saved = { calendar: { oddStart: 6, oddEnd: 12, evenStart: 11, evenEnd: 5 }, confirmStart: false, homeStart: 'years' };
    const read = parseSettings(JSON.stringify(saved));
    expect(sameCalendar(read.calendar, DEFAULT_CALENDAR)).toBe(true);
    expect(read.confirmStart).toBe(false);
    expect(read.homeStart).toBe('years');
  });

  it('fills in settings an older version never saved', () => {
    expect(parseSettings(JSON.stringify({ confirmStart: false }))).toEqual({ ...DEFAULT_SETTINGS, confirmStart: false });
  });
});
