import {
  buildDayMap,
  buildWeeks,
  dayKey,
  monthLabels,
  semesterRange,
  semesterSpanLabel,
  startingWeek,
  streaks,
  weekdayInsight,
} from '../utils/attendanceCalendar';

// Local-time dates, so the tests do not depend on the machine's timezone
const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).toISOString();

describe('semesterRange', () => {
  it('maps Odd to June-December and Even to January-May of the next year', () => {
    expect(semesterRange('2026-27 Odd')).toEqual({ start: new Date(2026, 5, 1), end: new Date(2026, 11, 31) });
    expect(semesterRange('2026-27 Even')).toEqual({ start: new Date(2027, 0, 1), end: new Date(2027, 4, 31) });
  });

  it('covers both semesters for a bare academic year', () => {
    expect(semesterRange('2026-27')).toEqual({ start: new Date(2026, 5, 1), end: new Date(2027, 4, 31) });
  });

  it('has no range for all time or other', () => {
    expect(semesterRange('all')).toBeNull();
    expect(semesterRange('other')).toBeNull();
  });
});

describe('buildDayMap', () => {
  const range = semesterRange('2026-27 Odd')!;

  it('marks a day present, absent or mixed from all its classes', () => {
    const map = buildDayMap(
      [
        { name: 'DS', records: [{ date: at(2026, 10, 12, 9), status: 'PRESENT' }, { date: at(2026, 10, 13), status: 'ABSENT' }, { date: at(2026, 10, 14), status: 'PRESENT' }] },
        { name: 'OS', records: [{ date: at(2026, 10, 12, 14), status: 'PRESENT' }, { date: at(2026, 10, 13, 14), status: 'INVALID' }, { date: at(2026, 10, 14, 14), status: 'ABSENT' }] },
      ],
      range
    );
    expect(map.get('2026-10-12')?.state).toBe('present');
    expect(map.get('2026-10-13')?.state).toBe('absent');
    expect(map.get('2026-10-14')?.state).toBe('mixed');
    expect(map.get('2026-10-12')?.entries).toEqual([
      { subject: 'DS', status: 'PRESENT' },
      { subject: 'OS', status: 'PRESENT' },
    ]);
  });

  it('ignores records outside the semester and unreadable dates', () => {
    const map = buildDayMap(
      [{ name: 'DS', records: [{ date: at(2026, 5, 31), status: 'PRESENT' }, { date: at(2027, 1, 5), status: 'PRESENT' }, { date: 'nonsense', status: 'PRESENT' }] }],
      range
    );
    expect(map.size).toBe(0);
  });

  it('keeps the first and last day of the semester', () => {
    const map = buildDayMap([{ name: 'DS', records: [{ date: at(2026, 6, 1, 0), status: 'PRESENT' }, { date: at(2026, 12, 31, 23), status: 'PRESENT' }] }], range);
    expect([...map.keys()]).toEqual(['2026-06-01', '2026-12-31']);
  });
});

describe('buildWeeks / monthLabels', () => {
  const range = semesterRange('2026-27 Odd')!;
  const weeks = buildWeeks(range);

  it('starts every week on Monday and covers the whole semester', () => {
    expect(weeks.every((w) => w.length === 7 && w[0].date.getDay() === 1)).toBe(true);
    expect(weeks[0].some((c) => c.key === '2026-06-01')).toBe(true);
    expect(weeks[weeks.length - 1].some((c) => c.key === '2026-12-31')).toBe(true);
  });

  it('leaves days outside the semester blank', () => {
    // 1 June 2026 is a Monday, so the first week has no blanks; 31 December 2026 is a Thursday
    expect(weeks[0].every((c) => c.inRange)).toBe(true);
    const lastWeek = weeks[weeks.length - 1];
    expect(lastWeek.filter((c) => c.inRange)).toHaveLength(4);
  });

  it('names each month once, at the column where it starts', () => {
    const labels = monthLabels(weeks);
    expect(labels.map((l) => l.label)).toEqual(['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
    expect(labels[0].index).toBe(0);
    expect(new Set(labels.map((l) => l.index)).size).toBe(labels.length);
  });
});

describe('startingWeek', () => {
  const range = semesterRange('2026-27 Odd')!;
  const weeks = buildWeeks(range);

  it('opens on this week during the semester', () => {
    const idx = startingWeek(weeks, new Map(), new Date(2026, 9, 27));
    expect(weeks[idx].some((c) => c.key === '2026-10-27')).toBe(true);
  });

  it('opens on the last week with a class once the semester is over', () => {
    const map = buildDayMap([{ name: 'DS', records: [{ date: at(2026, 11, 20), status: 'PRESENT' }] }], range);
    const idx = startingWeek(weeks, map, new Date(2027, 2, 1));
    expect(weeks[idx].some((c) => c.key === '2026-11-20')).toBe(true);
  });

  it('falls back to the first week with nothing recorded', () => {
    expect(startingWeek(weeks, new Map(), new Date(2027, 2, 1))).toBe(0);
  });
});

describe('streaks', () => {
  const day = (state: 'present' | 'absent' | 'mixed') => ({ state, entries: [] });

  it('counts runs of fully present class days; days without a class do not break a run', () => {
    const map = new Map([
      ['2026-10-01', day('present')],
      ['2026-10-02', day('present')],
      ['2026-10-05', day('present')], // a weekend with no class in between
      ['2026-10-06', day('mixed')],
      ['2026-10-07', day('present')],
      ['2026-10-08', day('present')],
    ]);
    expect(streaks(map)).toEqual({ current: 2, best: 3 });
  });

  it('is zero when the latest class day was missed', () => {
    const map = new Map([['2026-10-01', day('present')], ['2026-10-02', day('absent')]]);
    expect(streaks(map)).toEqual({ current: 0, best: 1 });
  });

  it('is zero with no classes', () => {
    expect(streaks(new Map())).toEqual({ current: 0, best: 0 });
  });
});

describe('weekdayInsight', () => {
  // Mondays in October 2026: 5, 12, 19, 26
  const build = (rows: [number, number, string][]) =>
    new Map(
      rows.map(([m, d, status]) => [
        dayKey(new Date(2026, m - 1, d)),
        { state: status === 'PRESENT' ? ('present' as const) : ('absent' as const), entries: [{ subject: 'DS', status }] },
      ])
    );

  it('names the weekday missed far more than the rest', () => {
    const map = build([
      [10, 5, 'ABSENT'], [10, 12, 'ABSENT'], [10, 19, 'ABSENT'], [10, 26, 'PRESENT'], // Mondays
      [10, 6, 'PRESENT'], [10, 13, 'PRESENT'], [10, 20, 'PRESENT'], [10, 27, 'PRESENT'], // Tuesdays
      [10, 7, 'PRESENT'], [10, 14, 'PRESENT'], // Wednesdays
    ]);
    expect(weekdayInsight(map)).toEqual({ weekday: 'Mondays', missed: 3, total: 4 });
  });

  it('gives nothing when there are too few classes', () => {
    expect(weekdayInsight(build([[10, 5, 'ABSENT'], [10, 12, 'ABSENT'], [10, 19, 'ABSENT']]))).toBeNull();
  });

  it('gives nothing when absences are spread evenly', () => {
    const map = build([
      [10, 5, 'ABSENT'], [10, 12, 'PRESENT'], [10, 19, 'PRESENT'], [10, 26, 'PRESENT'],
      [10, 6, 'ABSENT'], [10, 13, 'PRESENT'], [10, 20, 'PRESENT'], [10, 27, 'PRESENT'],
      [10, 7, 'ABSENT'], [10, 14, 'PRESENT'],
    ]);
    expect(weekdayInsight(map)).toBeNull();
  });
});

describe('semesterSpanLabel', () => {
  it('writes the months a semester covers', () => {
    expect(semesterSpanLabel('2026-27 Odd')).toBe('Jun – Dec 2026');
    expect(semesterSpanLabel('2026-27 Even')).toBe('Jan – May 2027');
    expect(semesterSpanLabel('2026-27')).toBe('Jun 2026 – May 2027');
  });

  it('has no label for all time or other', () => {
    expect(semesterSpanLabel('all')).toBeNull();
    expect(semesterSpanLabel('other')).toBeNull();
  });
});

describe('excused classes (approved leave)', () => {
  const range = semesterRange('2026-27 Odd')!;

  it('judges a day on the classes that were not excused', () => {
    const map = buildDayMap(
      [
        { name: 'DS', records: [{ date: at(2026, 10, 12), status: 'PRESENT' }, { date: at(2026, 10, 13), status: 'EXCUSED' }, { date: at(2026, 10, 14), status: 'ABSENT' }] },
        { name: 'OS', records: [{ date: at(2026, 10, 12, 14), status: 'EXCUSED' }, { date: at(2026, 10, 13, 14), status: 'EXCUSED' }, { date: at(2026, 10, 14, 14), status: 'EXCUSED' }] },
      ],
      range
    );
    expect(map.get('2026-10-12')?.state).toBe('present');
    expect(map.get('2026-10-13')?.state).toBe('excused');
    expect(map.get('2026-10-14')?.state).toBe('absent');
  });

  it('lets an excused day neither extend nor break a streak', () => {
    const day = (state: 'present' | 'absent' | 'mixed' | 'excused') => ({ state, entries: [] });
    const map = new Map([
      ['2026-10-01', day('present')],
      ['2026-10-02', day('excused')],
      ['2026-10-05', day('present')],
    ]);
    expect(streaks(map)).toEqual({ current: 2, best: 2 });
  });

  it('does not count excused classes when looking for a weekday pattern', () => {
    const entry = (status: string) => ({ state: 'present' as const, entries: [{ subject: 'DS', status }] });
    // Four Mondays all excused, plus enough present classes on other days to reach the minimum
    const map = new Map([
      ['2026-10-05', entry('EXCUSED')], ['2026-10-12', entry('EXCUSED')], ['2026-10-19', entry('EXCUSED')], ['2026-10-26', entry('EXCUSED')],
      ['2026-10-06', entry('PRESENT')], ['2026-10-13', entry('PRESENT')], ['2026-10-20', entry('PRESENT')], ['2026-10-27', entry('PRESENT')],
      ['2026-10-07', entry('PRESENT')], ['2026-10-14', entry('PRESENT')],
    ]);
    expect(weekdayInsight(map)).toBeNull();
  });
});
