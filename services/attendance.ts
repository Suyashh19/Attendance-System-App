import api, { API_ROUTES } from './api';
import type { AttendanceRecord, Subject, SubmitAttendancePayload, AttendanceResult, SubjectHistory, RecentSession, SessionDetailsResponse } from '../types';

// ... (rest of imports remains same)

// ... (existing functions)

export async function getRecentSessions(): Promise<RecentSession[]> {
  const { data } = await api.get(API_ROUTES.SESSIONS.RECENT);
  return data.sessions;
}

export async function getSessionDetails(sessionId: string | number): Promise<SessionDetailsResponse> {
  const { data } = await api.get(API_ROUTES.ATTENDANCE.SESSION_DETAILS(sessionId));
  return data;
}

// ─── Register Push Token with Backend ────────────────────────────────────────
export async function getMySubjects(): Promise<Subject[]> {
  const { data } = await api.get(API_ROUTES.SUBJECTS.MY);
  return Array.isArray(data) ? data : (data.subjects ?? []);
}

export async function createSubject(name: string, code: string, type: 'theory' | 'practical'): Promise<Subject> {
  const { data } = await api.post('/subjects', { name, code, type });
  return data.subject;
}

export async function enrollInSubject(code: string): Promise<void> {
  // Corrected endpoint path to match backend /api/enrollments/enroll
  await api.post(API_ROUTES.ENROLLMENTS.ENROLL, { subjectCode: code });
}

export async function deleteSubject(subjectId: number): Promise<void> {
  await api.delete(API_ROUTES.SUBJECTS.DELETE(subjectId));
}

export async function unenrollSubject(subjectId: number): Promise<void> {
  await api.delete(API_ROUTES.ENROLLMENTS.UNENROLL(subjectId));
}

export async function getSubjectEnrollments(subjectId: number) {
  const { data } = await api.get(API_ROUTES.ENROLLMENTS.BY_SUBJECT(subjectId));
  return data.students;
}

export async function updateEnrollmentStatus(subjectId: number, studentId: number, status: 'APPROVED' | 'REJECTED' | 'PENDING') {
  const { data } = await api.put(API_ROUTES.ENROLLMENTS.UPDATE_STATUS(subjectId, studentId), { status });
  return data;
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
export async function getAttendanceHistory(): Promise<SubjectHistory[]> {
  const { data } = await api.get(API_ROUTES.ATTENDANCE.HISTORY);
  return Array.isArray(data) ? data : (data.records ?? data.history ?? []);
}

export async function deleteSubjectHistory(subjectId: number): Promise<void> {
  await api.delete(`${API_ROUTES.ATTENDANCE.BASE}/subject/${subjectId}`);
}

// ─── Submit Attendance ────────────────────────────────────────────────────────
export async function submitAttendance(payload: SubmitAttendancePayload): Promise<AttendanceResult> {
  const { data } = await api.post<AttendanceResult>(API_ROUTES.ATTENDANCE.SUBMIT, payload);
  return data;
}

export async function getSubjectAnalytics(subjectId: number) {
  const { data } = await api.get(API_ROUTES.ATTENDANCE.ANALYTICS(subjectId));
  return data;
}

export async function editAttendanceRecord(sessionId: string | number, studentId: number, status: string, reason?: string) {
  const { data } = await api.put(API_ROUTES.ATTENDANCE.EDIT(sessionId, studentId), { status, reason });
  return data;
}

// ─── Register Push Token with Backend ────────────────────────────────────────
export async function registerPushToken(expoPushToken: string): Promise<void> {
  await api.post(API_ROUTES.AUTH.PUSH_TOKEN, { token: expoPushToken }).catch(() => {
    // Non-critical — don't throw
  });
}
