// ─── Auth ────────────────────────────────────────────────────────────────────
export type UserRole = 'student' | 'faculty';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  deviceId?: string;
  prn?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  deviceId: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
  deviceId?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  otp: string;
  prn?: string;
  deviceId?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ─── Subjects ────────────────────────────────────────────────────────────────
export interface Subject {
  id: number;
  name: string;
  code: string;
  facultyId: number;
  type: 'theory' | 'practical';
  _count?: {
    enrollments: number;
  };
  enrollmentStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
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
  startTime: string;          // ISO timestamp
  windowSeconds: number;      // 15
  serverTime?: string;        // ISO timestamp
}

// ─── Attendance Submission ────────────────────────────────────────────────────
export interface SubmitAttendancePayload {
  sessionId: string;
  selectedCode: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  isRetry?: boolean;
}

// ─── Attendance Result ────────────────────────────────────────────────────────
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'INVALID' | 'EXPIRED';

export interface AttendanceResult {
  status: AttendanceStatus;
  message?: string;
  reason?: string;
  attendance?: any;
  sessionId: string;
  serverTime?: string;
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
  sessionActive: boolean | null | 'ready';
  deviceMatched: boolean | null | 'ready';
  locationVerified: boolean | null | 'ready';
  timeValid: boolean | null | 'ready';
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
  startTime: string;
  windowExpiry: string;
  windowSeconds: number;
  serverTime: string;
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

export interface HistoryRecord {
  id: number;
  status: 'PRESENT' | 'ABSENT' | 'INVALID';
  date: string;
  reason?: string;
  submittedAt?: string;
}

export interface SubjectHistory {
  id: number;
  name: string;
  code: string;
  type: 'theory' | 'practical';
  records: HistoryRecord[];
  stats: {
    PRESENT: number;
    ABSENT: number;
    INVALID: number;
    total: number;
  };
}

// ─── Faculty Reports ──────────────────────────────────────────────────────────
export interface RecentSession {
  id: number;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  subjectType: 'theory' | 'practical';
  startTime: string;
  endTime: string | null;
  presentCount: number;
  totalEnrolled: number;
}

export interface SessionStudentAttendance {
  id: number;
  name: string;
  prn: string | null;
  rollNo: string | null;
  status: 'PRESENT' | 'ABSENT';
  reason: string | null;
  editedByFaculty: boolean;
}

export interface SessionDetailsResponse {
  session: {
    id: number;
    date: string;
    subjectName: string;
    subjectCode: string;
    subjectType: 'theory' | 'practical';
  };
  students: SessionStudentAttendance[];
}
