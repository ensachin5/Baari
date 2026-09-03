"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";

interface FlatResponse {
  flat: {
    id: string;
    name: string;
    inviteCode: string;
    role: "admin" | "member";
    memberCount: number;
  };
}

/**
 * Mirrors baari-app/app/(onboarding)/create-flat.tsx exactly.
 *
 * Layout from RN:
 *   container: flex: 1, bg white, paddingHorizontal: Spacing.xl (20px), paddingTop: 48px (32+16)
 *   backButton: marginBottom: Spacing.xl (20px), alignSelf: flex-start
 *   header: marginBottom: Spacing.xl (20px)
 *   title: Typography.H1 (22px, 600, color #1A1A1A)
 *   subtitle: Typography.BodySmall (14px, color #5C5F66, marginTop: 4px, lineHeight: 20px)
 *   Input: label="Flat / Home Name", placeholder="e.g., Flat 402", autoFocus
 *   submitBtn: marginTop: Spacing.md (12px)
 *   Button: title="Create & Generate Invite Code"
 */
export default function CreateFlatPage() {
  const router = useRouter();
  const setActiveFlat = useSession((state) => state.setActiveFlat);

  const [name, setName] = useState("");
  const [localError, setLocalError] = useState("");

  const createFlatMutation = useMutation({
    mutationFn: (flatName: string) =>
      api.post<FlatResponse>("/api/flats", { name: flatName }),
    onSuccess: (res) => {
      if (res?.flat) {
        setActiveFlat({
          id: res.flat.id,
          name: res.flat.name,
          inviteCode: res.flat.inviteCode,
          role: "admin",
        });
        router.replace("/home");
      }
    },
    onError: (err: Error) => {
      setLocalError(err.message || "Failed to create flat");
    },
  });

  const handleCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setLocalError("Please enter a name for your flat or home");
      return;
    }
    setLocalError("");
    createFlatMutation.mutate(name.trim());
  };

  const errorMessage =
    localError ||
    (createFlatMutation.isError
      ? (createFlatMutation.error as Error)?.message || "Failed to create flat"
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
            Name your Flat
          </h1>
          <p className="text-[14px] leading-[20px] text-grayBlack mt-1">
            Give your place a recognizable name e.g., &quot;Flat 402&quot;,
            &quot;Sunshine Residency&quot;, or &quot;The Boys PG&quot;
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleCreate}>
          <Input
            label="Flat / Home Name"
            placeholder="e.g., Flat 402"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (localError) setLocalError("");
            }}
            error={errorMessage}
            autoFocus
          />

          {/* Submit button — marginTop: Spacing.md = 12px */}
          <div className="mt-3">
            <Button
              type="submit"
              title="Create & Generate Invite Code"
              loading={createFlatMutation.isPending}
              className="w-full"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
