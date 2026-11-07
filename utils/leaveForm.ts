import { dayKey } from './attendanceCalendar';

/** The same limits the server enforces, so mistakes are caught before the request is sent. */
export const MAX_LEAVE_DAYS = 30;
export const MAX_DAYS_BACK = 7;
export const MAX_DAYS_AHEAD = 90;
export const MIN_REASON_LENGTH = 3;
export const MAX_REASON_LENGTH = 300;

const DAY_MS = 24 * 60 * 60 * 1000;

/** A local calendar date as "YYYY-MM-DD", which is what the server stores. */
export function toDayString(date: Date): string {
  return dayKey(date);
}

/** "2026-10-27" as a local date at midnight. */
export function fromDayString(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

/** Days from the first to the last day, counting both. */
export function leaveDays(fromDay: string, toDay: string): number {
  return dayNumber(toDay) - dayNumber(fromDay) + 1;
}

const short = (date: Date, withYear: boolean) =>
  date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });

/** "27 Oct 2026" for one day, "27 – 29 Oct 2026" within a month, "30 Oct – 2 Nov 2026" across months. */
export function formatLeaveRange(fromDay: string, toDay: string): string {
  const from = fromDayString(fromDay);
  const to = fromDayString(toDay);
  if (fromDay === toDay) return short(from, true);

  if (from.getFullYear() !== to.getFullYear()) return `${short(from, true)} – ${short(to, true)}`;
  if (from.getMonth() === to.getMonth()) return `${from.getDate()} – ${short(to, true)}`;
  return `${short(from, false)} – ${short(to, true)}`;
}

export interface LeaveForm {
  subjectIds: number[];
  fromDay: string;
  toDay: string;
  reason: string;
}

/** The first thing wrong with the form, or null when it can be sent. */
export function leaveFormError(form: LeaveForm, today: string): string | null {
  if (form.subjectIds.length === 0) return 'Choose at least one subject.';
  if (form.toDay < form.fromDay) return 'The last day cannot be before the first day.';
  if (dayNumber(today) - dayNumber(form.fromDay) > MAX_DAYS_BACK) {
    return `Leave can start at most ${MAX_DAYS_BACK} days in the past.`;
  }
  if (dayNumber(form.toDay) - dayNumber(today) > MAX_DAYS_AHEAD) {
    return `Leave cannot end more than ${MAX_DAYS_AHEAD} days from now.`;
  }
  if (leaveDays(form.fromDay, form.toDay) > MAX_LEAVE_DAYS) {
    return `One request can cover at most ${MAX_LEAVE_DAYS} days.`;
  }
  if (form.reason.trim().length < MIN_REASON_LENGTH) return 'Please give a reason for the leave.';
  return null;
}

/** The earliest and latest day the date pickers should offer. */
export function pickerBounds(now: Date = new Date()): { min: Date; max: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    min: new Date(start.getTime() - MAX_DAYS_BACK * DAY_MS),
    max: new Date(start.getTime() + MAX_DAYS_AHEAD * DAY_MS),
  };
}
