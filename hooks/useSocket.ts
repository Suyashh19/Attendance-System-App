import { useEffect, useRef } from 'react';
import {
  getSocket,
  joinSubjectRoom,
  leaveSubjectRoom,
  onSessionStarted,
  onSessionEnded,
  onAttendanceResult,
  onAttendanceCount,
} from '../services/socket';
import type { SessionStartedPayload, SessionEndedPayload, AttendanceResultPayload, AttendanceCountPayload } from '../types';
import { useAuthStore } from '../store/authStore';

interface UseSocketOptions {
  subjectIds?: string[];
  onSessionStarted?: (data: SessionStartedPayload) => void;
  onSessionEnded?: (data: SessionEndedPayload) => void;
  onAttendanceResult?: (data: AttendanceResultPayload) => void;
  onAttendanceCount?: (data: AttendanceCountPayload) => void;
}

export function useSocket(options: UseSocketOptions = {}): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const cleanupRefs = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();
    if (!socket) return;

    // Join subject rooms
    const subjectIds = options.subjectIds ?? [];
    subjectIds.forEach((id) => joinSubjectRoom(id));

    // Attach event listeners
    if (options.onSessionStarted) {
      const cleanup = onSessionStarted(options.onSessionStarted);
      cleanupRefs.current.push(cleanup);
    }
    if (options.onSessionEnded) {
      const cleanup = onSessionEnded(options.onSessionEnded);
      cleanupRefs.current.push(cleanup);
    }
    if (options.onAttendanceResult) {
      const cleanup = onAttendanceResult(options.onAttendanceResult);
      cleanupRefs.current.push(cleanup);
    }
    if (options.onAttendanceCount) {
      const cleanup = onAttendanceCount(options.onAttendanceCount);
      cleanupRefs.current.push(cleanup);
    }

    return () => {
      // Cleanup listeners
      cleanupRefs.current.forEach((fn) => fn());
      cleanupRefs.current = [];
      // Leave rooms
      subjectIds.forEach((id) => leaveSubjectRoom(id));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, (options.subjectIds ?? []).join(',')]);
}
