"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useAuthSession } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";
import { Button } from "@/components/ui/Button";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import Image from "next/image";

/**
 * Mirrors baari-app/app/(auth)/sign-in.tsx exactly.
 */
export default function SignInPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useAuthSession();
  const { setUser, setActiveFlat, setToken, hydrate } = useSession();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    hydrate();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get("error");
      if (errorParam) {
        if (errorParam === "state_mismatch") {
          setError("Sign-in was interrupted. Please try clicking 'Continue with Google' again.");
        } else {
          setError(`Sign-in error: ${errorParam}`);
        }
      }
    }
  }, [hydrate]);

  // If already authenticated via session, resolve flat and redirect
  useEffect(() => {
    console.log("[SignInPage Post-Login Trace]", {
      sessionLoading,
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id || null,
      email: session?.user?.email || null,
      tokenSnippet: session?.session?.token ? `${session.session.token.substring(0, 10)}...` : null,
      timestamp: new Date().toISOString(),
    });

    if (!sessionLoading && session?.user) {
      console.log("[SignInPage Log] User is authenticated. Updating session store & fetching /api/flats/me...");
      if (session.session?.token) {
        setToken(session.session.token);
      }
      setUser({
        id: session.user.id,
        name: session.user.name || "User",
        email: session.user.email,
        image: session.user.image,
      });

      console.log("[SignInPage Log] Calling GET /api/flats/me...");
      api
        .get<{ flat: any }>("/api/flats/me")
        .then((res) => {
          console.log("[SignInPage Log] GET /api/flats/me response:", {
            status: 200,
            hasFlat: !!res?.flat,
            flat: res?.flat || null,
            fullResponseBody: res,
          });

          if (res?.flat) {
            console.log("[SignInPage Decision] Active flat found -> Redirecting to /home");
            setActiveFlat(res.flat);
            router.replace("/home");
          } else {
            console.log("[SignInPage Decision] User authenticated but no flat found (flat is null) -> Redirecting to /choose");
            setActiveFlat(null);
            router.replace("/choose");
          }
        })
        .catch((err: any) => {
          console.warn("[SignInPage Log] GET /api/flats/me failed:", {
            status: err?.status || "NetworkError",
            message: err?.message || "Unknown error",
            errorData: err?.data || null,
          });
          if (err?.status === 401) {
            console.log("[SignInPage Decision] GET /api/flats/me returned 401 Unauthorized -> User needs fresh authentication.");
          } else {
            console.log("[SignInPage Decision] GET /api/flats/me error (non-401) -> Redirecting to /choose");
            router.replace("/choose");
          }
        });
    }
  }, [session, sessionLoading, router, setUser, setActiveFlat, setToken]);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError("");

      const callbackURL = `${window.location.origin}/`;
      console.log(`[SignInPage Log] Triggering authClient.signIn.social({ provider: 'google', callbackURL: '${callbackURL}' })...`);

      const res = await signIn.social({
        provider: "google",
        callbackURL,
      });

      console.log("[SignInPage Log] authClient.signIn.social() result returned:", {
        result: res,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("[SignInPage Log] authClient.signIn.social() error:", {
        error: err,
        message: err?.message || "Google sign-in failed",
        timestamp: new Date().toISOString(),
      });
      setError(err?.message || "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center px-5 max-w-md mx-auto w-full">
      {/* Branding Header */}
      <div className="flex flex-col items-center mb-8">
        <Image
          src="/baari-logo.png"
          alt="Baari Logo"
          width={84}
          height={84}
          className="mb-3 object-contain"
          priority
        />
        <h1 className="text-[28px] leading-[34px] font-bold text-black">
          Baari
        </h1>
        <p className="text-[14px] leading-[20px] text-grayBlack text-center mt-1 max-w-[280px]">
          Coordinate flat chores, expenses & communication in one place
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-[#FEF2F2] rounded-[6px] px-3 py-2 mb-4 border border-[#FECACA]">
          <p className="text-[13px] leading-[18px] font-medium text-[#DC2626] text-center">
            {error}
          </p>
        </div>
      )}

      {/* Google Sign In — Button variant="outline", size="lg" */}
      <Button
        title="Continue with Google"
        variant="outline"
        size="lg"
        icon={<GoogleIcon size={20} />}
        onClick={handleGoogleSignIn}
        loading={googleLoading || sessionLoading}
        className="w-full"
      />
    </div>
  );
}

