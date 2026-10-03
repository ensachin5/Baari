import { Platform } from 'react-native';
import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { api, resolveBaseUrl } from './api';
import { useSession, UserProfile, ActiveFlat } from '../store/session';

export function extractCleanToken(raw?: string | null): string | null {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    return decoded.replace(/^s:/, '').split('.')[0].trim();
  } catch (_) {
    return raw.replace(/^s:/, '').split('.')[0].trim();
  }
}

const baseURL = resolveBaseUrl();

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    expoClient({
      scheme: 'baari',
      storagePrefix: 'baari',
      storage: SecureStore,
    }),
  ],
});

/**
 * Fetch the current user's profile and active flat membership from the backend.
 * Uses the Zustand session token for auth (via the api wrapper).
 */
export async function fetchUserProfile(): Promise<{ user: UserProfile; activeFlat: ActiveFlat | null }> {
  const data = await api.get<{ user: UserProfile; activeFlat: ActiveFlat | null }>('/api/profile');
  if (data.user) {
    useSession.getState().setUser(data.user);
  }
  useSession.getState().setActiveFlat(data.activeFlat || null);
  return data;
}

/**
 * After a successful Better Auth sign-in/sign-up, sync the session token
 * into the Zustand store so the rest of the app (api.ts, socket.ts) can use it.
 */
export async function syncSessionToStore(authResultData?: any): Promise<void> {
  // If result data was passed directly from signIn/signUp, use it first
  const rawToken =
    authResultData?.token ||
    authResultData?.session?.token ||
    authResultData?.data?.token ||
    authResultData?.data?.session?.token;

  if (rawToken) {
    const clean = extractCleanToken(rawToken);
    if (clean) await useSession.getState().setToken(clean);
  }

  const rawUser = authResultData?.user || authResultData?.data?.user;
  if (rawUser) {
    useSession.getState().setUser({
      id: rawUser.id,
      name: rawUser.name,
      email: rawUser.email,
      image: rawUser.image ?? null,
    });
  }

  // Try extracting token from expoClient cookie storage
  try {
    const cookie = await (authClient as any).getCookie?.();
    if (cookie) {
      const match = cookie.match(/session_token=([^;]+)/);
      if (match?.[1]) {
        const clean = extractCleanToken(match[1]);
        if (clean) await useSession.getState().setToken(clean);
      }
    }
  } catch (_) {}

  // Direct fallback: check SecureStore 'baari_cookie'
  try {
    const rawCookie = await SecureStore.getItemAsync('baari_cookie');
    if (rawCookie) {
      const parsed = JSON.parse(rawCookie);
      for (const key of Object.keys(parsed)) {
        if (key.includes('session_token') && parsed[key]?.value) {
          const clean = extractCleanToken(parsed[key].value);
          if (clean) {
            await useSession.getState().setToken(clean);
            break;
          }
        }
      }
    }
  } catch (_) {}

  // Also query getSession() to ensure storage sync
  try {
    const session = await authClient.getSession();
    if (session.data?.session?.token) {
      const clean = extractCleanToken(session.data.session.token);
      if (clean) await useSession.getState().setToken(clean);
    }
    if (session.data?.user) {
      useSession.getState().setUser({
        id: session.data.user.id,
        name: session.data.user.name,
        email: session.data.user.email,
        image: session.data.user.image ?? null,
      });
    }
  } catch (_) {}
}
