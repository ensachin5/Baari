import { createAuthClient } from "better-auth/react";
import { bearer } from "better-auth/plugins";
import { emailOTPClient } from "better-auth/client/plugins";
import { api } from "./api";
import { useSession, UserProfile, ActiveFlat } from "@/store/session";

/**
 * Client-side base URL for authClient. Defaults to "" (empty string) so all Better Auth
 * calls (/api/auth/*) use relative paths proxied Same-Origin by next.config.ts rewrites.
 */
export const API_BASE_URL = "";

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  fetchOptions: {
    credentials: "include",
    auth: {
      type: "Bearer",
      token: () =>
        useSession.getState().token ||
        (typeof window !== "undefined"
          ? localStorage.getItem("baari_web_token") ||
            localStorage.getItem("better-auth.session_token") ||
            localStorage.getItem("bearer_token")
          : null) ||
        "",
    },
  },
  plugins: [bearer(), emailOTPClient()],
});

export const { signIn, signUp, signOut, useSession: useAuthSession, getSession } = authClient;

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
  if (data?.user) {
    useSession.getState().setUser(data.user);
  }
  useSession.getState().setActiveFlat(data?.activeFlat || null);
  return data;
}

/**
 * Authoritative session verification & restoration function.
 * 1. Checks if Better Auth has a valid server session via getSession().
 * 2. If valid, syncs user & session token to Zustand store & local storage.
 * 3. If getSession fails or returns null, attempts profile fetch using stored Bearer token.
 * 4. Only returns false if server explicitly confirms session is unauthenticated (401 / null session).
 */
export async function verifyOrRestoreSession(): Promise<boolean> {
  try {
    const sessionRes = await getSession();
    if (sessionRes?.data?.user && sessionRes?.data?.session?.token) {
      useSession.getState().setToken(sessionRes.data.session.token);
      useSession.getState().setUser({
        id: sessionRes.data.user.id,
        name: sessionRes.data.user.name,
        email: sessionRes.data.user.email,
        image: sessionRes.data.user.image ?? null,
      });
      return true;
    }
  } catch {}

  const localToken =
    useSession.getState().token ||
    (typeof window !== "undefined"
      ? localStorage.getItem("baari_web_token") ||
        localStorage.getItem("better-auth.session_token") ||
        localStorage.getItem("bearer_token")
      : null);

  if (localToken) {
    try {
      const profile = await fetchUserProfile();
      if (profile?.user) {
        return true;
      }
    } catch (err: any) {
      if (err?.status === 401) {
        return false;
      }
    }
  }

  return false;
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
    if (session?.data?.session?.token) {
      useSession.getState().setToken(session.data.session.token);
    }
    if (session?.data?.user) {
      useSession.getState().setUser({
        id: session.data.user.id,
        name: session.data.user.name,
        email: session.data.user.email,
        image: session.data.user.image ?? null,
      });
    }
  } catch (_) {}
}

/**
 * Single authoritative logout helper that destroys server session and client store.
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut();
  } catch {}
  await useSession.getState().logout();
}
