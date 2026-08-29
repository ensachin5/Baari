import { api, API_BASE_URL } from './api';
import { useSession, UserProfile, ActiveFlat } from '../store/session';
import * as Linking from 'expo-linking';

export interface AuthResponse {
  user: UserProfile;
  session: {
    token: string;
    expiresAt: string;
  };
}

export const authClient = {
  // Email & Password Sign In
  signInWithEmail: async (email: string, password: string): Promise<UserProfile> => {
    const data = await api.post<AuthResponse>('/api/auth/sign-in/email', {
      email,
      password,
    });

    if (data.session?.token) {
      await useSession.getState().setToken(data.session.token);
    }
    useSession.getState().setUser(data.user);

    // Fetch user profile and active flat
    await authClient.refreshProfile();

    return data.user;
  },

  // Email & Password Sign Up
  signUpWithEmail: async (name: string, email: string, password: string): Promise<UserProfile> => {
    const data = await api.post<AuthResponse>('/api/auth/sign-up/email', {
      name,
      email,
      password,
    });

    if (data.session?.token) {
      await useSession.getState().setToken(data.session.token);
    }
    useSession.getState().setUser(data.user);

    // Refresh profile
    await authClient.refreshProfile();

    return data.user;
  },

  // Sign In with Google
  signInWithGoogle: async () => {
    const callbackUrl = Linking.createURL('/(auth)/google-callback');
    const authUrl = `${API_BASE_URL}/api/auth/sign-in/social?provider=google&callbackURL=${encodeURIComponent(callbackUrl)}`;
    await Linking.openURL(authUrl);
  },

  // Refresh Profile & Active Flat
  refreshProfile: async (): Promise<{ user: UserProfile; activeFlat: ActiveFlat | null }> => {
    try {
      const data = await api.get<{ user: UserProfile; activeFlat: ActiveFlat | null }>('/api/profile');
      if (data.user) {
        useSession.getState().setUser(data.user);
      }
      useSession.getState().setActiveFlat(data.activeFlat || null);
      return data;
    } catch (error) {
      return {
        user: useSession.getState().user!,
        activeFlat: useSession.getState().activeFlat,
      };
    }
  },

  // Sign Out
  signOut: async () => {
    try {
      await api.post('/api/auth/sign-out', {});
    } catch (_) {}
    await useSession.getState().logout();
  },
};
