"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";

import Image from "next/image";

/**
 * Onboarding layout guard.
 * - No session → redirect to /sign-in
 * - Session + flat already exists → redirect to /home
 * - Session + no flat → render children (onboarding flow)
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useAuthSession();
  const { setUser, setActiveFlat, hydrate, isHydrated } = useSession();
  const storeUser = useSession((state) => state.user);
  const storeToken = useSession((state) => state.token);
  const currentUser = session?.user || storeUser;
  const currentToken = session?.session?.token || storeToken;

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (sessionLoading || !isHydrated) return;

    // No session & no token -> sign-in
    if (!currentUser && !currentToken) {
      router.replace("/sign-in");
      return;
    }

    if (currentToken) {
      useSession.getState().setToken(currentToken);
    }

    // Sync user to Zustand store
    if (currentUser) {
      setUser({
        id: currentUser.id,
        name: currentUser.name || "User",
        email: currentUser.email,
        image: currentUser.image ?? null,
      });
    }

    // Check if user already has a flat
    api
      .get<{ flat: any }>("/api/flats/me")
      .then((res) => {
        if (res?.flat) {
          // Already has a flat → skip onboarding
          setActiveFlat(res.flat);
          router.replace("/home");
        } else {
          // No flat → allow onboarding
          setActiveFlat(null);
          setAllowed(true);
          setChecking(false);
        }
      })
      .catch(() => {
        // Network error or 401 → allow onboarding as fallback
        setAllowed(true);
        setChecking(false);
      });
  }, [
    session,
    sessionLoading,
    isHydrated,
    currentUser,
    currentToken,
    router,
    setUser,
    setActiveFlat,
  ]);

  if (checking && !allowed) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/baari-logo.png"
            alt="Baari Logo"
            width={40}
            height={40}
            className="w-10 h-10 rounded-xl animate-pulse object-contain"
            priority
          />
          <p className="text-black-light text-body-small font-medium">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
