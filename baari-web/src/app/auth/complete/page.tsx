"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { syncSessionToStore } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";
import { AlertTriangle, RotateCw, LogOut } from "lucide-react";

function AuthCompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code");
  const setActiveFlat = useSession((state) => state.setActiveFlat);

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setStatus("error");
      setErrorMessage("No authentication code was provided in the URL.");
      return;
    }

    let isMounted = true;

    async function finalizeLogin() {
      try {
        console.log("[AuthComplete] Initiating same-origin fetch for one-time code exchange...");
        
        // Direct same-origin fetch (non-redirect cycle), WebKit ITP immune
        const res = await fetch("/api/auth/complete-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ code }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to finalize session.");
        }

        console.log("[AuthComplete] Session finalized successfully. Syncing session to store...");
        await syncSessionToStore(data);

        // Fetch user's active flat
        const flatRes = await api.get<{ flat: any }>("/api/flats/me").catch(() => null);

        if (!isMounted) return;

        if (flatRes?.flat) {
          console.log("[AuthComplete] Active flat found:", flatRes.flat.name);
          setActiveFlat(flatRes.flat);
          router.replace("/home");
        } else {
          console.log("[AuthComplete] No active flat found. Redirecting to /choose");
          setActiveFlat(null);
          router.replace("/choose");
        }
      } catch (err: any) {
        console.error("[AuthComplete] Exchange failed:", err);
        if (isMounted) {
          setStatus("error");
          setErrorMessage(
            err.message || "Could not complete session setup. Please try signing in again."
          );
        }
      }
    }

    finalizeLogin();

    return () => {
      isMounted = false;
    };
  }, [code, router, setActiveFlat]);

  const handleReturnToSignIn = () => {
    router.replace("/sign-in");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 select-none">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm w-full">
        {/* Logo */}
        <Image
          src="/baari-logo.png"
          alt="Baari Logo"
          width={64}
          height={64}
          className={`object-contain ${status === "loading" ? "animate-pulse" : ""}`}
          priority
        />

        {status === "error" ? (
          <div className="flex flex-col items-center w-full mt-2">
            <div className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center text-[#DC2626] mb-3 border border-[#FECACA]">
              <AlertTriangle size={24} />
            </div>

            <h2 className="text-[18px] leading-[24px] font-bold text-black mb-1">
              Authentication Error
            </h2>
            <p className="text-[13px] leading-[18px] text-grayBlack text-center mb-6 max-w-xs">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={handleReturnToSignIn}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[10px] bg-navy text-white text-[14px] font-semibold hover:bg-deepNavy transition-colors cursor-pointer"
            >
              <LogOut size={16} />
              <span>Back to Sign In</span>
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-[18px] leading-[24px] font-semibold text-black">
              Finalizing Session
            </h2>
            <p className="text-[14px] leading-[20px] text-grayBlack mt-1">
              Establishing secure Same-Origin authentication...
            </p>

            <div className="mt-6 flex justify-center">
              <div className="w-6 h-6 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
        </div>
      }
    >
      <AuthCompleteContent />
    </Suspense>
  );
}
