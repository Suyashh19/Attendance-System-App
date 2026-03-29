import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

export const BASE_URL = 'https://attendance-system-backend-uqgy.onrender.com/api';

export const API_ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PUSH_TOKEN: '/auth/push-token',
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
  },
  SESSIONS: {
    START: '/sessions/start',
    END: (id: string | number) => `/sessions/${id}/end`,
    HISTORY: (subjectId: number) => `/sessions/${subjectId}/history`,
    ACTIVE: (subjectId: number) => `/sessions/${subjectId}/active`,
  },
  ATTENDANCE: {
    BASE: '/attendance',
    SUBMIT: '/attendance/submit',
    HISTORY: '/attendance/history',
    ANALYTICS: (subjectId: number) => `/attendance/subject/${subjectId}/analytics`,
    MY_RECORD: (subjectId: number) => `/attendance/subject/${subjectId}/my-record`,
  }
};

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor: Attach JWT ──────────────────────────────────────────
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
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
  (response) => response,
  async (error: AxiosError) => {
    // Friendly error for "Endpoint not found" (common when backend is updating)
    if (error.response?.status === 404 && (error.response.data as any)?.error === "Endpoint not found") {
      (error as any).message = "Server error. Please try again.";
    }

    if (error.response?.status === 401) {
      // Token expired — clear storage
      await SecureStore.deleteItemAsync('auth_token').catch(() => null);
    }
    return Promise.reject(error);
  }
);

export default api;
