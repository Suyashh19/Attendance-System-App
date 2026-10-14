jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import * as SecureStore from 'expo-secure-store';
import api, { getErrorMessage, setUnauthorizedHandler } from '../services/api';

// The response interceptor's error handler, called the way axios calls it
const onResponseError = (api.interceptors.response as any).handlers[0].rejected as (error: any) => Promise<never>;

function httpError(status: number, url: string, withToken: boolean) {
  return {
    response: { status, data: {} },
    config: { url, headers: withToken ? { Authorization: 'Bearer token' } : {} },
  };
}

describe('getErrorMessage', () => {
  it('prefers the backend "error" field', () => {
    const err = { response: { data: { error: 'Incorrect email or password', message: 'ignored' } } };
    expect(getErrorMessage(err, 'fallback')).toBe('Incorrect email or password');
  });

  it('falls back to the backend "message" field', () => {
    expect(getErrorMessage({ response: { data: { message: 'Session ended' } } }, 'fallback')).toBe('Session ended');
  });

  it('explains a network failure instead of showing the fallback', () => {
    expect(getErrorMessage({ message: 'Network Error' }, 'fallback')).toMatch(/internet connection/i);
    expect(getErrorMessage({ code: 'ECONNABORTED' }, 'fallback')).toMatch(/internet connection/i);
  });

  it('uses the fallback when nothing else is known', () => {
    expect(getErrorMessage(new Error('boom'), 'Something went wrong')).toBe('Something went wrong');
    expect(getErrorMessage(undefined, 'Something went wrong')).toBe('Something went wrong');
  });
});

describe('401 handling', () => {
  const onUnauthorized = jest.fn();

  beforeEach(() => {
    onUnauthorized.mockClear();
    (SecureStore.deleteItemAsync as jest.Mock).mockClear();
    setUnauthorizedHandler(onUnauthorized);
  });

  it('signs the user out when an authenticated request gets a 401', async () => {
    const error = httpError(401, '/subjects/my', true);

    await expect(onResponseError(error)).rejects.toBe(error);

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not sign out on a wrong password at login', async () => {
    await expect(onResponseError(httpError(401, '/auth/login', false))).rejects.toBeDefined();

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('does not sign out when the current password is wrong while changing it', async () => {
    await expect(onResponseError(httpError(401, '/auth/update-password', true))).rejects.toBeDefined();

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('does not sign out on other errors', async () => {
    await expect(onResponseError(httpError(403, '/subjects/my', true))).rejects.toBeDefined();
    await expect(onResponseError(httpError(500, '/subjects/my', true))).rejects.toBeDefined();

    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
