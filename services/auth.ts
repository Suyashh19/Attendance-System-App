import * as SecureStore from 'expo-secure-store';
import api from './api';
import type { AuthResponse, LoginPayload, RegisterPayload } from '../types';

const TOKEN_KEY = 'auth_token';

// ─── API Calls ────────────────────────────────────────────────────────────────
export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', payload);
  return data;
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', payload);
  return data;
}

// ─── OTP & Password Management ────────────────────────────────────────────────

export async function sendSignupOtp(email: string) {
  const { data } = await api.post('/auth/send-signup-otp', { email });
  return data;
}

export async function verifySignupOtp(email: string, otp: string) {
  const { data } = await api.post('/auth/verify-signup-otp', { email, otp });
  return data;
}

export async function forgotPassword(email: string) {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(payload: { email: string; otp: string; newPassword: string }) {
  const { data } = await api.post('/auth/reset-password', payload);
  return data;
}

export async function updateUserPassword(payload: { currentPassword: string; newPassword: string }) {
  const { data } = await api.post('/auth/update-password', payload);
  return data;
}

// ─── SecureStore Token Helpers ────────────────────────────────────────────────
export async function storeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// Profile Update
export async function getProfile() {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function updatePrn(prn: string) {
  const { data } = await api.post('/auth/update-prn', { prn });
  return data;
}

export async function deleteAccount() {
  const { data } = await api.delete('/auth/delete-account');
  return data;
}
