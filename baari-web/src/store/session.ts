import { create } from "zustand";

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
  role: "admin" | "member";
  memberCount?: number;
  joinedAt?: string;
  createdAt?: string;
  createdBy?: string;
}

interface SessionState {
  user: UserProfile | null;
  activeFlat: ActiveFlat | null;
  token: string | null;
  isHydrated: boolean;
  socketConnected: boolean;
  setUser: (user: UserProfile | null) => void;
  setActiveFlat: (flat: ActiveFlat | null) => void;
  setToken: (token: string | null) => void;
  setSocketConnected: (connected: boolean) => void;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
}

const USER_STORAGE_KEY = "baari_web_user";
const FLAT_STORAGE_KEY = "baari_web_flat";

export const useSession = create<SessionState>((set) => ({
  user: null,
  activeFlat: null,
  token: null,
  isHydrated: false,
  socketConnected: false,

  setUser: (user) => {
    set({ user });
    if (typeof window !== "undefined") {
      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  },

  setActiveFlat: (activeFlat) => {
    set({ activeFlat });
    if (typeof window !== "undefined") {
      if (activeFlat) {
        localStorage.setItem(FLAT_STORAGE_KEY, JSON.stringify(activeFlat));
      } else {
        localStorage.removeItem(FLAT_STORAGE_KEY);
      }
    }
  },

  setToken: (token) => {
    set({ token });
  },

  setSocketConnected: (socketConnected) => set({ socketConnected }),

  hydrate: async () => {
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        const storedFlat = localStorage.getItem(FLAT_STORAGE_KEY);
        set({
          user: storedUser ? JSON.parse(storedUser) : null,
          activeFlat: storedFlat ? JSON.parse(storedFlat) : null,
          isHydrated: true,
        });
      } catch {
        set({ isHydrated: true });
      }
    } else {
      set({ isHydrated: true });
    }
  },

  logout: async () => {
    set({ user: null, activeFlat: null, token: null });
    if (typeof window !== "undefined") {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(FLAT_STORAGE_KEY);
    }
    try {
      const { disconnectSocket } = await import("@/lib/socket");
      disconnectSocket();
    } catch {
      // Ignore disconnect errors during logout
    }
  },
}));
