"use client";

import { useEffect } from "react";
import Image from "next/image";
import { AlertTriangle, RotateCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error caught]:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="flex flex-col items-center max-w-sm w-full">
        <Image
          src="/baari-logo.png"
          alt="Baari Logo"
          width={64}
          height={64}
          className="mb-4 object-contain"
          priority
        />

        <div className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center text-[#DC2626] mb-3 border border-[#FECACA]">
          <AlertTriangle size={24} />
        </div>

        <h2 className="text-[20px] leading-[26px] font-bold text-black mb-1">
          Something went wrong
        </h2>
        <p className="text-[13px] leading-[18px] text-grayBlack text-center mb-6 max-w-xs">
          An unexpected error occurred while loading this page. Please try reloading.
        </p>

        <div className="w-full flex flex-col gap-2.5 max-w-xs">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[10px] bg-navy text-white text-[14px] font-semibold hover:bg-deepNavy transition-colors cursor-pointer"
          >
            <RotateCw size={16} />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[10px] border border-border text-mutedNavy text-[14px] font-semibold hover:bg-offWhite transition-colors"
          >
            <Home size={16} />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
