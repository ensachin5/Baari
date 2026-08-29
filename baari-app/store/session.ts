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
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        const userStr = await SecureStore.getItemAsync(USER_KEY);
        const flatStr = await SecureStore.getItemAsync(FLAT_KEY);

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
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
      await SecureStore.deleteItemAsync(FLAT_KEY).catch(() => {});
    }
  },
}));
