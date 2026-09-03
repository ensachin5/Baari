"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";

interface JoinFlatResponse {
  flat: {
    id: string;
    name: string;
    inviteCode: string;
    role: "admin" | "member";
    memberCount: number;
  };
  message?: string;
}

/**
 * Mirrors baari-app/app/(onboarding)/join-flat.tsx exactly.
 *
 * Layout from RN:
 *   container: flex: 1, bg white, paddingHorizontal: Spacing.xl (20px), paddingTop: 48px (32+16)
 *   backButton: marginBottom: Spacing.xl (20px), alignSelf: flex-start
 *   header: marginBottom: Spacing.xl (20px)
 *   title: Typography.H1 (22px, 600, color #1A1A1A)
 *   subtitle: Typography.BodySmall (14px, color #5C5F66, marginTop: 4px, lineHeight: 20px)
 *   Input: label="Invite Code", placeholder="e.g. 7X9K2A", autoCapitalize="characters", maxLength=10, autoFocus
 *   submitBtn: marginTop: Spacing.md (12px)
 *   Button: title="Join Flat"
 */
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
    <div className="min-h-screen bg-white px-5 pt-12 max-w-lg mx-auto w-full flex flex-col">
      {/* Back button — marginBottom: Spacing.xl = 20px */}
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-5 self-start cursor-pointer text-navy hover:opacity-75 transition-opacity"
        aria-label="Back"
      >
        <svg
          className="w-6 h-6 text-navy"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
      </button>

      {/* Content */}
      <div className="flex-1">
        {/* Header — marginBottom: Spacing.xl = 20px */}
        <div className="mb-5">
          <h1 className="text-[22px] leading-[28px] font-semibold text-black">
            Join with Invite Code
          </h1>
          <p className="text-[14px] leading-[20px] text-grayBlack mt-1">
            Enter the 6-character code given by your flat admin to join their
            group
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleJoin}>
          <Input
            label="Invite Code"
            placeholder="e.g. 7X9K2A"
            value={inviteCode}
            onChange={(e) => {
              setInviteCode(e.target.value.toUpperCase());
              if (localError) setLocalError("");
            }}
            maxLength={10}
            error={errorMessage}
            autoFocus
            style={{ textTransform: "uppercase" }}
          />

          {/* Submit button — marginTop: Spacing.md = 12px */}
          <div className="mt-3">
            <Button
              type="submit"
              title="Join Flat"
              loading={joinFlatMutation.isPending}
              className="w-full"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
