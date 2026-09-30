import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export interface ActiveFlat {
  id: string;
  name: string;
  type?: 'flat' | 'pg' | 'hostel';
  inviteCode: string;
  role: 'admin' | 'member';
  memberCount?: number;
}

interface SessionState {
  user: UserProfile | null;
  activeFlat: ActiveFlat | null;
  token: string | null;
  isHydrated: boolean;
  socketConnected: boolean;
  setUser: (user: UserProfile | null) => void;
  setActiveFlat: (flat: ActiveFlat | null) => void;
  setToken: (token: string | null) => Promise<void>;
  setSocketConnected: (connected: boolean) => void;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
}

const TOKEN_KEY = 'baari_session_token';
const USER_KEY = 'baari_session_user';
const FLAT_KEY = 'baari_session_flat';

const storageHelper = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
      } catch {}
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined') window.localStorage.removeItem(key);
      } catch {}
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export const useSession = create<SessionState>((set, get) => ({
  user: null,
  activeFlat: null,
  token: null,
  isHydrated: false,
  socketConnected: false,

  setUser: (user) => {
    set({ user });
    if (user) {
      storageHelper.setItem(USER_KEY, JSON.stringify(user)).catch(() => {});
    }
  },

  setActiveFlat: (activeFlat) => {
    set({ activeFlat });
    if (activeFlat) {
      storageHelper.setItem(FLAT_KEY, JSON.stringify(activeFlat)).catch(() => {});
    }
  },

  setToken: async (token) => {
    set({ token });
    if (token) {
      await storageHelper.setItem(TOKEN_KEY, token);
    } else {
      await storageHelper.deleteItem(TOKEN_KEY);
    }
  },

  setSocketConnected: (socketConnected) => set({ socketConnected }),

  hydrate: async () => {
    try {
      let token = await storageHelper.getItem(TOKEN_KEY);
      const userStr = await storageHelper.getItem(USER_KEY);
      const flatStr = await storageHelper.getItem(FLAT_KEY);
      let user: UserProfile | null = userStr ? JSON.parse(userStr) : null;
      let activeFlat: ActiveFlat | null = flatStr ? JSON.parse(flatStr) : null;

      // 1. Check Better Auth expoClient cookie storage for authoritative active session on native
      if (Platform.OS !== 'web') {
        try {
          const rawCookie = await SecureStore.getItemAsync('baari_cookie');
          if (rawCookie) {
            const parsed = JSON.parse(rawCookie);
            for (const key of Object.keys(parsed)) {
              if (key.includes('session_token') && parsed[key]?.value) {
                try {
                  const decoded = decodeURIComponent(parsed[key].value);
                  token = decoded.replace(/^s:/, '').split('.')[0].trim();
                } catch (_) {
                  token = parsed[key].value.replace(/^s:/, '').split('.')[0].trim();
                }
                if (token) {
                  await storageHelper.setItem(TOKEN_KEY, token);
                }
                break;
              }
            }
          }
        } catch (_) {}
      }

      // 2. Fallback / Web session recovery: query authClient.getSession() to verify active session cookie
      if (!token) {
        try {
          const { authClient, extractCleanToken } = await import('../lib/auth-client');
          const session = await authClient.getSession();
          if (session?.data?.session?.token) {
            token = extractCleanToken(session.data.session.token);
            if (token) {
              await storageHelper.setItem(TOKEN_KEY, token);
            }
          }
          if (session?.data?.user) {
            user = {
              id: session.data.user.id,
              name: session.data.user.name,
              email: session.data.user.email,
              image: session.data.user.image ?? null,
            };
            await storageHelper.setItem(USER_KEY, JSON.stringify(user));
          }
        } catch (_) {}
      }

      set({
        token,
        user,
        activeFlat,
        isHydrated: true,
      });
    } catch {
      set({ isHydrated: true });
    }
  },

  logout: async () => {
    set({ user: null, activeFlat: null, token: null });
    try {
      const { disconnectSocket } = await import('../lib/socket');
      disconnectSocket();
    } catch (_) {}
    await Promise.all([
      storageHelper.deleteItem(TOKEN_KEY).catch(() => {}),
      storageHelper.deleteItem(USER_KEY).catch(() => {}),
      storageHelper.deleteItem(FLAT_KEY).catch(() => {}),
      ...(Platform.OS !== 'web'
        ? [
            SecureStore.deleteItemAsync('baari_cookie').catch(() => {}),
            SecureStore.deleteItemAsync('baari_session_data').catch(() => {}),
          ]
        : []),
    ]);
  },
}));
