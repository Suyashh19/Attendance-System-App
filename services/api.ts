import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

// Set EXPO_PUBLIC_SERVER_URL (e.g. in a .env file) to point the app at a local or staging backend
export const SERVER_URL = (
  process.env.EXPO_PUBLIC_SERVER_URL || 'https://attendance-system-backend-uqgy.onrender.com'
).replace(/\/+$/, '');

export const BASE_URL = `${SERVER_URL}/api`;

export const API_ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
  },
  SUBJECTS: {
    MY: '/subjects/my',
    CREATE: '/subjects',
    DELETE: (id: number) => `/subjects/${id}`,
  },
  ENROLLMENTS: {
    ENROLL: '/enrollments/enroll',
    BY_SUBJECT: (id: number) => `/enrollments/${id}`,
    UNENROLL: (id: number) => `/enrollments/${id}/unenroll`,
    UPDATE_STATUS: (subjectId: number, studentId: number) => `/enrollments/subject/${subjectId}/student/${studentId}/status`,
  },
  SESSIONS: {
    START: '/sessions/start',
    END: (id: string | number) => `/sessions/${id}/end`,
    HISTORY: (subjectId: number) => `/sessions/${subjectId}/history`,
    ACTIVE: (subjectId: number) => `/sessions/${subjectId}/active`,
    RECENT: '/sessions/recent',
    MY_ACTIVE: '/sessions/my-active',
  },
  ATTENDANCE: {
    BASE: '/attendance',
    SUBMIT: '/attendance/submit',
    HISTORY: '/attendance/history',
    ANALYTICS: (subjectId: number) => `/attendance/subject/${subjectId}/analytics`,
    MY_RECORD: (subjectId: number) => `/attendance/subject/${subjectId}/my-record`,
    EDIT: (sessionId: string | number, studentId: number) => `/attendance/session/${sessionId}/student/${studentId}`,
    SESSION_DETAILS: (sessionId: string | number) => `/attendance/session/${sessionId}`,
  },
  LEAVES: {
    BASE: '/leaves',
    MINE: '/leaves/mine',
    BY_SUBJECT: (subjectId: number) => `/leaves/subject/${subjectId}`,
    APPROVE_ALL: (subjectId: number) => `/leaves/subject/${subjectId}/approve-all`,
    REVIEW: (id: number) => `/leaves/${id}/review`,
    CANCEL: (id: number) => `/leaves/${id}`,
  },
};

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Slow-request tracking ────────────────────────────────────────────────────
// The free Render server sleeps when idle and takes up to a minute to wake.
// A request still pending after this long shows the "waking up" banner.
const SLOW_REQUEST_MS = 3000;

export const useServerStatus = create<{ slowRequests: number }>(() => ({ slowRequests: 0 }));

const slowTimers = new WeakMap<object, { timer: ReturnType<typeof setTimeout>; fired: boolean }>();

function trackRequest(config: object) {
  const entry = {
    fired: false,
    timer: setTimeout(() => {
      entry.fired = true;
      useServerStatus.setState((s) => ({ slowRequests: s.slowRequests + 1 }));
    }, SLOW_REQUEST_MS),
  };
  slowTimers.set(config, entry);
}

function untrackRequest(config: object | undefined) {
  const entry = config && slowTimers.get(config);
  if (!entry) return;
  clearTimeout(entry.timer);
  slowTimers.delete(config);
  if (entry.fired) {
    useServerStatus.setState((s) => ({ slowRequests: Math.max(0, s.slowRequests - 1) }));
  }
}

// ─── Request Interceptor: Attach JWT ──────────────────────────────────────────
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    trackRequest(config);
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Token not found — continue without auth header
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ─── Response Interceptor: Global Error Handling ──────────────────────────────
api.interceptors.response.use(
  (response) => {
    untrackRequest(response.config);
    return response;
  },
  async (error: AxiosError) => {
    untrackRequest(error.config);

    // Friendly error for "Endpoint not found" (common when backend is updating)
    if (error.response?.status === 404 && (error.response.data as any)?.error === "Endpoint not found") {
      (error as any).message = "Server error. Please try again.";
    }

    // A 401 on a request that carried a token means the session is no longer valid.
    // Login and password checks answer 401/400 for a wrong password, which is not a dead session.
    const url = error.config?.url ?? '';
    const sentToken = !!error.config?.headers?.Authorization;
    const isCredentialCheck = url.includes('/auth/login') || url.includes('/auth/update-password');

    if (error.response?.status === 401 && sentToken && !isCredentialCheck) {
      await SecureStore.deleteItemAsync('auth_token').catch(() => null);
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  }
);

// The auth store registers its logout here (importing the store directly would be a circular import)
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

/**
 * Start waking the server (and its database) as soon as the app opens,
 * so it is up by the time the first real request goes out. Fire and forget.
 */
export function warmUpServer(): void {
  api.get('/health', { baseURL: SERVER_URL, params: { db: 1 } }).catch(() => null);
}

/** Best message to show the user for a failed request. */
export function getErrorMessage(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  if (err?.code === 'ECONNABORTED' || err?.message === 'Network Error') {
    return 'Could not reach the server. Check your internet connection and try again.';
  }
  return fallback;
}

export default api;
