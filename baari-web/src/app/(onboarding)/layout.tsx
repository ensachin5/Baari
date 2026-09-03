"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";

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
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (sessionLoading || !isHydrated) return;

    // No session → sign-in
    if (!session?.user) {
      router.replace("/sign-in");
      return;
    }

    // Sync user to Zustand store
    setUser({
      id: session.user.id,
      name: session.user.name || "User",
      email: session.user.email,
      image: session.user.image,
    });

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
  }, [session, sessionLoading, isHydrated, router, setUser, setActiveFlat, hydrate]);

  if (checking && !allowed) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-navy text-white flex items-center justify-center font-bold text-lg animate-pulse">
            B
          </div>
          <p className="text-black-light text-body-small font-medium">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
