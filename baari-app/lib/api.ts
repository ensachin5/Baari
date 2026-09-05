import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSession } from '../store/session';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Ensures that session state is hydrated before firing authenticated requests,
 * preventing race conditions on app startup.
 */
async function ensureHydrated(timeoutMs = 1500): Promise<void> {
  if (useSession.getState().isHydrated) return;

  await new Promise<void>((resolve) => {
    let resolved = false;
    const unsubscribe = useSession.subscribe((state) => {
      if (state.isHydrated && !resolved) {
        resolved = true;
        unsubscribe();
        resolve();
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unsubscribe();
        resolve();
      }
    }, timeoutMs);
  });
}

/**
 * Resolves the active session token and cookie through all available channels.
 */
async function resolveAuthCredentials(): Promise<{ token: string | null; cookie: string | null }> {
  // 1. Check in-memory Zustand store
  let token = useSession.getState().token;

  // 2. Fallback: check SecureStore dedicated session key
  if (!token && Platform.OS !== 'web') {
    try {
      token = await SecureStore.getItemAsync('baari_session_token');
    } catch (_) {}
  }

  // 3. Fallback: check expoClient SecureStore cookie file ('baari_cookie')
  let cookie: string | null = null;
  if (Platform.OS !== 'web') {
    try {
      const rawCookie = await SecureStore.getItemAsync('baari_cookie');
      if (rawCookie) {
        const parsed = JSON.parse(rawCookie);
        for (const key of Object.keys(parsed)) {
          if (key.includes('session_token') && parsed[key]?.value) {
            token = parsed[key].value;
            if (useSession.getState().token !== token) {
              useSession.getState().setToken(token).catch(() => {});
            }
            break;
          }
        }
      }
    } catch (_) {}
  }

  // 4. Resolve cookie from Better Auth expo client getCookie()
  try {
    const { authClient } = await import('./auth-client');
    if ((authClient as any)?.getCookie) {
      cookie = await (authClient as any).getCookie();
    }
  } catch (_) {}

  // 5. If token is still missing but cookie string is available, parse it
  if (!token && cookie) {
    const match = cookie.match(/session_token=([^;]+)/);
    if (match?.[1]) {
      token = match[1];
      useSession.getState().setToken(token).catch(() => {});
    }
  }

  return { token, cookie };
}

export async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;

  // Wait for session hydration to avoid startup race conditions
  await ensureHydrated();

  // Resolve session credentials
  const { token, cookie } = await resolveAuthCredentials();

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${API_BASE_URL}${cleanEndpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  // Attach Authorization Bearer token
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Attach Cookie header for Better Auth session verification
  if (cookie) {
    defaultHeaders['Cookie'] = cookie;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      credentials: 'include',
      ...customConfig,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
    });
  } catch (err: any) {
    // Distinguish network/offline errors from HTTP errors
    const isNetworkError =
      err?.name === 'TypeError' ||
      err?.message?.includes('Network request failed') ||
      err?.message?.includes('network') ||
      err?.message?.includes('Failed to fetch') ||
      err?.message?.includes('The Internet connection appears to be offline');

    if (isNetworkError) {
      throw new ApiError('Check your connection and try again', 0, { networkError: true });
    }
    throw err;
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401) {
      // Clear invalid/stale local session state so app safely returns to sign-in
      useSession.getState().logout().catch(() => {});
    }
    const errorMessage = data?.error || data?.message || `Request failed with status ${response.status}`;
    throw new ApiError(errorMessage, response.status, data);
  }

  return data as T;
}

export const api = {
  get: <T = any>(endpoint: string, params?: Record<string, any>, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { method: 'GET', params, ...options }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { method: 'DELETE', ...options }),
};
