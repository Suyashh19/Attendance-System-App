import { useEffect, useRef } from 'react';
import {
  getSocket,
  joinSubjectRoom,
  leaveSubjectRoom,
  onSessionStarted,
  onSessionEnded,
  onAttendanceResult,
  onAttendanceCount,
  onLeaveUpdated,
} from '../services/socket';
import type { SessionStartedPayload, SessionEndedPayload, AttendanceResultPayload, AttendanceCountPayload } from '../types';
import { useAuthStore } from '../store/authStore';

interface UseSocketOptions {
  subjectIds?: string[];
  onSessionStarted?: (data: SessionStartedPayload) => void;
  onSessionEnded?: (data: SessionEndedPayload) => void;
  onAttendanceResult?: (data: AttendanceResultPayload) => void;
  onAttendanceCount?: (data: AttendanceCountPayload) => void;
  onLeaveUpdated?: () => void;
}

export function useSocket(options: UseSocketOptions = {}): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Listeners are attached once but always call the latest handlers,
  // so a handler never sees stale state from an earlier render.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const subjectKey = (options.subjectIds ?? []).join(',');

  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();
    if (!socket) return;

    const cleanups = [
      onSessionStarted((data) => optionsRef.current.onSessionStarted?.(data)),
      onSessionEnded((data) => optionsRef.current.onSessionEnded?.(data)),
      onAttendanceResult((data) => optionsRef.current.onAttendanceResult?.(data)),
      onAttendanceCount((data) => optionsRef.current.onAttendanceCount?.(data)),
      onLeaveUpdated(() => optionsRef.current.onLeaveUpdated?.()),
    ];

    return () => cleanups.forEach((fn) => fn());
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !subjectKey) return;
    const subjectIds = subjectKey.split(',');

    subjectIds.forEach((id) => joinSubjectRoom(id));
    return () => subjectIds.forEach((id) => leaveSubjectRoom(id));
  }, [isAuthenticated, subjectKey]);
}
