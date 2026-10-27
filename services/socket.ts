import { io, Socket } from 'socket.io-client';
import { SERVER_URL } from './api';
import type {
  SessionStartedPayload,
  SessionEndedPayload,
  AttendanceResultPayload,
  AttendanceCountPayload,
} from '../types';

const SOCKET_URL = SERVER_URL;

let socket: Socket | null = null;
// subjectId -> how many screens currently need that room
const joinedRooms = new Map<string, number>();

export function initSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'], // Added polling as fallback
    reconnection: true,
    reconnectionAttempts: 20, // Increased from 5 to 20
    reconnectionDelay: 2000,
    timeout: 60000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
    // Automatically re-join all rooms upon reconnection
    joinedRooms.forEach((_count, subjectId) => {
      socket?.emit('join_subject', { subjectId });
    });
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
    joinedRooms.clear();
  }
}

// ─── Room management ─────────────────────────────────────────────────────────
export function joinSubjectRoom(subjectId: string): void {
  if (!subjectId) return;
  const count = joinedRooms.get(subjectId) ?? 0;
  joinedRooms.set(subjectId, count + 1);
  if (count === 0 && socket?.connected) {
    socket.emit('join_subject', { subjectId });
  }
}

// Two screens can need the same room, so it is only left when the last one lets go
export function leaveSubjectRoom(subjectId: string): void {
  if (!subjectId) return;
  const count = joinedRooms.get(subjectId) ?? 0;
  if (count > 1) {
    joinedRooms.set(subjectId, count - 1);
    return;
  }
  joinedRooms.delete(subjectId);
  if (count === 1 && socket?.connected) {
    socket.emit('leave_subject', { subjectId });
  }
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

export function onAttendanceCount(callback: (data: AttendanceCountPayload) => void): () => void {
  socket?.on('attendance_count', callback);
  return () => socket?.off('attendance_count', callback);
}

/** A leave request was sent or answered, so lists of requests are out of date. */
export function onLeaveUpdated(callback: () => void): () => void {
  socket?.on('leave_updated', callback);
  return () => socket?.off('leave_updated', callback);
}
