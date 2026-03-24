import api from './api';
import type { AttendanceRecord, Subject, SubmitAttendancePayload, AttendanceResult } from '../types';

// ─── Subjects ────────────────────────────────────────────────────────────────
export async function getMySubjects(): Promise<Subject[]> {
  const { data } = await api.get('/subjects/my');
  return Array.isArray(data) ? data : (data.subjects ?? []);
}

export async function createSubject(name: string, code: string): Promise<Subject> {
  const { data } = await api.post('/subjects', { name, code });
  return data.subject || data;
}

export async function enrollInSubject(code: string): Promise<void> {
  await api.post('/enrollments/enroll', { subjectCode: code });
}

// ─── Session Management (Faculty) ─────────────────────────────────────────────
export async function startSession(subjectId: string, latitude?: number, longitude?: number) {
  const { data } = await api.post('/sessions/start', { 
    subjectId: Number(subjectId), 
    latitude, 
    longitude 
  });
  return data.session;
}

export async function endSession(sessionId: string | number) {
  const { data } = await api.post(`/sessions/${sessionId}/end`);
  return data;
}

// ─── Attendance History ───────────────────────────────────────────────────────
export async function getAttendanceHistory(): Promise<AttendanceRecord[]> {
  const { data } = await api.get('/attendance/history');
  return Array.isArray(data) ? data : (data.records ?? data.history ?? []);
}

// ─── Submit Attendance ────────────────────────────────────────────────────────
export async function submitAttendance(payload: SubmitAttendancePayload): Promise<AttendanceResult> {
  const { data } = await api.post<AttendanceResult>('/attendance/submit', payload);
  return data;
}

// ─── Register Push Token with Backend ────────────────────────────────────────
export async function registerPushToken(expoPushToken: string): Promise<void> {
  await api.post('/auth/push-token', { token: expoPushToken }).catch(() => {
    // Non-critical — don't throw
  });
}
