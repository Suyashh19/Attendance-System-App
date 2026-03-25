import api, { API_ROUTES } from './api';
import type { AttendanceRecord, Subject, SubmitAttendancePayload, AttendanceResult } from '../types';

// ─── Subjects ────────────────────────────────────────────────────────────────
export async function getMySubjects(): Promise<Subject[]> {
  const { data } = await api.get(API_ROUTES.SUBJECTS.MY);
  return Array.isArray(data) ? data : (data.subjects ?? []);
}

export async function createSubject(name: string, code: string): Promise<Subject> {
  const { data } = await api.post(API_ROUTES.SUBJECTS.CREATE, { name, code });
  return data.subject || data;
}

export async function enrollInSubject(code: string): Promise<void> {
  // Corrected endpoint path to match backend /api/enrollments/enroll
  await api.post(API_ROUTES.ENROLLMENTS.ENROLL, { subjectCode: code });
}

// ─── Session Management (Faculty) ─────────────────────────────────────────────

interface StartSessionParams {
  subjectId: string | number;
  date: string;
  startTime: string;
  endTime: string;
  latitude?: number;
  longitude?: number;
}

export async function startSession(params: StartSessionParams) {
  const { data } = await api.post(API_ROUTES.SESSIONS.START, {
    subjectId: Number(params.subjectId),
    date: params.date,
    startTime: params.startTime,
    endTime: params.endTime,
    latitude: params.latitude,
    longitude: params.longitude
  });
  return data.session;
}

export async function endSession(sessionId: string | number) {
  const { data } = await api.post(API_ROUTES.SESSIONS.END(sessionId));
  return data;
}

export async function getActiveSession(subjectId: number) {
  const { data } = await api.get(API_ROUTES.SESSIONS.ACTIVE(subjectId));
  return data;
}

// ─── Attendance History ───────────────────────────────────────────────────────
export async function getAttendanceHistory(): Promise<AttendanceRecord[]> {
  const { data } = await api.get(API_ROUTES.ATTENDANCE.HISTORY);
  return Array.isArray(data) ? data : (data.records ?? data.history ?? []);
}

// ─── Submit Attendance ────────────────────────────────────────────────────────
export async function submitAttendance(payload: SubmitAttendancePayload): Promise<AttendanceResult> {
  const { data } = await api.post<AttendanceResult>(API_ROUTES.ATTENDANCE.SUBMIT, payload);
  return data;
}

// ─── Register Push Token with Backend ────────────────────────────────────────
export async function registerPushToken(expoPushToken: string): Promise<void> {
  await api.post(API_ROUTES.AUTH.PUSH_TOKEN, { token: expoPushToken }).catch(() => {
    // Non-critical — don't throw
  });
}
