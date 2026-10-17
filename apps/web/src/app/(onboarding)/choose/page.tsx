"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSession } from "@/store/session";
import { ArrowRight, Users } from "lucide-react";
import { HomeIcon } from "@/components/ui/HomeIcon";

export default function ChooseFlatPage() {
  const router = useRouter();
  const user = useSession((state) => state.user);

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#F3F8FF] sm:p-6 p-0 relative selection:bg-blue-100 overflow-x-hidden">
      {/* Ambient soft blue background accents for desktop */}
      <div className="fixed -top-32 -left-32 w-96 h-96 bg-[#E1EFFF] rounded-full blur-3xl pointer-events-none opacity-60" />
      <div className="fixed -bottom-32 -right-32 w-96 h-96 bg-[#E8F4FF] rounded-full blur-3xl pointer-events-none opacity-60" />

      {/* Main Mobile Screen Container */}
      <div className="relative w-full sm:max-w-[430px] min-h-screen sm:min-h-0 sm:my-auto bg-white border-0 sm:border sm:border-[#DCEBFA] sm:rounded-[36px] sm:shadow-[0_20px_50px_rgba(7,26,75,0.08)] flex flex-col justify-between overflow-hidden">
        
        {/* Top: 4 Flatmates + Cat Household Artwork */}
        <div className="relative w-full aspect-[492/580] bg-[#F0F6FE] shrink-0">
          <Image
            src="/onboarding-welcome-hero.png"
            alt="Welcome to Baari"
            fill
            priority
            sizes="(max-width: 640px) 100vw, 430px"
            className="object-cover object-top select-none pointer-events-none"
          />
        </div>

        {/* Bottom Content: Welcome Heading, Subtitle & 2 Option Cards */}
        <div className="flex-1 flex flex-col justify-between px-5 sm:px-6 pt-3 pb-8 bg-white gap-5">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-[26px] sm:text-[28px] font-extrabold text-[#071A4B] tracking-tight leading-tight">
              Welcome, <span className="text-[#0866F5]">Flatmate!</span> 👋
            </h1>
            <p className="text-[13.5px] leading-[20px] text-[#727D98] mt-1.5 max-w-[310px] mx-auto">
              To get started, set up your living space or join your flatmates using an invite code.
            </p>
          </div>

          {/* Action Cards Container */}
          <div className="flex flex-col gap-3.5 w-full">
            {/* Option 1: Create a new Place */}
            <button
              type="button"
              onClick={() => router.push("/create-flat")}
              className="w-full p-4 rounded-2xl bg-white border border-[#DCEBFA] hover:border-[#0866F5] hover:shadow-[0_4px_16px_rgba(8,102,245,0.08)] active:scale-[0.99] transition-all cursor-pointer flex items-center gap-3.5 text-left group"
            >
              <div className="w-12 h-12 rounded-[14px] bg-[#E8F4FF] flex items-center justify-center text-[#0866F5] shrink-0 group-hover:scale-105 transition-transform">
                <HomeIcon size={24} className="text-[#0866F5]" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <h2 className="text-[16px] font-bold text-[#071A4B] leading-snug">
                  Create a new Place
                </h2>
                <p className="text-[12.5px] text-[#727D98] leading-tight mt-0.5">
                  Start a Flat, PG, or Hostel group and invite your flatmates
                </p>
              </div>
              <ArrowRight size={20} className="text-[#071A4B] group-hover:text-[#0866F5] group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>

            {/* Option 2: Join an existing Place */}
            <button
              type="button"
              onClick={() => router.push("/join-flat")}
              className="w-full p-4 rounded-2xl bg-white border border-[#DCEBFA] hover:border-[#0866F5] hover:shadow-[0_4px_16px_rgba(8,102,245,0.08)] active:scale-[0.99] transition-all cursor-pointer flex items-center gap-3.5 text-left group"
            >
              <div className="w-12 h-12 rounded-[14px] bg-[#E8F4FF] flex items-center justify-center text-[#0866F5] shrink-0 group-hover:scale-105 transition-transform">
                <Users size={24} className="text-[#0866F5]" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <h2 className="text-[16px] font-bold text-[#071A4B] leading-snug">
                  Join an existing Place
                </h2>
                <p className="text-[12.5px] text-[#727D98] leading-tight mt-0.5">
                  Enter the 6-character invite code shared by your flatmate
                </p>
              </div>
              <ArrowRight size={20} className="text-[#071A4B] group-hover:text-[#0866F5] group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          </div>
        </div>

        {/* Soft Decorative Corner Waves in Bottom matching Reference Image */}
        <svg
          viewBox="0 0 430 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 right-0 w-full h-[90px] pointer-events-none select-none z-0"
        >
          <path
            d="M0 60C50 70 80 100 110 120H0V60Z"
            fill="#E1F0FD"
          />
          <path
            d="M430 40C370 65 330 95 300 120H430V40Z"
            fill="#E4F1FE"
          />
        </svg>
      </div>
    </main>
  );
}
