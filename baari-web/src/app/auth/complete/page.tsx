"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { syncSessionToStore } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";
import { AlertTriangle, LogOut, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

interface DebugLog {
  time: string;
  step: string;
  message: string;
  details?: any;
  type?: "info" | "success" | "error";
}

function AuthCompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code");
  const setActiveFlat = useSession((state) => state.setActiveFlat);

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [showDebugLogs, setShowDebugLogs] = useState(true);

  const addLog = (step: string, message: string, details?: any, type: "info" | "success" | "error" = "info") => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    const logItem: DebugLog = { time, step, message, details, type };
    console.log(`[${time}] [${step}] ${message}`, details ? details : "");
    setDebugLogs((prev) => [...prev, logItem]);
  };

  useEffect(() => {
    addLog("STEP 1: PAGE MOUNTED", "Successfully landed on /auth/complete page.", {
      extractedCode: code || "NONE",
      currentURL: typeof window !== "undefined" ? window.location.href : "",
    }, code ? "info" : "error");

    if (!code) {
      setStatus("error");
      setErrorMessage("No authentication code was provided in the URL.");
      return;
    }

    let isMounted = true;

    async function finalizeLogin() {
      try {
        addLog("STEP 2: FETCH INITIATED", "Calling POST /api/auth/complete-login via direct Same-Origin fetch...", {
          endpoint: "/api/auth/complete-login",
          method: "POST",
          credentials: "include (CONFIRMED PRESENT)",
          payload: { code: `${code?.substring(0, 10)}...` },
        });

        // Direct same-origin fetch (non-redirect cycle), WebKit ITP immune
        const res = await fetch("/api/auth/complete-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ code }),
        });

        addLog("STEP 2.1: FETCH RESPONSE RECEIVED", `Received HTTP response with status ${res.status}`, {
          status: res.status,
          ok: res.ok,
          statusText: res.statusText,
          setCookieNote: "Server attached 30-day Set-Cookie headers on response (WebKit ITP immune)",
        }, res.ok ? "success" : "error");

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || `Exchange failed with status ${res.status}`);
        }

        addLog("STEP 3: STORE SYNC", "Token exchange successful! Syncing user session into Zustand store & client storage...", {
          userEmail: data.user?.email,
          userName: data.user?.name,
          hasToken: !!data.token,
        }, "success");

        await syncSessionToStore(data);

        const storeState = useSession.getState();
        addLog("STEP 3.1: APP AUTH STATE CHECK", "Verifying if app state now considers user logged in...", {
          isLoggedIn: !!storeState.user,
          userId: storeState.user?.id,
          userEmail: storeState.user?.email,
          storeHasToken: !!storeState.token,
        }, storeState.user ? "success" : "error");

        addLog("STEP 4: GET-SESSION & FLAT CHECK", "Checking user's active flat via GET /api/flats/me...");
        const flatRes = await api.get<{ flat: any }>("/api/flats/me").catch((err) => {
          addLog("STEP 4 (WARN)", "GET /api/flats/me error (non-fatal): " + (err?.message || err), null, "error");
          return null;
        });

        if (!isMounted) return;

        if (flatRes?.flat) {
          addLog("STEP 5: NAVIGATION", `Active flat found ("${flatRes.flat.name}"). Navigating to /home...`, null, "success");
          setActiveFlat(flatRes.flat);
          setStatus("success");
          setTimeout(() => router.replace("/home"), 1200);
        } else {
          addLog("STEP 5: NAVIGATION", "No active flat found. Navigating to /choose...", null, "info");
          setActiveFlat(null);
          setStatus("success");
          setTimeout(() => router.replace("/choose"), 1200);
        }
      } catch (err: any) {
        addLog("EXCHANGE ERROR", err.message || "Session finalization failed", err, "error");
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
    <div className="min-h-screen bg-white flex flex-col items-center justify-start p-6 select-none relative pb-32">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm w-full mt-10">
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
        ) : status === "success" ? (
          <div className="flex flex-col items-center w-full mt-2">
            <div className="w-12 h-12 rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#059669] mb-3 border border-[#A7F3D0]">
              <CheckCircle2 size={24} />
            </div>
            <h2 className="text-[18px] leading-[24px] font-semibold text-black">
              Session Established!
            </h2>
            <p className="text-[14px] leading-[20px] text-grayBlack mt-1">
              Redirecting to your flat...
            </p>
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

      {/* On-Screen iPhone Debug HUD Box */}
      <div className="w-full max-w-md mt-8 border border-border rounded-xl bg-slate-900 text-slate-100 overflow-hidden text-left shadow-lg">
        <div
          onClick={() => setShowDebugLogs(!showDebugLogs)}
          className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              iPhone Debug HUD ({debugLogs.length} Steps)
            </span>
          </div>
          <button type="button" className="text-slate-400 hover:text-white">
            {showDebugLogs ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>

        {showDebugLogs && (
          <div className="p-3 max-h-64 overflow-y-auto space-y-2 font-mono text-[11px] leading-relaxed select-text">
            {debugLogs.length === 0 ? (
              <p className="text-slate-500 italic">Initializing debug logs...</p>
            ) : (
              debugLogs.map((log, index) => (
                <div key={index} className="border-b border-slate-800/80 pb-1.5 last:border-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 text-[10px]">{log.time}</span>
                    <span
                      className={`font-bold px-1 rounded text-[10px] ${
                        log.type === "success"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : log.type === "error"
                          ? "bg-red-950 text-red-300 border border-red-800"
                          : "bg-slate-800 text-sky-300"
                      }`}
                    >
                      {log.step}
                    </span>
                  </div>
                  <p className="text-slate-200 mt-0.5">{log.message}</p>
                  {log.details && (
                    <pre className="mt-1 text-[10px] bg-slate-950 p-1.5 rounded text-slate-400 overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
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
