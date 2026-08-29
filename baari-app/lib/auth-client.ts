import { createAuthClient } from 'better-auth/client';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { api } from './api';
import { useSession, UserProfile, ActiveFlat } from '../store/session';

const baseURL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

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
  if (authResultData?.token || authResultData?.session?.token) {
    const token = authResultData.token || authResultData.session?.token;
    await useSession.getState().setToken(token);
  }
  if (authResultData?.user) {
    useSession.getState().setUser({
      id: authResultData.user.id,
      name: authResultData.user.name,
      email: authResultData.user.email,
      image: authResultData.user.image ?? null,
    });
  }

  // Also query getSession() to ensure storage sync
  try {
    const session = await authClient.getSession();
    if (session.data?.session?.token) {
      await useSession.getState().setToken(session.data.session.token);
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
