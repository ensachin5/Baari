import React from "react";
import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="flex flex-col items-center max-w-sm">
        {/* Brand Icon Badge */}
        <div className="w-18 h-18 rounded-[16px] bg-paleSky text-navy flex items-center justify-center mb-6 shadow-xs">
          <Compass size={40} className="text-navy" strokeWidth={2} />
        </div>

        {/* Heading */}
        <h1 className="text-[24px] leading-[30px] font-bold text-black mb-2">
          This page doesn&apos;t exist
        </h1>

        {/* Subtitle */}
        <p className="text-[14px] leading-[20px] text-grayBlack mb-8 max-w-[280px]">
          The link you followed may be broken or the screen may have moved.
        </p>

        {/* Return Home Button */}
        <Link
          href="/"
          className="inline-flex items-center justify-center w-full max-w-[240px] bg-navy text-white hover:bg-deepNavy active:bg-deepNavy py-3.5 px-6 rounded-[10px] font-medium text-[16px] transition-all shadow-xs select-none"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}
