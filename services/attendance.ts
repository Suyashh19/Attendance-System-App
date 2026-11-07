import api, { API_ROUTES } from './api';
import type { AttendanceRecord, Subject, SubmitAttendancePayload, AttendanceResult, SubjectHistory, RecentSession, SessionDetailsResponse, EnrolledStudent, SubjectAnalytics, SubjectSession, SubjectSummary } from '../types';

// ... (rest of imports remains same)

// ... (existing functions)

// Fetches up to 100 so the Reports tab can search older classes; the list itself shows the newest 10
export async function getRecentSessions(limit = 100): Promise<RecentSession[]> {
  const { data } = await api.get(API_ROUTES.SESSIONS.RECENT, { params: { limit } });
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

export async function createSubject(name: string, code: string, type: 'theory' | 'practical', span?: string): Promise<Subject> {
  const { data } = await api.post('/subjects', { name, code, type, span });
  return data.subject;
}

// Send only the fields that changed; an empty span clears the semester label
export async function updateSubject(
  subjectId: number,
  changes: { name?: string; code?: string; type?: 'theory' | 'practical'; span?: string }
): Promise<Subject> {
  const { data } = await api.put(`/subjects/${subjectId}`, changes);
  return data.subject;
}

// What a delete would remove: lectures, attendance records and students
export async function getSubjectSummary(subjectId: number): Promise<SubjectSummary> {
  const { data } = await api.get(`/subjects/${subjectId}/summary`);
  return data;
}

// Approves every pending request for the subject; returns how many were approved
export async function approveAllEnrollments(subjectId: number): Promise<number> {
  const { data } = await api.put(`/enrollments/subject/${subjectId}/approve-all`);
  return data.approved ?? 0;
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

// Faculty: everyone who requested or joined the subject, whatever their status
export async function getSubjectEnrollments(subjectId: number): Promise<EnrolledStudent[]> {
  const { data } = await api.get(API_ROUTES.ENROLLMENTS.BY_SUBJECT(subjectId));
  return data.students ?? [];
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
}

export async function startSession(params: StartSessionParams) {
  const { data } = await api.post(API_ROUTES.SESSIONS.START, {
    subjectId: Number(params.subjectId),
    date: params.date,
    startTime: params.startTime,
    endTime: params.endTime
  });
  return data.session;
}

export async function endSession(sessionId: string | number) {
  const { data } = await api.post(API_ROUTES.SESSIONS.END(sessionId));
  return data;
}

// Faculty: the session they still have open, if any (used to reopen it after an app restart)
export async function getMyActiveSession() {
  const { data } = await api.get(API_ROUTES.SESSIONS.MY_ACTIVE);
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

// ─── Submit Attendance ────────────────────────────────────────────────────────
export async function submitAttendance(payload: SubmitAttendancePayload): Promise<AttendanceResult> {
  const { data } = await api.post<AttendanceResult>(API_ROUTES.ATTENDANCE.SUBMIT, payload);
  return data;
}

export async function getSubjectAnalytics(subjectId: number): Promise<SubjectAnalytics> {
  const { data } = await api.get(API_ROUTES.ATTENDANCE.ANALYTICS(subjectId));
  return data;
}

// Faculty: every lecture taken for a subject, newest first
export async function getSubjectSessions(subjectId: number): Promise<SubjectSession[]> {
  const { data } = await api.get(API_ROUTES.SESSIONS.HISTORY(subjectId));
  return data.history ?? [];
}

export async function editAttendanceRecord(sessionId: string | number, studentId: number, status: string, reason?: string) {
  const { data } = await api.put(API_ROUTES.ATTENDANCE.EDIT(sessionId, studentId), { status, reason });
  return data;
}
