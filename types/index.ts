// ─── Auth ────────────────────────────────────────────────────────────────────
export type UserRole = 'student' | 'faculty';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  deviceId?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  deviceId: string | null;
  isAuthenticated: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ─── Subjects ────────────────────────────────────────────────────────────────
export interface Subject {
  id: string;
  name: string;
  code: string;
  facultyId: string;
  facultyName?: string;
}

// ─── Sessions ────────────────────────────────────────────────────────────────
export interface AttendanceSession {
  sessionId: string;
  subjectId: string;
  subjectName: string;
  correctCode: string;
  options: string[];          // shuffled - includes correct + fakes
  facultyLatitude: number;
  facultyLongitude: number;
  startedAt: string;          // ISO timestamp
  windowSeconds: number;      // 15
}

// ─── Attendance Submission ────────────────────────────────────────────────────
export interface SubmitAttendancePayload {
  sessionId: string;
  selectedCode: string;
  deviceId: string;
  latitude: number;
  longitude: number;
}

// ─── Attendance Result ────────────────────────────────────────────────────────
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'INVALID';

export interface AttendanceResult {
  status: AttendanceStatus;
  message?: string;
  sessionId?: string;
}

// ─── History ─────────────────────────────────────────────────────────────────
export interface AttendanceRecord {
  id: string;
  sessionId: string;
  subjectId: string;
  subjectName: string;
  status: AttendanceStatus;
  markedAt: string;
  date: string;
}

// ─── Verification State ───────────────────────────────────────────────────────
export interface VerificationState {
  sessionActive: boolean | null;
  deviceMatched: boolean | null;
  locationVerified: boolean | null;
  timeValid: boolean | null;
}

// ─── Socket Events ────────────────────────────────────────────────────────────
export interface SessionStartedPayload {
  sessionId: string;
  subjectId: string;
  subjectName: string;
  correctCode: string;
  options: string[];
  facultyLatitude: number;
  facultyLongitude: number;
  startedAt: string;
  windowSeconds: number;
}

export interface SessionEndedPayload {
  sessionId: string;
  subjectId: string;
}

export interface AttendanceResultPayload {
  status: AttendanceStatus;
  sessionId: string;
  message?: string;
}

// ─── API Response Wrapper ─────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
