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
  inviteCode: string;
  role: 'admin' | 'member';
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

export const useSession = create<SessionState>((set, get) => ({
  user: null,
  activeFlat: null,
  token: null,
  isHydrated: false,
  socketConnected: false,

  setUser: (user) => {
    set({ user });
    if (Platform.OS !== 'web' && user) {
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)).catch(() => {});
    }
  },

  setActiveFlat: (activeFlat) => {
    set({ activeFlat });
    if (Platform.OS !== 'web' && activeFlat) {
      SecureStore.setItemAsync(FLAT_KEY, JSON.stringify(activeFlat)).catch(() => {});
    }
  },

  setToken: async (token) => {
    set({ token });
    if (Platform.OS !== 'web') {
      if (token) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    }
  },

  setSocketConnected: (socketConnected) => set({ socketConnected }),

  hydrate: async () => {
    try {
      if (Platform.OS !== 'web') {
        let token = await SecureStore.getItemAsync(TOKEN_KEY);
        const userStr = await SecureStore.getItemAsync(USER_KEY);
        const flatStr = await SecureStore.getItemAsync(FLAT_KEY);

        // Fallback: check Better Auth expoClient storage if TOKEN_KEY is empty
        if (!token) {
          try {
            const rawCookie = await SecureStore.getItemAsync('baari_cookie');
            if (rawCookie) {
              const parsed = JSON.parse(rawCookie);
              for (const key of Object.keys(parsed)) {
                if (key.includes('session_token') && parsed[key]?.value) {
                  token = parsed[key].value;
                  if (token) {
                    await SecureStore.setItemAsync(TOKEN_KEY, token);
                  }
                  break;
                }
              }
            }
          } catch (_) {}
        }

        set({
          token,
          user: userStr ? JSON.parse(userStr) : null,
          activeFlat: flatStr ? JSON.parse(flatStr) : null,
          isHydrated: true,
        });
      } else {
        set({ isHydrated: true });
      }
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
    if (Platform.OS !== 'web') {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(USER_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(FLAT_KEY).catch(() => {}),
        SecureStore.deleteItemAsync('baari_cookie').catch(() => {}),
        SecureStore.deleteItemAsync('baari_session_data').catch(() => {}),
      ]);
    }
  },
}));
