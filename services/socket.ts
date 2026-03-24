import { io, Socket } from 'socket.io-client';
import type {
  SessionStartedPayload,
  SessionEndedPayload,
  AttendanceResultPayload,
} from '../types';

const SOCKET_URL = 'https://attendance-system-backend-uqgy.onrender.com';

let socket: Socket | null = null;

export function initSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    timeout: 60000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// ─── Room management ─────────────────────────────────────────────────────────
export function joinSubjectRoom(subjectId: string): void {
  socket?.emit('join_subject', { subjectId });
}

export function leaveSubjectRoom(subjectId: string): void {
  socket?.emit('leave_subject', { subjectId });
}

// ─── Event Listeners ─────────────────────────────────────────────────────────
export function onSessionStarted(callback: (data: SessionStartedPayload) => void): () => void {
  socket?.on('session_started', callback);
  return () => socket?.off('session_started', callback);
}

export function onSessionEnded(callback: (data: SessionEndedPayload) => void): () => void {
  socket?.on('session_ended', callback);
  return () => socket?.off('session_ended', callback);
}

export function onAttendanceResult(callback: (data: AttendanceResultPayload) => void): () => void {
  socket?.on('attendance_result', callback);
  return () => socket?.off('attendance_result', callback);
}
