import { createAuthClient } from "better-auth/react";
import { api } from "./api";
import { useSession, UserProfile, ActiveFlat } from "@/store/session";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://baari-wkqq.onrender.com";

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signOut, useSession: useAuthSession, getSession } = authClient;

/**
 * Fetch the current user's profile and active flat membership from the backend.
 */
export async function fetchUserProfile(): Promise<{
  user: UserProfile;
  activeFlat: ActiveFlat | null;
}> {
  const data = await api.get<{ user: UserProfile; activeFlat: ActiveFlat | null }>(
    "/api/profile"
  );
  if (data.user) {
    useSession.getState().setUser(data.user);
  }
  useSession.getState().setActiveFlat(data.activeFlat || null);
  return data;
}

/**
 * After a successful Better Auth sign-in, sync user into the Zustand store.
 */
export async function syncSessionToStore(authResultData?: any): Promise<void> {
  const rawUser = authResultData?.user || authResultData?.data?.user;
  const rawToken =
    authResultData?.session?.token ||
    authResultData?.token ||
    authResultData?.data?.session?.token;

  if (rawToken) {
    useSession.getState().setToken(rawToken);
  }

  if (rawUser) {
    useSession.getState().setUser({
      id: rawUser.id,
      name: rawUser.name,
      email: rawUser.email,
      image: rawUser.image ?? null,
    });
  }

  try {
    const session = await getSession();
    if (session.data?.session?.token) {
      useSession.getState().setToken(session.data.session.token);
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
