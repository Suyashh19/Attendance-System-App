import type { Subject, SubjectSummary } from '../types';

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;

/** The delete confirmation: says exactly what will be lost when the numbers are known. */
export function deleteWarning(subjectName: string, summary: SubjectSummary | null): string {
  const loss = summary
    ? `This permanently removes ${plural(summary.lectures, 'lecture', 'lectures')}, ` +
      `${plural(summary.records, 'attendance record', 'attendance records')} and ` +
      `${plural(summary.students, 'student enrollment', 'student enrollments')}.`
    : 'This permanently wipes all attendance data for this class.';

  return `Delete "${subjectName}"?\n\n${loss}\n\nIf you want to keep a record, download the Excel file from Reports first.`;
}

/** What faculty send to students on WhatsApp so they can join the class. */
export function shareMessage(subject: Pick<Subject, 'name' | 'code' | 'type' | 'span'>): string {
  const kind = subject.type === 'practical' ? 'Practical' : 'Theory';
  const label = [subject.name, kind, subject.span].filter(Boolean).join(' · ');
  return (
    `Join ${label} on the Attendance System app.\n\n` +
    `Subject code: ${subject.code}\n\n` +
    `Open the app, tap Enroll on the Classes tab and enter this code.`
  );
}

/** The line under a subject's name: code, type and semester label. */
export function subjectSubtitle(subject: Pick<Subject, 'code' | 'type' | 'span'>): string {
  return [subject.code, subject.type === 'practical' ? 'Practical' : 'Theory', subject.span].filter(Boolean).join(' · ');
}
