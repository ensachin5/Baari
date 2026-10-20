"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn, useAuthSession } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

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

  // If already authenticated via session or store, redirect directly to dashboard or onboarding
  useEffect(() => {
    if (sessionLoading || !isHydrated || !currentUser) return;
    if (hasAttemptedRef.current) return;
    hasAttemptedRef.current = true;

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
    <main className="min-h-screen w-full flex items-center justify-center bg-[#F3F8FF] sm:p-6 p-0 relative selection:bg-blue-100 overflow-x-hidden">
      {/* Ambient soft blue background accents for desktop */}
      <div className="fixed -top-32 -left-32 w-96 h-96 bg-[#E1EFFF] rounded-full blur-3xl pointer-events-none opacity-60" />
      <div className="fixed -bottom-32 -right-32 w-96 h-96 bg-[#E8F4FF] rounded-full blur-3xl pointer-events-none opacity-60" />

      {/* Main Mobile Screen Container */}
      <div className="relative w-full sm:max-w-[430px] min-h-screen sm:min-h-0 sm:my-auto bg-white border-0 sm:border sm:border-[#DCEBFA] sm:rounded-[36px] sm:shadow-[0_20px_50px_rgba(7,26,75,0.08)] flex flex-col justify-between overflow-hidden">
        
        {/* Top-Left Circular Blue Back Arrow Button (Directly overlaps the hero artwork) */}
        <Link
          href="/"
          className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-[#0866F5] hover:bg-[#0757D1] active:scale-95 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(8,102,245,0.35)] transition-all"
          aria-label="Back to home"
        >
          <ArrowLeft size={20} strokeWidth={2.6} />
        </Link>

        {/* Global Error Banner */}
        {error && (
          <div className="absolute top-16 left-4 right-4 z-30 bg-red-50/95 backdrop-blur-xs border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs font-medium text-center shadow-md animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {/* Top: Authentic Baari Logo & Household Scene Artwork (Full-bleed 100% width) */}
        <div className="relative w-full aspect-[493/650] bg-[#EEF7FD] shrink-0">
          <Image
            src="/signin-hero.png"
            alt="Baari - Har Kaam Ki Apni Baari"
            fill
            priority
            sizes="(max-width: 640px) 100vw, 430px"
            className="object-cover object-top select-none pointer-events-none"
          />
        </div>

        {/* Bottom Half: Real Crisp Typography, Feature Badges, CTA, and Footer */}
        <div className="flex flex-col justify-start px-6 pt-3 pb-6 bg-white gap-3.5 sm:gap-4">
          
          {/* Main Headline */}
          <div className="text-center pt-1">
            <h1 className="text-[26px] sm:text-[28px] font-extrabold tracking-tight leading-[1.15]">
              <span className="block text-[#071A4B]">Share Chores</span>
              <span className="block text-[#0866F5]">Live Better</span>
            </h1>
          </div>

          {/* 3 Feature Badges */}
          <div className="flex items-start justify-center gap-6 sm:gap-7 py-1">
            {/* Feature 1: Track Chores */}
            <div className="flex flex-col items-center">
              <div className="w-[56px] h-[56px] rounded-[18px] bg-[#E8F4FF] flex items-center justify-center text-[#0866F5] shadow-xs">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="3" width="16" height="18" rx="4" fill="#0866F5" />
                  <path d="M8.5 2H15.5C16.05 2 16.5 2.45 16.5 3V4H7.5V3C7.5 2.45 7.95 2 8.5 2Z" fill="#071A4B" />
                  <path d="M8 12.5L10.5 15L16 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="mt-2 text-center text-[11.5px] font-bold text-[#071A4B] leading-tight">
                Track<br />Chores
              </span>
            </div>

            {/* Feature 2: Split Expenses */}
            <div className="flex flex-col items-center">
              <div className="w-[56px] h-[56px] rounded-[18px] bg-[#E8F4FF] flex items-center justify-center text-[#0866F5] shadow-xs">
                <span className="text-[26px] font-extrabold text-[#0866F5] leading-none select-none">₹</span>
              </div>
              <span className="mt-2 text-center text-[11.5px] font-bold text-[#071A4B] leading-tight">
                Split<br />Expenses
              </span>
            </div>

            {/* Feature 3: Roommate Chat */}
            <div className="flex flex-col items-center">
              <div className="w-[56px] h-[56px] rounded-[18px] bg-[#E8F4FF] flex items-center justify-center text-[#0866F5] shadow-xs">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#0866F5">
                  <path d="M12 3C6.48 3 2 6.81 2 11.5C2 14.16 3.45 16.51 5.73 18.01C5.47 19.35 4.8 20.49 4.76 20.55C4.55 20.89 4.68 21.33 5.03 21.52C5.23 21.62 5.45 21.64 5.66 21.58C7.58 20.98 9.18 19.92 10.15 19.16C10.75 19.26 11.37 19.32 12 19.32C17.52 19.32 22 15.51 22 10.82C22 6.12 17.52 3 12 3Z" />
                  <circle cx="8" cy="11.5" r="1.3" fill="white" />
                  <circle cx="12" cy="11.5" r="1.3" fill="white" />
                  <circle cx="16" cy="11.5" r="1.3" fill="white" />
                </svg>
              </div>
              <span className="mt-2 text-center text-[11.5px] font-bold text-[#071A4B] leading-tight">
                Roommate<br />Chat
              </span>
            </div>
          </div>

          {/* Continue with Google Button */}
          <div className="w-full pt-1">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || sessionLoading}
              aria-label="Continue with Google"
              className="w-full h-[54px] bg-[#0866F5] hover:bg-[#0875F9] active:scale-[0.98] text-white rounded-2xl shadow-[0_8px_22px_rgba(8,102,245,0.32)] flex items-center justify-between px-3.5 transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-80"
            >
              {/* Google G logo inside white circle badge */}
              <div className="w-[34px] h-[34px] rounded-full bg-white flex items-center justify-center shadow-xs shrink-0">
                <GoogleIcon size={18} />
              </div>

              {/* Text */}
              <span className="text-[16px] font-semibold text-white tracking-wide">
                {googleLoading ? "Connecting..." : "Continue with Google"}
              </span>

              {/* Right Arrow */}
              <div className="w-[34px] flex items-center justify-end shrink-0 pr-1">
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.4} />
                )}
              </div>
            </button>
          </div>

          {/* Legal Footer */}
          <div className="text-center pt-1 pb-1">
            <p className="text-[12px] leading-relaxed text-[#727D98]">
              By continuing, you agree to our
            </p>
            <div className="text-[12px] font-medium text-[#0866F5] mt-0.5 space-x-1.5">
              <Link href="/privacy" className="hover:underline transition-colors">
                Privacy Policy
              </Link>
              <span className="text-[#727D98] select-none">·</span>
              <Link href="/terms" className="hover:underline transition-colors">
                Terms & Conditions
              </Link>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
