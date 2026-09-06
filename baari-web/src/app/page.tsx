"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession, signOut } from "@/lib/auth-client";
import { api, API_BASE_URL } from "@/lib/api";
import { useSession } from "@/store/session";
import { Button } from "@/components/ui/Button";
import { RotateCw, AlertTriangle, LogOut } from "lucide-react";
import Image from "next/image";

const MAX_TOTAL_WAIT_MS = 45000; // Hard max wait: 45 seconds
const PER_REQUEST_TIMEOUT_MS = 10000; // 10s per fetch attempt
const MAX_ATTEMPTS = 8; // Max retries before showing error

type StartupStatus = "initializing" | "waking" | "resolving" | "error";

export default function RootIndexPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useAuthSession();
  const { isHydrated, setUser, setActiveFlat, hydrate } = useSession();

  const [status, setStatus] = useState<StartupStatus>("initializing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [slowServerHint, setSlowServerHint] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isStandalone, setIsStandalone] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isRunningRef = useRef(false);

  // 1. Initial hydration and standalone PWA detection
  useEffect(() => {
    hydrate();
    if (typeof window !== "undefined") {
      const isPwa =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isPwa);
    }
  }, [hydrate]);

  // 2. Slow server hint after 3.5 seconds of waiting
  useEffect(() => {
    if (status === "waking" || status === "initializing") {
      const timer = setTimeout(() => {
        setSlowServerHint(true);
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      setSlowServerHint(false);
    }
  }, [status]);

  // 3. Ping backend with timeout and exponential backoff
  const pingBackend = async (
    attempt: number,
    totalStartTime: number,
    signal: AbortSignal
  ): Promise<boolean> => {
    const attemptStartTime = Date.now();
    const elapsedTotal = Math.round((attemptStartTime - totalStartTime) / 1000);
    console.log(
      `[WakeUp] Attempt ${attempt}/${MAX_ATTEMPTS} — Pinging ${API_BASE_URL}/health-ping (total elapsed: ${elapsedTotal}s)...`
    );

    // Per-attempt timeout controller (linked to parent signal)
    const requestController = new AbortController();
    const timeoutId = setTimeout(
      () => requestController.abort(),
      PER_REQUEST_TIMEOUT_MS
    );

    const onParentAbort = () => requestController.abort();
    signal.addEventListener("abort", onParentAbort);

    try {
      const res = await fetch(`${API_BASE_URL}/health-ping`, {
        method: "GET",
        signal: requestController.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);
      signal.removeEventListener("abort", onParentAbort);

      const durationMs = Date.now() - attemptStartTime;
      if (res.ok) {
        console.log(
          `[WakeUp] Attempt ${attempt} SUCCEEDED (status: ${res.status}, duration: ${durationMs}ms)`
        );
        return true;
      } else {
        console.warn(
          `[WakeUp] Attempt ${attempt} returned non-200 status: ${res.status} (${res.statusText}) in ${durationMs}ms`
        );
        return false;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      signal.removeEventListener("abort", onParentAbort);

      const durationMs = Date.now() - attemptStartTime;
      const isTimeout =
        err?.name === "AbortError" || requestController.signal.aborted;
      if (isTimeout) {
        console.warn(
          `[WakeUp] Attempt ${attempt} TIMED OUT after ${durationMs}ms`
        );
      } else {
        console.warn(
          `[WakeUp] Attempt ${attempt} FAILED: [${err?.name || "Error"}] ${
            err?.message || "Unknown network error"
          } in ${durationMs}ms`
        );
      }
      return false;
    }
  };

  // 4. Main wake-up and routing sequence
  const startWakeUpAndResolve = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    // Reset abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const overallController = new AbortController();
    abortControllerRef.current = overallController;

    setStatus("waking");
    setErrorMessage(null);

    const totalStartTime = Date.now();
    let isServerReady = false;

    console.log(
      `[WakeUp] Starting backend wake-up cycle (max timeout: ${
        MAX_TOTAL_WAIT_MS / 1000
      }s, max attempts: ${MAX_ATTEMPTS})`
    );

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (overallController.signal.aborted) break;

      setAttemptCount(attempt);
      const success = await pingBackend(
        attempt,
        totalStartTime,
        overallController.signal
      );

      if (success) {
        isServerReady = true;
        break;
      }

      // Check total time elapsed
      const totalElapsed = Date.now() - totalStartTime;
      if (totalElapsed >= MAX_TOTAL_WAIT_MS || attempt === MAX_ATTEMPTS) {
        console.error(
          `[WakeUp] Exceeded budget (total elapsed: ${Math.round(
            totalElapsed / 1000
          )}s, attempts: ${attempt}). Stopping retries.`
        );
        break;
      }

      // Backoff delay before next retry: 1s, 2s, 3s, 4s, 5s...
      const backoffDelay = Math.min(1000 * attempt, 4000);
      console.log(`[WakeUp] Waiting ${backoffDelay}ms before retry ${attempt + 1}...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }

    if (!isServerReady) {
      isRunningRef.current = false;
      setStatus("error");
      setErrorMessage(
        "We're having trouble reaching the server. It may still be starting up or your connection was interrupted."
      );
      return;
    }

    // 5. Server is healthy -> resolve active flat for authenticated user
    setStatus("resolving");
    console.log("[WakeUp] Server is awake. Resolving user flat via GET /api/flats/me...");

    try {
      const res = await api.get<{ flat: any }>("/api/flats/me");
      if (res?.flat) {
        console.log(
          `[WakeUp] Active flat resolved: "${res.flat.name}" (id: ${res.flat.id}). Redirecting to /home...`
        );
        setActiveFlat(res.flat);
        router.replace("/home");
      } else {
        console.log("[WakeUp] No active flat found. Redirecting to /choose...");
        setActiveFlat(null);
        router.replace("/choose");
      }
    } catch (apiErr: any) {
      console.error(
        `[WakeUp] Failed to resolve flat via /api/flats/me: [${apiErr?.status}] ${apiErr?.message}`
      );
      if (apiErr?.status === 401) {
        console.log("[WakeUp] 401 Unauthorized — Redirecting to /sign-in...");
        router.replace("/sign-in");
      } else if (apiErr?.status === 404) {
        console.log("[WakeUp] 404 Not Found — Redirecting to /choose...");
        setActiveFlat(null);
        router.replace("/choose");
      } else {
        setStatus("error");
        setErrorMessage(
          apiErr?.message || "Failed to load flat space. Please try again."
        );
      }
    } finally {
      isRunningRef.current = false;
    }
  }, [router, setActiveFlat]);

  // Trigger on session & hydration resolution
  useEffect(() => {
    if (!isHydrated || sessionLoading) return;

    if (!session?.user) {
      console.log("[WakeUp] No active session. Redirecting to /sign-in...");
      router.replace("/sign-in");
      return;
    }

    // Sync user into store
    setUser({
      id: session.user.id,
      name: session.user.name || "User",
      email: session.user.email,
      image: session.user.image,
    });

    startWakeUpAndResolve();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isHydrated, sessionLoading, session?.user, setUser, startWakeUpAndResolve, router]);

  const handleRetry = () => {
    startWakeUpAndResolve();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/sign-in");
    } catch {
      router.replace("/sign-in");
    }
  };

  // ── Standalone / Installed PWA Launch Screen ──────────────────────────────
  if (isStandalone) {
    return (
      <div className="min-h-screen bg-navy text-white flex flex-col items-center justify-center p-6 select-none">
        <div className="flex flex-col items-center text-center max-w-xs w-full">
          {/* Logo */}
          <Image
            src="/baari-logo.png"
            alt="Baari Logo"
            width={72}
            height={72}
            className={`object-contain ${status !== "error" ? "animate-pulse" : ""}`}
            priority
          />

          <h1 className="text-[32px] leading-[38px] font-bold text-white mt-4">
            Baari
          </h1>

          {status === "error" ? (
            /* Error State in Standalone PWA */
            <div className="mt-5 w-full flex flex-col items-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#FCA5A5] mb-3">
                <AlertTriangle size={15} />
                <span className="text-[12px] font-medium">Connection issue</span>
              </div>
              <p className="text-[13px] leading-[18px] text-paleSky text-center mb-6">
                {errorMessage || "We're having trouble reaching the server."}
              </p>

              <div className="w-full flex flex-col gap-2.5">
                <Button
                  title="Try again"
                  variant="primary"
                  size="md"
                  onClick={handleRetry}
                  icon={<RotateCw size={16} />}
                  className="w-full bg-white text-navy hover:bg-offWhite font-semibold shadow-md"
                />
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center justify-center gap-1.5 text-xs text-paleSky hover:text-white py-2 transition-colors cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Sign in with a different account</span>
                </button>
              </div>
            </div>
          ) : (
            /* Loading / Waking State in Standalone PWA */
            <>
              <p className="text-[14px] leading-[20px] text-paleSky text-center mt-1 max-w-[280px]">
                {status === "resolving"
                  ? "Loading your flat space..."
                  : "Coordinate flat chores, expenses & communication in one place"}
              </p>

              <div className="mt-8 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {slowServerHint && (
                  <div className="mt-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                    <p className="text-[12px] leading-[16px] text-white/90">
                      Waking up backend server (attempt {attemptCount})... thank you! ✨
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Standard Web Browser Loading Screen ──────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 select-none">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm w-full">
        {/* Logo */}
        <Image
          src="/baari-logo.png"
          alt="Baari Logo"
          width={64}
          height={64}
          className={`object-contain ${status !== "error" ? "animate-pulse" : ""}`}
          priority
        />

        {status === "error" ? (
          /* Error State in Web Browser */
          <div className="flex flex-col items-center w-full mt-2">
            <div className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center text-[#DC2626] mb-3 border border-[#FECACA]">
              <AlertTriangle size={24} />
            </div>

            <h2 className="text-[18px] leading-[24px] font-bold text-black mb-1">
              We&apos;re having trouble reaching the server
            </h2>
            <p className="text-[13px] leading-[18px] text-grayBlack text-center mb-6 max-w-xs">
              {errorMessage || "The backend server is taking longer than usual to respond. Please check your internet connection or try again."}
            </p>

            <div className="w-full flex flex-col gap-2.5 max-w-xs">
              <Button
                title="Try again"
                variant="primary"
                size="md"
                onClick={handleRetry}
                icon={<RotateCw size={16} />}
                className="w-full"
              />
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center justify-center gap-1.5 text-xs text-mutedNavy hover:text-navy py-1.5 transition-colors cursor-pointer"
              >
                <LogOut size={13} />
                <span>Sign in with a different account</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Waking / Loading State in Web Browser */
          <>
            <div>
              <h2 className="text-[18px] leading-[24px] font-semibold text-black">
                Baari
              </h2>
              <p className="text-[14px] leading-[20px] text-grayBlack mt-1">
                {status === "resolving"
                  ? "Loading your flat space..."
                  : "Setting up your flat space..."}
              </p>
            </div>

            {/* Cold-start progressive indicator */}
            {slowServerHint && (
              <div className="mt-2 px-3.5 py-2 bg-offWhite rounded-[10px] border border-border transition-opacity">
                <p className="text-[12px] leading-[16px] text-mutedNavy">
                  Waking up backend server (attempt {attemptCount})... thank you for your patience! ✨
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
