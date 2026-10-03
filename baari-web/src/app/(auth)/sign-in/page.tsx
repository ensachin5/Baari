"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { authClient, signIn, signUp, useAuthSession, syncSessionToStore } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import Image from "next/image";

type AuthMode = "sign-in" | "sign-up" | "otp";

/**
 * Mirrors baari-app/app/(auth)/sign-in.tsx exactly.
 */
export default function SignInPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useAuthSession();
  const { setActiveFlat, hydrate, isHydrated } = useSession();
  const storeUser = useSession((state) => state.user);
  const storeToken = useSession((state) => state.token);
  const currentUser = session?.user || storeUser;
  const currentToken = session?.session?.token || storeToken;

  const [mode, setMode] = useState<AuthMode>("sign-in");

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  // Loading & error state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
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

  // If already authenticated via session or store, resolve flat and redirect
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
      .catch((err: any) => {
        if (err?.status === 401) {
          import("@/lib/auth-client").then(({ verifyOrRestoreSession }) => {
            verifyOrRestoreSession().then((isValid) => {
              if (!isValid) {
                useSession.getState().logout().catch(() => {});
              }
            });
          });
        } else {
          router.replace("/choose");
        }
      });
  }, [sessionLoading, isHydrated, currentUser, router, setActiveFlat]);

  const handlePostAuth = async (data?: any) => {
    await syncSessionToStore(data);
    try {
      const res = await api.get<{ flat: any }>("/api/flats/me");
      if (res?.flat) {
        setActiveFlat(res.flat);
        router.replace("/home");
      } else {
        setActiveFlat(null);
        router.replace("/choose");
      }
    } catch (err: any) {
      if (err?.status === 401) return;
      router.replace("/choose");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await signUp.email({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      if (res.error) {
        setError(res.error.message || "Failed to sign up");
        setLoading(false);
        return;
      }
      try {
        await authClient.emailOtp.sendVerificationOtp({
          email: email.trim().toLowerCase(),
          type: "email-verification",
        });
      } catch (_) {}
      setMode("otp");
    } catch (err: any) {
      setError(err?.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter your email and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });
      if (res.error) {
        const errMsg = res.error.message || "";
        if (
          errMsg.toLowerCase().includes("email not verified") ||
          errMsg.toLowerCase().includes("verify your email") ||
          res.error.code === "EMAIL_NOT_VERIFIED"
        ) {
          try {
            await authClient.emailOtp.sendVerificationOtp({
              email: email.trim().toLowerCase(),
              type: "email-verification",
            });
          } catch (_) {}
          setMode("otp");
          setLoading(false);
          return;
        }
        setError(errMsg || "Invalid email or password");
        setLoading(false);
        return;
      }
      await handlePostAuth(res.data);
    } catch (err: any) {
      setError(err?.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const cleanText = text.replace(/[^0-9]/g, "");
    const newOtp = [...otp];
    if (cleanText.length > 1) {
      const digits = cleanText.slice(0, 6).split("");
      for (let i = 0; i < 6; i++) {
        newOtp[i] = digits[i] || "";
      }
      setOtp(newOtp);
      if (digits.length === 6) {
        otpInputRefs.current[5]?.focus();
      }
      return;
    }

    newOtp[index] = cleanText;
    setOtp(newOtp);

    if (cleanText && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the full 6-digit code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await authClient.emailOtp.verifyEmail({
        email: email.trim().toLowerCase(),
        otp: code,
      });
      if (res.error) {
        setError(res.error.message || "Invalid or expired code");
        setLoading(false);
        return;
      }
      await handlePostAuth(res.data);
    } catch (err: any) {
      setError(err?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    setError("");
    setResendMessage("");
    try {
      const res = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: "email-verification",
      });
      if (res.error) {
        setError(res.error.message || "Failed to send code");
      } else {
        setResendMessage("Verification code sent!");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to send code");
    } finally {
      setResendLoading(false);
    }
  };

  // TEMP: Google sign-in disabled while fixing WebKit cookie issue — re-enable by uncommenting
  /*
  const [googleLoading, setGoogleLoading] = useState(false);
  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError("");
      const callbackURL = `${window.location.origin}/`;
      await signIn.social({
        provider: "google",
        callbackURL,
      });
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed");
      setGoogleLoading(false);
    }
  };
  */

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center px-5 max-w-md mx-auto w-full py-8">
      {/* Branding Header */}
      <div className="flex flex-col items-center mb-6">
        <Image
          src="/baari-logo.png"
          alt="Baari Logo"
          width={72}
          height={72}
          className="mb-2 object-contain"
          priority
        />
        <h1 className="text-[28px] leading-[34px] font-bold text-black">
          Baari
        </h1>
        <p className="text-[14px] leading-[20px] text-grayBlack text-center mt-1 max-w-[280px]">
          Coordinate flat chores, expenses & communication in one place
        </p>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="bg-[#FEF2F2] rounded-[6px] px-3 py-2 mb-4 border border-[#FECACA]">
          <p className="text-[13px] leading-[18px] font-medium text-[#DC2626] text-center">
            {error}
          </p>
        </div>
      )}

      {/* Resend Success Message */}
      {resendMessage && (
        <div className="bg-[#F0FDF4] rounded-[6px] px-3 py-2 mb-4 border border-[#BBF7D0]">
          <p className="text-[13px] leading-[18px] font-medium text-[#166534] text-center">
            {resendMessage}
          </p>
        </div>
      )}

      {/* MODE: SIGN IN */}
      {mode === "sign-in" && (
        <form onSubmit={handleSignIn} className="w-full">
          <h2 className="text-[22px] font-bold text-navy text-center mb-4">
            Welcome back
          </h2>

          <Input
            label="Email"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
          />

          <Input
            label="Password"
            placeholder="Enter password"
            isPassword
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            title="Log in"
            variant="primary"
            size="lg"
            type="submit"
            loading={loading}
            className="w-full mt-2"
          />

          {/* TEMP: Google sign-in disabled while fixing WebKit cookie issue — re-enable by uncommenting */}
          {/*
          <Button
            title="Continue with Google"
            variant="outline"
            size="lg"
            icon={<GoogleIcon size={20} />}
            onClick={handleGoogleSignIn}
            loading={googleLoading || sessionLoading}
            className="w-full mt-3"
          />
          */}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setError("");
                setMode("sign-up");
              }}
              className="text-[14px] text-grayBlack hover:underline cursor-pointer"
            >
              Don't have an account? <span className="font-semibold text-navy">Create account</span>
            </button>
          </div>
        </form>
      )}

      {/* MODE: SIGN UP */}
      {mode === "sign-up" && (
        <form onSubmit={handleSignUp} className="w-full">
          <h2 className="text-[22px] font-bold text-navy text-center mb-4">
            Create an account
          </h2>

          <Input
            label="Full Name"
            placeholder="John Doe"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Email"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
          />

          <Input
            label="Password"
            placeholder="Create a password"
            isPassword
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            title="Create account"
            variant="primary"
            size="lg"
            type="submit"
            loading={loading}
            className="w-full mt-2"
          />

          {/* TEMP: Google sign-in disabled while fixing WebKit cookie issue — re-enable by uncommenting */}
          {/*
          <Button
            title="Continue with Google"
            variant="outline"
            size="lg"
            icon={<GoogleIcon size={20} />}
            onClick={handleGoogleSignIn}
            loading={googleLoading || sessionLoading}
            className="w-full mt-3"
          />
          */}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setError("");
                setMode("sign-in");
              }}
              className="text-[14px] text-grayBlack hover:underline cursor-pointer"
            >
              Already have an account? <span className="font-semibold text-navy">Log in</span>
            </button>
          </div>
        </form>
      )}

      {/* MODE: OTP ENTRY */}
      {mode === "otp" && (
        <form onSubmit={handleVerifyOtp} className="w-full">
          <h2 className="text-[22px] font-bold text-navy text-center mb-2">
            Verify your email
          </h2>
          <p className="text-[14px] text-grayBlack text-center mb-6 leading-5">
            We sent a 6-digit verification code to <br />
            <span className="font-semibold text-navy">{email}</span>
          </p>

          <div className="flex justify-between mb-6 px-1 gap-2">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  otpInputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={idx === 0 ? 6 : 1}
                value={digit}
                onChange={(e) => handleOtpChange(e.target.value, idx)}
                onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                className={`w-11 h-13 border-[1.5px] rounded-[10px] text-center text-[22px] font-semibold text-navy transition-colors focus:outline-none focus:border-navy ${
                  digit ? "border-navy bg-slate-50" : "border-border bg-white"
                }`}
              />
            ))}
          </div>

          <Button
            title="Verify Code"
            variant="primary"
            size="lg"
            type="submit"
            loading={loading}
            className="w-full"
          />

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendLoading}
              className="text-[13px] font-semibold text-navy hover:underline cursor-pointer disabled:opacity-50"
            >
              {resendLoading ? "Sending..." : "Didn't receive a code? Resend code"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setError("");
                setResendMessage("");
                setMode("sign-in");
              }}
              className="text-[14px] text-grayBlack hover:underline cursor-pointer"
            >
              ← Back to sign in
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

