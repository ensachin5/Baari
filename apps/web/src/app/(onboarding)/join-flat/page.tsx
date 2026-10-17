"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";
import { ArrowLeft, Users } from "lucide-react";

interface JoinFlatResponse {
  flat: {
    id: string;
    name: string;
    type?: "flat" | "pg" | "hostel";
    inviteCode: string;
    role: "admin" | "member";
    memberCount: number;
  };
  message?: string;
}

export default function JoinFlatPage() {
  const router = useRouter();
  const setActiveFlat = useSession((state) => state.setActiveFlat);

  const [inviteCode, setInviteCode] = useState("");
  const [localError, setLocalError] = useState("");

  const joinFlatMutation = useMutation({
    mutationFn: (code: string) =>
      api.post<JoinFlatResponse>("/api/flats/join", {
        inviteCode: code.trim().toUpperCase(),
      }),
    onSuccess: (res) => {
      if (res?.flat) {
        setActiveFlat({
          id: res.flat.id,
          name: res.flat.name,
          type: res.flat.type,
          inviteCode: res.flat.inviteCode,
          role: "member",
        });
        router.replace("/home");
      }
    },
    onError: (err: Error) => {
      setLocalError(
        err.message || "Invalid invite code. Please check with your flatmate."
      );
    },
  });

  const handleJoin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inviteCode.trim()) {
      setLocalError("Please enter the 6-character invite code");
      return;
    }
    setLocalError("");
    joinFlatMutation.mutate(inviteCode.trim());
  };

  const errorMessage =
    localError ||
    (joinFlatMutation.isError
      ? (joinFlatMutation.error as Error)?.message ||
        "Invalid invite code. Please check with your flatmate."
      : "");

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#F3F8FF] sm:p-6 p-0 relative selection:bg-blue-100 overflow-x-hidden">
      {/* Ambient soft blue background accents for desktop */}
      <div className="fixed -top-32 -left-32 w-96 h-96 bg-[#E1EFFF] rounded-full blur-3xl pointer-events-none opacity-60" />
      <div className="fixed -bottom-32 -right-32 w-96 h-96 bg-[#E8F4FF] rounded-full blur-3xl pointer-events-none opacity-60" />

      {/* Main Screen Container matching Reference */}
      <div className="relative w-full sm:max-w-[430px] min-h-screen sm:min-h-[720px] sm:my-auto bg-white border-0 sm:border sm:border-[#DCEBFA] sm:rounded-[36px] sm:shadow-[0_20px_50px_rgba(7,26,75,0.08)] flex flex-col justify-between p-6 sm:p-8 overflow-hidden">
        
        {/* Crisp Decorative Ambient Cloud Wave in Top-Right matching Reference Image */}
        <svg
          viewBox="0 0 240 190"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute top-0 right-0 w-[200px] h-[160px] sm:w-[240px] sm:h-[190px] pointer-events-none select-none z-0"
        >
          <path
            d="M70 0C50 40 25 65 5 95C-8 115 15 145 55 155C100 166 175 160 240 125V0H70Z"
            fill="#E4F1FE"
          />
        </svg>

        {/* Crisp Decorative Wave in Bottom matching Reference Image */}
        <svg
          viewBox="0 0 430 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 right-0 w-full h-[180px] sm:h-[220px] pointer-events-none select-none z-0"
        >
          <path
            d="M0 160C60 120 140 170 230 140C310 115 370 150 430 130V260H0V160Z"
            fill="#EDF6FF"
            fillOpacity="0.8"
          />
          <path
            d="M0 110C55 160 130 230 200 240C290 252 350 200 430 190V260H0V110Z"
            fill="#E1F0FD"
          />
        </svg>

        <div className="relative z-10">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-[#071A4B] hover:bg-[#F3F8FF] active:scale-95 transition-all cursor-pointer mb-6"
            aria-label="Back"
          >
            <ArrowLeft size={24} className="text-[#071A4B]" strokeWidth={2.4} />
          </button>

          {/* Heading & Subtitle */}
          <div className="mb-8">
            <h1 className="text-[28px] font-extrabold text-[#071A4B] tracking-tight leading-tight">
              Join with <span className="text-[#0866F5]">Invite Code</span>
            </h1>
            <p className="text-[14px] leading-[22px] text-[#727D98] mt-1.5">
              Enter the 6-character code given by your flat admin to join their group.
            </p>
          </div>

          {/* Global Error Banner */}
          {errorMessage && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-2.5 mb-5 text-[13px] font-medium text-[#DC2626]">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleJoin} className="space-y-6">
            {/* Invite Code Input */}
            <div>
              <label className="block text-[13.5px] font-bold text-[#071A4B] mb-2.5">
                Invite Code
              </label>
              <div className="relative flex items-center h-[54px] rounded-2xl border border-[#DCEBFA] focus-within:border-[#0866F5] focus-within:ring-4 focus-within:ring-blue-100 bg-white transition-all overflow-hidden px-4">
                <Users size={20} className="text-[#94A3B8] shrink-0" strokeWidth={2} />
                <div className="h-5 w-px bg-[#E2E8F0] ml-3 mr-3.5 shrink-0" />
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase());
                    if (localError) setLocalError("");
                  }}
                  maxLength={10}
                  placeholder="E.g. 7X9K2A"
                  autoFocus
                  style={{ textTransform: "uppercase" }}
                  className="w-full h-full bg-transparent text-[15px] font-bold text-[#071A4B] placeholder:text-[#94A3B8] placeholder:font-medium tracking-wider focus:outline-none uppercase"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={joinFlatMutation.isPending}
                className="w-full h-[54px] bg-[#0866F5] hover:bg-[#0875F9] active:scale-[0.98] text-white font-semibold text-[16px] rounded-2xl shadow-[0_8px_20px_rgba(8,102,245,0.32)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-75"
              >
                {joinFlatMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Joining Flat...</span>
                  </>
                ) : (
                  <span>Join Flat</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Bottom spacer to align with reference layout */}
        <div className="h-4" />
      </div>
    </main>
  );
}
