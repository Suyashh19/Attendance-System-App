import {
  ALL_TIME,
  NO_LIST_FILTERS,
  applyStudentFilters,
  buildStudentList,
  classesCanMiss,
  defaultScope,
  inScope,
  isBelowMinimum,
  listFilterCount,
  percentOf,
  scopeOptions,
  studentListSummary,
  summarizeHistory,
} from '../utils/historyView';

const subject = (id: number, name: string, type: 'theory' | 'practical', present: number, total: number) => ({
  id,
  name,
  type,
  stats: { PRESENT: present, total },
});

const history = [
  subject(1, 'Data Structures', 'theory', 18, 20), // 90%
  subject(2, 'Data Structures Lab', 'practical', 6, 10), // 60%
  subject(3, 'Compilers', 'theory', 15, 20), // exactly 75%
  subject(4, 'Networks', 'theory', 30, 40), // 2025-26 Even, 75%
  subject(5, 'New Subject', 'theory', 0, 0),
];

const spans = new Map<number, string | null>([
  [1, '2026-27 Odd'],
  [2, '2026-27 Odd'],
  [3, '2026-27 Odd'],
  [4, '2025-26 Even'],
  [5, null],
]);

describe('minimum and margin', () => {
  it('flags only subjects under the minimum', () => {
    expect(isBelowMinimum(14, 20)).toBe(true);
    expect(isBelowMinimum(15, 20)).toBe(false);
    expect(isBelowMinimum(0, 0)).toBe(false);
  });

  it('counts the classes a student can still miss', () => {
    expect(classesCanMiss(15, 20)).toBe(0);
    expect(classesCanMiss(18, 20)).toBe(4);
    expect(classesCanMiss(20, 20)).toBe(6);
    expect(classesCanMiss(6, 10)).toBe(0);
    expect(classesCanMiss(0, 0)).toBe(0);
  });

  it('rounds the percentage and gives none when no class was held', () => {
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(0, 0)).toBeNull();
  });
});

describe('scope', () => {
  it('lists the semesters in use, newest first, with Other last', () => {
    expect(scopeOptions(history, spans).map((o) => o.label)).toEqual(['2026-27 · Odd', '2025-26 · Even', 'Other']);
  });

  it('puts Even before Odd within a year', () => {
    const both = new Map<number, string | null>([[1, '2026-27 Odd'], [2, '2026-27 Even']]);
    expect(scopeOptions([history[0], history[1]], both).map((o) => o.key)).toEqual(['2026-27 Even', '2026-27 Odd']);
  });

  it('opens on the running semester when the student has classes in it', () => {
    expect(defaultScope(scopeOptions(history, spans), new Date(2026, 9, 27))).toBe('2026-27 Odd');
  });

  it('falls back to the newest semester, then to all time', () => {
    const options = scopeOptions(history, spans);
    expect(defaultScope(options, new Date(2027, 1, 10))).toBe('2026-27 Odd');
    expect(defaultScope([], new Date(2026, 9, 27))).toBe(ALL_TIME);
  });

  it('keeps only the subjects of the chosen semester', () => {
    expect(inScope(history, '2026-27 Odd', spans).map((s) => s.id)).toEqual([1, 2, 3]);
    expect(inScope(history, 'other', spans).map((s) => s.id)).toEqual([5]);
    expect(inScope(history, ALL_TIME, spans)).toHaveLength(5);
  });
});

describe('summarizeHistory', () => {
  it('totals the classes and counts subjects under the minimum', () => {
    const s = summarizeHistory(inScope(history, '2026-27 Odd', spans));
    expect(s).toMatchObject({ present: 39, total: 50, missed: 11, percent: 78, belowCount: 1, heldCount: 3 });
    expect(s.weakest).toEqual({ name: 'Data Structures Lab', percent: 60 });
    expect(s.tightest).toBeNull();
  });

  it('splits theory and practical', () => {
    const s = summarizeHistory(inScope(history, '2026-27 Odd', spans));
    expect(s.byType.theory).toEqual({ present: 33, total: 40, percent: 83 });
    expect(s.byType.practical).toEqual({ present: 6, total: 10, percent: 60 });
  });

  it('names the subject with the least room when nothing is under the minimum', () => {
    const s = summarizeHistory([history[0], history[2]]);
    expect(s.belowCount).toBe(0);
    expect(s.weakest).toBeNull();
    expect(s.tightest).toEqual({ name: 'Compilers', canMiss: 0 });
  });

  it('handles a semester with no classes held', () => {
    const s = summarizeHistory([history[4]]);
    expect(s).toMatchObject({ total: 0, percent: null, belowCount: 0, heldCount: 0 });
    expect(s.byType.theory).toBeNull();
    expect(s.tightest).toBeNull();
  });
});

describe('buildStudentList', () => {
  it('lists subjects under the minimum first, then on track, then those with no classes', () => {
    const entries = buildStudentList(history);
    const text = entries.map((e) => (e.kind === 'header' ? `# ${e.label} (${e.count})` : e.subject.name));
    expect(text).toEqual([
      '# Needs attention (1)',
      'Data Structures Lab',
      '# On track (3)',
      'Compilers',
      'Networks',
      'Data Structures',
      '# No classes yet (1)',
      'New Subject',
    ]);
  });

  it('skips groups with nothing in them', () => {
    const entries = buildStudentList([history[0]]);
    expect(entries.map((e) => e.kind)).toEqual(['header', 'subject']);
  });

  it('returns nothing for no subjects', () => {
    expect(buildStudentList([])).toEqual([]);
  });
});

describe('applyStudentFilters', () => {
  const withCode = history.map((s) => ({ ...s, code: `C${s.id}00` }));
  const ids = (list: { id: number }[]) => list.map((s) => s.id);

  it('returns everything with no filter or search', () => {
    expect(applyStudentFilters(withCode, NO_LIST_FILTERS, '')).toHaveLength(5);
  });

  it('keeps only subjects under the minimum', () => {
    expect(ids(applyStudentFilters(withCode, { category: null, status: 'below' }, ''))).toEqual([2]);
  });

  it('keeps only subjects on track, leaving out those with no classes held', () => {
    expect(ids(applyStudentFilters(withCode, { category: null, status: 'ok' }, ''))).toEqual([1, 3, 4]);
  });

  it('filters by type and combines it with the status', () => {
    expect(ids(applyStudentFilters(withCode, { category: 'practical', status: 'all' }, ''))).toEqual([2]);
    expect(ids(applyStudentFilters(withCode, { category: 'theory', status: 'below' }, ''))).toEqual([]);
  });

  it('searches name and code, ignoring case and spaces', () => {
    expect(ids(applyStudentFilters(withCode, NO_LIST_FILTERS, '  data struct '))).toEqual([1, 2]);
    expect(ids(applyStudentFilters(withCode, NO_LIST_FILTERS, 'c300'))).toEqual([3]);
  });
});

describe('listFilterCount / studentListSummary', () => {
  it('counts the filters that are on', () => {
    expect(listFilterCount(NO_LIST_FILTERS)).toBe(0);
    expect(listFilterCount({ category: 'theory', status: 'below' })).toBe(2);
  });

  it('describes what is showing', () => {
    expect(studentListSummary(1, NO_LIST_FILTERS)).toBe('1 subject');
    expect(studentListSummary(3, { category: 'theory', status: 'below' })).toBe('3 subjects · Theory · Needs attention');
  });
});

describe('excused classes in the summary', () => {
  it('counts classes excused by leave without adding them to the total', () => {
    const list = [
      { id: 1, name: 'Data Structures', type: 'theory', stats: { PRESENT: 8, total: 10, EXCUSED: 2 } },
      { id: 2, name: 'Networks', type: 'theory', stats: { PRESENT: 5, total: 5 } },
    ];
    const s = summarizeHistory(list);
    expect(s).toMatchObject({ present: 13, total: 15, missed: 2, excused: 2, percent: 87 });
  });
});
