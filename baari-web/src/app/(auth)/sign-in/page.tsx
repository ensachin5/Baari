"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useAuthSession } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";
import { Button } from "@/components/ui/Button";

/**
 * Mirrors baari-app/app/(auth)/sign-in.tsx exactly.
 *
 * Layout from RN:
 *   container: flex: 1, bg white, justifyContent: 'center', paddingHorizontal: Spacing.xl (20px)
 *   brandContainer: alignItems: 'center', marginBottom: Spacing.xxxl (32px)
 *   logoBadge: 68x68, borderRadius: 14px, bg navy, shadow (0 4px 8px rgba(6,23,41,0.15)), marginBottom: 12px
 *   logoBadgeText: 36px, 700, color white
 *   title: Typography.Display (28px, 700, color #1A1A1A)
 *   tagline: Typography.BodySmall (14px, color #5C5F66, textAlign: 'center', marginTop: 4px, maxWidth: 280px)
 *   Button: title="Continue with Google", variant="outline", size="lg", width: 100%
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
    if (!sessionLoading && session?.user) {
      if (session.session?.token) {
        setToken(session.session.token);
      }
      setUser({
        id: session.user.id,
        name: session.user.name || "User",
        email: session.user.email,
        image: session.user.image,
      });

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
    }
  }, [session, sessionLoading, router, setUser, setActiveFlat]);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError("");

      await signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}/`,
      });
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center px-5 max-w-md mx-auto w-full">
      {/* Branding Header — marginBottom: Spacing.xxxl = 32px */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-[68px] h-[68px] rounded-[14px] bg-navy flex items-center justify-center mb-3 shadow-[0_4px_8px_rgba(6,23,41,0.15)]">
          <span className="text-[36px] font-bold text-white">B</span>
        </div>
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
        onClick={handleGoogleSignIn}
        loading={googleLoading || sessionLoading}
        className="w-full"
      />
    </div>
  );
}
