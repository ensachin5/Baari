"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn, useAuthSession } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";
import { Button } from "@/components/ui/Button";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import Image from "next/image";
import Link from "next/link";

export default function SignInPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useAuthSession();
  const { setActiveFlat, hydrate, isHydrated } = useSession();
  const storeUser = useSession((state) => state.user);
  const currentUser = session?.user || storeUser;

  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    hydrate();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get("error");
      if (errorParam) {
        if (errorParam === "state_mismatch") {
          setError("Sign-in was interrupted. Please try logging in again.");
        } else {
          setError(`Sign-in error: ${errorParam}`);
        }
      }
    }
  }, [hydrate]);

  // If already authenticated via session or store, redirect directly to dashboard (/home)
  useEffect(() => {
    if (sessionLoading || !isHydrated || !currentUser) return;
    if (hasAttemptedRef.current) return;
    hasAttemptedRef.current = true;

    api
      .get<{ flat: any }>("/api/flats/me")
      .then((res) => {
        if (res?.flat) {
          setActiveFlat(res.flat);
        } else {
          setActiveFlat(null);
        }
        router.replace("/home");
      })
      .catch(() => {
        router.replace("/home");
      });
  }, [sessionLoading, isHydrated, currentUser, router, setActiveFlat]);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError("");
      const callbackURL = `${window.location.origin}/`;
      const res = await signIn.social({
        provider: "google",
        callbackURL,
      });
      if (res?.error) {
        if (
          res.error.message?.includes("Provider not found") ||
          (res.error as any).status === 404
        ) {
          setError(
            "Google Client ID and Secret have not been added to apps/web/.env.local yet. Please paste GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from Google Cloud Console into apps/web/.env.local and restart the server."
          );
        } else {
          setError(res.error.message || "Google sign-in failed. Please try again.");
        }
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center px-5 max-w-md mx-auto w-full py-8">
      {/* Branding Header */}
      <div className="flex flex-col items-center mb-8">
        <Image
          src="/baari-logo.png"
          alt="Baari Logo"
          width={80}
          height={80}
          className="mb-4 object-contain"
          priority
        />
        <h1 className="text-[28px] leading-[34px] font-bold text-black tracking-tight">
          Baari
        </h1>
        <p className="text-[14px] leading-[22px] text-grayBlack text-center mt-2 max-w-[300px]">
          Coordinate flat chores, expenses & communication all in one place
        </p>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="bg-[#FEF2F2] rounded-[8px] px-4 py-3 mb-6 border border-[#FECACA]">
          <p className="text-[13px] leading-[18px] font-medium text-[#DC2626] text-center">
            {error}
          </p>
        </div>
      )}

      {/* Google Authentication Box */}
      <div className="w-full flex flex-col items-center">
        <Button
          title="Continue with Google"
          variant="outline"
          size="lg"
          icon={<GoogleIcon size={22} />}
          onClick={handleGoogleSignIn}
          loading={googleLoading || sessionLoading}
          className="w-full h-12 text-base font-semibold border-border hover:border-navy hover:bg-offWhite transition-all shadow-xs cursor-pointer"
        />

        <p className="text-xs text-center text-grayBlack mt-6 leading-relaxed max-w-[280px]">
          Sign in or get started instantly with your Google account.
        </p>

        {/* Legal Links for Compliance & OAuth Verification */}
        <div className="flex items-center justify-center gap-3 text-xs text-grayBlack mt-8">
          <Link href="/privacy" className="hover:text-navy hover:underline">
            Privacy Policy
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-navy hover:underline">
            Terms & Conditions
          </Link>
        </div>
      </div>
    </div>
  );
}
