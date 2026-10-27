import {
  academicYearOptions,
  currentAcademicYear,
  currentTerm,
  formatSpan,
  groupByAcademicYear,
  parseSpan,
  subjectsInTerm,
  termsPresent,
  OTHER_YEAR,
} from '../utils/academicYear';

describe('current year and term', () => {
  it('starts the year in June, with Odd until December', () => {
    expect(currentAcademicYear(new Date(2026, 9, 27))).toBe('2026-27');
    expect(currentTerm(new Date(2026, 9, 27))).toBe('Odd');
    expect(currentAcademicYear(new Date(2026, 5, 1))).toBe('2026-27');
  });

  it('keeps the same year in January to May, with the Even term', () => {
    expect(currentAcademicYear(new Date(2027, 1, 10))).toBe('2026-27');
    expect(currentTerm(new Date(2027, 1, 10))).toBe('Even');
    expect(currentTerm(new Date(2027, 4, 31))).toBe('Even');
  });

  it('wraps the century in the label', () => {
    expect(currentAcademicYear(new Date(2099, 8, 1))).toBe('2099-00');
  });
});

describe('academicYearOptions', () => {
  it('offers the next year, the current one and three before it, newest first', () => {
    expect(academicYearOptions(new Date(2026, 9, 27))).toEqual(['2027-28', '2026-27', '2025-26', '2024-25', '2023-24']);
  });
});

describe('parseSpan / formatSpan', () => {
  it('splits a year and term', () => {
    expect(parseSpan('2026-27 Odd')).toEqual({ year: '2026-27', term: 'Odd' });
    expect(parseSpan('2026-27')).toEqual({ year: '2026-27', term: null });
  });

  it('treats old free-text labels and empty values as no year', () => {
    expect(parseSpan('Sem 5')).toBeNull();
    expect(parseSpan('')).toBeNull();
    expect(parseSpan(null)).toBeNull();
    expect(parseSpan(undefined)).toBeNull();
  });

  it('joins a year and term back together', () => {
    expect(formatSpan('2026-27', 'Even')).toBe('2026-27 Even');
    expect(formatSpan('2026-27', null)).toBe('2026-27');
  });
});

describe('groupByAcademicYear', () => {
  const subjects = [
    { name: 'A', span: '2025-26 Even' },
    { name: 'B', span: '2026-27 Odd' },
    { name: 'C', span: '2026-27 Odd' },
    { name: 'D', span: '2026-27 Even' },
    { name: 'E', span: '2026-27' },
    { name: 'F', span: 'Sem 5' },
    { name: 'G', span: null },
  ];

  it('groups newest year first with Other last', () => {
    const groups = groupByAcademicYear(subjects);
    expect(groups.map((g) => g.key)).toEqual(['2026-27', '2025-26', OTHER_YEAR]);
    expect(groups[2].label).toBe('Other');
  });

  it('counts subjects per term', () => {
    const [current, previous, other] = groupByAcademicYear(subjects);
    expect(current.counts).toEqual({ Odd: 2, Even: 1, none: 1 });
    expect(previous.counts).toEqual({ Odd: 0, Even: 1, none: 0 });
    expect(other.counts).toEqual({ Odd: 0, Even: 0, none: 2 });
  });

  it('lists the terms present and picks a term\'s subjects', () => {
    const [current] = groupByAcademicYear(subjects);
    expect(termsPresent(current)).toEqual(['Odd', 'Even', null]);
    expect(subjectsInTerm(current.subjects, 'Odd').map((s) => s.name)).toEqual(['B', 'C']);
    expect(subjectsInTerm(current.subjects, null).map((s) => s.name)).toEqual(['E']);
  });

  it('returns no groups for no subjects', () => {
    expect(groupByAcademicYear([])).toEqual([]);
  });
});
