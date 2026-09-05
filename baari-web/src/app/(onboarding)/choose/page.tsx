"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { useSession } from "@/store/session";
import { House, Users, ArrowRight } from "lucide-react";

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
          className="p-4 cursor-pointer"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-[10px] bg-navy flex items-center justify-center mr-3 flex-shrink-0">
              <House size={24} className="text-white" strokeWidth={2} />
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
            <ArrowRight size={20} className="text-navy flex-shrink-0" />
          </div>
        </Card>

        {/* Option 2: Join with Code (variant="outlined") */}
        <Card
          onClick={() => router.push("/join-flat")}
          variant="outlined"
          className="p-4 cursor-pointer"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-[10px] bg-paleSky flex items-center justify-center mr-3 flex-shrink-0">
              <Users size={24} className="text-deepNavy" strokeWidth={2} />
            </div>
            <div className="flex-1 mr-2">
              <h2 className="text-[18px] leading-[24px] font-semibold text-black">
                Join an existing Flat
              </h2>
              <p className="text-[14px] leading-[20px] text-grayBlack mt-[2px]">
                Enter the 6-character invite code shared by your flatmate
              </p>
            </div>
            <ArrowRight size={20} className="text-navy flex-shrink-0" />
          </div>
        </Card>
      </div>
    </div>
  );
}
