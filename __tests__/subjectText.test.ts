import { deleteWarning, shareMessage, subjectSubtitle } from '../utils/subjectText';

describe('deleteWarning', () => {
  it('says exactly what will be removed', () => {
    const text = deleteWarning('Data Structures', { subjectId: 1, lectures: 42, records: 1260, students: 30 });
    expect(text).toContain('Delete "Data Structures"?');
    expect(text).toContain('42 lectures');
    expect(text).toContain('1,260 attendance records');
    expect(text).toContain('30 student enrollments');
    expect(text).toContain('download the Excel file');
  });

  it('uses singular wording for one of something', () => {
    const text = deleteWarning('Lab', { subjectId: 2, lectures: 1, records: 1, students: 1 });
    expect(text).toContain('1 lecture,');
    expect(text).toContain('1 attendance record ');
    expect(text).toContain('1 student enrollment.');
  });

  it('falls back to a general warning when the numbers could not be loaded', () => {
    const text = deleteWarning('Lab', null);
    expect(text).toContain('permanently wipes all attendance data');
  });
});

describe('shareMessage', () => {
  it('includes the code, class type and semester label', () => {
    const text = shareMessage({ name: 'Networks', code: 'CN301', type: 'practical', span: 'Sem 5' });
    expect(text).toContain('Networks · Practical · Sem 5');
    expect(text).toContain('Subject code: CN301');
    expect(text).toContain('Enroll');
  });

  it('leaves the label out when there is none', () => {
    const text = shareMessage({ name: 'Networks', code: 'CN301', type: 'theory', span: null });
    expect(text).toContain('Networks · Theory on');
  });
});

describe('subjectSubtitle', () => {
  it('joins code, type and semester label', () => {
    expect(subjectSubtitle({ code: 'CS402', type: 'theory', span: '2026-27' })).toBe('CS402 · Theory · 2026-27');
    expect(subjectSubtitle({ code: 'CS402', type: 'practical', span: null })).toBe('CS402 · Practical');
  });
});
