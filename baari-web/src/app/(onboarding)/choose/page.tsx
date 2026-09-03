"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { useSession } from "@/store/session";

/**
 * Mirrors baari-app/app/(onboarding)/choose.tsx exactly.
 *
 * Layout from RN:
 *   container: flex: 1, bg white, paddingHorizontal: Spacing.xl (20px), justifyContent: 'center'
 *   header: marginBottom: Spacing.xxl (24px)
 *   title: Typography.H1 (22px, 600, color #1A1A1A)
 *   subtitle: Typography.BodySmall (14px, color #5C5F66, marginTop: 4px, lineHeight: 22px)
 *   optionsContainer: gap: Spacing.lg (16px)
 *   optionCard: padding: Spacing.lg (16px)
 *   iconBadge: 48x48, borderRadius: 10px, marginRight: 12px
 *   optionTextCol: flex: 1, marginRight: 8px
 *   optionTitle: Typography.H2 (18px, 600, color #1A1A1A)
 *   optionDesc: Typography.BodySmall (14px, color #5C5F66, marginTop: 2px)
 *   arrow: size 20, color navy (#0A2540)
 */
export default function ChooseFlatPage() {
  const router = useRouter();
  const user = useSession((state) => state.user);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center px-5 max-w-lg mx-auto w-full">
      {/* Header — marginBottom: Spacing.xxl = 24px */}
      <div className="mb-6">
        <h1 className="text-[22px] leading-[28px] font-semibold text-black">
          Welcome, {user?.name || "Flatmate"}! 👋
        </h1>
        <p className="text-[14px] leading-[22px] text-grayBlack mt-1">
          To get started, set up your flat group or join your flatmates using an
          invite code.
        </p>
      </div>

      {/* Options Container — gap: Spacing.lg = 16px */}
      <div className="flex flex-col gap-4">
        {/* Option 1: Create a Flat (variant="elevated") */}
        <Card
          onClick={() => router.push("/create-flat")}
          variant="elevated"
          className="p-4"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-[10px] bg-navy flex items-center justify-center mr-3 flex-shrink-0">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="flex-1 mr-2">
              <h2 className="text-[18px] leading-[24px] font-semibold text-black">
                Create a new Flat
              </h2>
              <p className="text-[14px] leading-[20px] text-grayBlack mt-[2px]">
                Start a flat group as an admin and invite your flatmates with a
                code
              </p>
            </div>
            <svg
              className="w-5 h-5 text-navy flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </div>
        </Card>

        {/* Option 2: Join with Code (variant="outlined") */}
        <Card
          onClick={() => router.push("/join-flat")}
          variant="outlined"
          className="p-4"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-[10px] bg-paleSky flex items-center justify-center mr-3 flex-shrink-0">
              <svg
                className="w-6 h-6 text-deepNavy"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div className="flex-1 mr-2">
              <h2 className="text-[18px] leading-[24px] font-semibold text-black">
                Join an existing Flat
              </h2>
              <p className="text-[14px] leading-[20px] text-grayBlack mt-[2px]">
                Enter the 6-character invite code shared by your flatmate
              </p>
            </div>
            <svg
              className="w-5 h-5 text-navy flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </div>
        </Card>
      </div>
    </div>
  );
}
