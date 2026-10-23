import { filterSubjects, distinctSpans } from '../utils/subjectFilter';

const subjects = [
  { name: 'Data Structures', code: 'CS201', type: 'theory', span: 'Sem 3' },
  { name: 'Data Structures Lab', code: 'CS201', type: 'practical', span: 'Sem 3' },
  { name: 'Operating Systems', code: 'CS301', type: 'theory', span: '2026-27' },
  { name: 'Old Course', code: 'XX100', type: 'theory', span: null },
];

describe('filterSubjects', () => {
  it('returns everything with no category, search or span', () => {
    expect(filterSubjects(subjects, null, '')).toHaveLength(4);
  });

  it('filters by category', () => {
    expect(filterSubjects(subjects, 'practical', '').map((s) => s.name)).toEqual(['Data Structures Lab']);
  });

  it('matches the search text against name and code, ignoring case and spaces', () => {
    expect(filterSubjects(subjects, null, '  operating ')).toHaveLength(1);
    expect(filterSubjects(subjects, null, 'cs201')).toHaveLength(2);
  });

  it('combines category and search', () => {
    expect(filterSubjects(subjects, 'theory', 'cs201').map((s) => s.name)).toEqual(['Data Structures']);
  });

  it('filters by semester label', () => {
    expect(filterSubjects(subjects, null, '', 'Sem 3')).toHaveLength(2);
    expect(filterSubjects(subjects, null, '', '2026-27').map((s) => s.name)).toEqual(['Operating Systems']);
  });

  it('keeps subjects without a label out of a specific semester', () => {
    expect(filterSubjects(subjects, null, '', 'Sem 3').map((s) => s.name)).not.toContain('Old Course');
  });

  it('combines semester, category and search', () => {
    expect(filterSubjects(subjects, 'practical', 'lab', 'Sem 3')).toHaveLength(1);
    expect(filterSubjects(subjects, 'theory', 'lab', 'Sem 3')).toHaveLength(0);
  });

  it('returns nothing when nothing matches', () => {
    expect(filterSubjects(subjects, null, 'zzz')).toEqual([]);
  });
});

describe('distinctSpans', () => {
  it('lists each label once and skips subjects without one', () => {
    expect(distinctSpans(subjects).sort()).toEqual(['2026-27', 'Sem 3']);
  });

  it('puts higher semesters and later years first', () => {
    const spans = distinctSpans([{ span: 'Sem 2' }, { span: 'Sem 10' }, { span: 'Sem 5' }]);
    expect(spans).toEqual(['Sem 10', 'Sem 5', 'Sem 2']);
    expect(distinctSpans([{ span: '2025-26' }, { span: '2026-27' }])).toEqual(['2026-27', '2025-26']);
  });

  it('is empty when no subject has a label', () => {
    expect(distinctSpans([{ span: null }, {}])).toEqual([]);
  });
});
