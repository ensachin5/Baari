"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";

export default function RootIndexPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useAuthSession();
  const { user, activeFlat, isHydrated, setUser, setActiveFlat, hydrate } =
    useSession();
  const [slowServerHint, setSlowServerHint] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Show helpful hint if cold start takes longer than 3.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setSlowServerHint(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  // 1. Fast path: If already hydrated from local storage with valid user + flat, route immediately
  useEffect(() => {
    if (isHydrated && user && activeFlat) {
      router.replace("/home");
    }
  }, [isHydrated, user, activeFlat, router]);

  // 2. Authoritative path: When session state resolves
  useEffect(() => {
    if (sessionLoading || !isHydrated) return;

    if (!session?.user) {
      // Not authenticated
      router.replace("/sign-in");
      return;
    }

    // Authenticated: Sync user into store
    setUser({
      id: session.user.id,
      name: session.user.name || "User",
      email: session.user.email,
      image: session.user.image,
    });

    // Single round-trip call to /api/profile to fetch activeFlat & user stats together
    api
      .get<{ user: any; activeFlat: any }>("/api/profile")
      .then((res) => {
        if (res?.activeFlat) {
          setActiveFlat(res.activeFlat);
          router.replace("/home");
        } else {
          setActiveFlat(null);
          router.replace("/choose");
        }
      })
      .catch(() => {
        // Fallback: check /api/flats/me
        api
          .get<{ flat: any }>("/api/flats/me")
          .then((res) => {
            if (res?.flat) {
              setActiveFlat(res.flat);
              router.replace("/home");
            } else {
              setActiveFlat(null);
              router.replace("/choose");
            }
          })
          .catch(() => {
            router.replace("/choose");
          });
      });
  }, [session, sessionLoading, isHydrated, router, setUser, setActiveFlat]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-xs">
        {/* Navy Logo Badge */}
        <div className="w-16 h-16 rounded-2xl bg-navy text-white flex items-center justify-center font-bold text-3xl shadow-md animate-pulse">
          B
        </div>

        <div>
          <h2 className="text-[18px] leading-[24px] font-semibold text-black">
            Baari
          </h2>
          <p className="text-[14px] leading-[20px] text-grayBlack mt-1">
            Setting up your flat space...
          </p>
        </div>

        {/* Cold-start progressive indicator */}
        {slowServerHint && (
          <div className="mt-2 px-3 py-2 bg-offWhite rounded-[10px] border border-border transition-opacity animate-fade-in">
            <p className="text-[12px] leading-[16px] text-mutedNavy">
              Waking up backend server... thank you for your patience! ✨
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

