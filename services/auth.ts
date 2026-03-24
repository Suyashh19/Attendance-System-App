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

// ─── User Profile ─────────────────────────────────────────────────────────────
export async function getProfile() {
  const { data } = await api.get('/auth/me');
  return data;
}
