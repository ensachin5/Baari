"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";
import Image from "next/image";

export default function RootIndexPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useAuthSession();
  const { user, activeFlat, isHydrated, setUser, setActiveFlat, hydrate } =
    useSession();
  const [slowServerHint, setSlowServerHint] = useState(false);

  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    hydrate();
    // Detect if running as installed standalone PWA
    if (typeof window !== "undefined") {
      const isPwa =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isPwa);
    }
  }, [hydrate]);

  // Handle server cold start hint timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setSlowServerHint(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Main authentication and flat redirection logic
  useEffect(() => {
    if (!isHydrated || sessionLoading) return;

    if (!session?.user) {
      router.replace("/sign-in");
      return;
    }

    setUser({
      id: session.user.id,
      name: session.user.name || "User",
      email: session.user.email,
      image: session.user.image,
    });

    // Attempt ping/health before resolving flat
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/health-ping`)
      .catch(() => {})
      .finally(() => {
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

  // ── Standalone / Installed PWA Launch Screen (Matching baari-app) ──────────
  if (isStandalone) {
    return (
      <div className="min-h-screen bg-navy text-white flex flex-col items-center justify-center p-6 select-none">
        <div className="flex flex-col items-center text-center max-w-xs">
          {/* Logo Badge */}
          <Image
            src="/baari-logo.png"
            alt="Baari Logo"
            width={68}
            height={68}
            className="rounded-[14px] shadow-[0_4px_16px_rgba(0,0,0,0.3)] animate-pulse object-contain bg-white"
            priority
          />

          <h1 className="text-[32px] leading-[38px] font-bold text-white mt-4">
            Baari
          </h1>
          <p className="text-[14px] leading-[20px] text-paleSky text-center mt-1 max-w-[280px]">
            Coordinate flat chores, expenses & communication in one place
          </p>

          {/* Progressive cold-start indicator */}
          <div className="mt-8 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {slowServerHint && (
              <div className="mt-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                <p className="text-[12px] leading-[16px] text-white/90">
                  Waking up backend server... thank you! ✨
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Standard Web Browser Loading Screen ──────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 select-none">
      <div className="flex flex-col items-center gap-4 text-center max-w-xs">
        {/* Navy Logo Badge */}
        <Image
          src="/baari-logo.png"
          alt="Baari Logo"
          width={64}
          height={64}
          className="rounded-2xl shadow-md animate-pulse object-contain"
          priority
        />

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
          <div className="mt-2 px-3 py-2 bg-offWhite rounded-[10px] border border-border transition-opacity">
            <p className="text-[12px] leading-[16px] text-mutedNavy">
              Waking up backend server... thank you for your patience! ✨
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

