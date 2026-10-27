import api, { API_ROUTES } from './api';
import type { LeaveRequest } from '../types';

export interface LeaveInput {
  subjectIds: number[];
  /** "YYYY-MM-DD" */
  fromDate: string;
  toDate: string;
  reason: string;
}

/** Student: ask for leave in one or more subjects. One request is created per subject. */
export async function applyForLeave(input: LeaveInput): Promise<LeaveRequest[]> {
  const { data } = await api.post(API_ROUTES.LEAVES.BASE, input);
  return data.leaves;
}

/** Student: my requests, newest first. */
export async function getMyLeaves(): Promise<LeaveRequest[]> {
  const { data } = await api.get(API_ROUTES.LEAVES.MINE);
  return data.leaves;
}

/** Student: withdraw a request that has not been answered yet. */
export async function cancelLeave(id: number): Promise<void> {
  await api.delete(API_ROUTES.LEAVES.CANCEL(id));
}

/** Faculty: a subject's requests, waiting ones first. */
export async function getSubjectLeaves(subjectId: number): Promise<{ leaves: LeaveRequest[]; pending: number }> {
  const { data } = await api.get(API_ROUTES.LEAVES.BY_SUBJECT(subjectId));
  return { leaves: data.leaves, pending: data.pending };
}

/** Faculty: approve or reject one request. Approving excuses the student's missed classes in the period. */
export async function reviewLeave(
  id: number,
  status: 'APPROVED' | 'REJECTED',
  note?: string
): Promise<{ leave: LeaveRequest; excused: number; restored: number }> {
  const { data } = await api.put(API_ROUTES.LEAVES.REVIEW(id), { status, note });
  return { leave: data.leave, excused: data.excused ?? 0, restored: data.restored ?? 0 };
}

/** Faculty: approve every request still waiting in a subject. */
export async function approveAllLeaves(subjectId: number): Promise<{ approved: number; excused: number }> {
  const { data } = await api.put(API_ROUTES.LEAVES.APPROVE_ALL(subjectId));
  return { approved: data.approved ?? 0, excused: data.excused ?? 0 };
}
