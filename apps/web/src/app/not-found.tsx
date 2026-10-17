"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Home,
  ArrowLeft,
  CheckSquare,
  Receipt,
  MessageSquare,
  Download,
  Sparkles,
  HelpCircle,
} from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white text-[#07194A] flex flex-col font-sans selection:bg-[#D4E8FF] selection:text-[#0866F5] relative overflow-hidden">
      {/* Soft Background Radial Blurs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#EBF4FF] via-[#F4F9FF] to-transparent rounded-full blur-3xl -z-10 pointer-events-none opacity-80" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#E0EFFF]/60 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#DCEEF7]/50 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Top Simple Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0866F5] to-[#258BFF] flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform overflow-hidden">
            <Image
              src="/baari-icon.png"
              alt="Baari Icon"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[20px] font-black tracking-tight leading-none text-[#07194A]">
              Baari
            </span>
            <span className="text-[10.5px] font-medium text-[#77839F] tracking-wide mt-0.5">
              Har Kaam Ki Apni Baari
            </span>
          </div>
        </Link>

        <Link
          href="/"
          className="text-[13.5px] font-bold text-[#546282] hover:text-[#0866F5] transition-colors"
        >
          Back to Baari Home →
        </Link>
      </header>

      {/* Main 404 Hero Container */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="max-w-xl w-full text-center flex flex-col items-center">
          {/* Animated 404 Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EDF6FF] border border-[#CCE3FD] text-[13px] font-bold text-[#0866F5] mb-6 shadow-xs">
            <Sparkles size={14} className="text-[#0866F5] animate-pulse" />
            <span>Error 404 · Lagta Hai Iss Page Ki Baari Nahi Aayi</span>
          </div>

          {/* Large Stylized 404 Numeric Art */}
          <div className="relative mb-6 select-none">
            <span className="text-[96px] sm:text-[124px] font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#0866F5] via-[#2177FF] to-[#044BC4] drop-shadow-sm">
              404
            </span>
            <div className="absolute -top-3 -right-4 px-2.5 py-0.5 rounded-lg bg-[#07194A] text-white font-extrabold text-[11px] shadow-md rotate-12">
              Empty Room!
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#07194A] tracking-tight">
            Looks like you wandered into the wrong room.
          </h1>

          {/* Subtitle / Description */}
          <p className="mt-3 text-base text-[#546282] max-w-md leading-relaxed">
            The link you followed might be broken, or this screen has moved. Don&apos;t worry, your roommates and chores are waiting for you.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-white hover:bg-[#F5FAFF] border-2 border-[#DCEBFA] hover:border-[#0866F5] active:scale-95 text-[#07194A] font-bold text-[14.5px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft size={17} className="text-[#546282]" />
              <span>Go Back</span>
            </button>

            <Link
              href="/"
              className="w-full sm:w-auto h-12 px-7 rounded-2xl bg-[#0866F5] hover:bg-[#0757D1] active:scale-95 text-white font-bold text-[14.5px] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all select-none"
            >
              <Home size={17} />
              <span>Back to Home</span>
            </Link>
          </div>

          {/* Quick Helpful Navigation Card */}
          <div className="mt-12 w-full pt-8 border-t border-[#EDF2F9]">
            <p className="text-[12.5px] font-bold uppercase tracking-wider text-[#77839F] mb-4">
              Or jump directly to a flat section:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                href="/home"
                className="p-3.5 rounded-2xl bg-[#F8FAFD] hover:bg-[#EDF5FF] border border-[#E8EFF8] hover:border-[#BBDDFF] transition-all flex flex-col items-center gap-2 text-center group"
              >
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#0866F5] shadow-xs group-hover:scale-105 transition-transform">
                  <CheckSquare size={16} />
                </div>
                <span className="text-[12.5px] font-bold text-[#07194A]">Daily Kaam</span>
              </Link>

              <Link
                href="/expense"
                className="p-3.5 rounded-2xl bg-[#F8FAFD] hover:bg-[#EDF5FF] border border-[#E8EFF8] hover:border-[#BBDDFF] transition-all flex flex-col items-center gap-2 text-center group"
              >
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#10B981] shadow-xs group-hover:scale-105 transition-transform">
                  <Receipt size={16} />
                </div>
                <span className="text-[12.5px] font-bold text-[#07194A]">Expenses</span>
              </Link>

              <Link
                href="/home"
                className="p-3.5 rounded-2xl bg-[#F8FAFD] hover:bg-[#EDF5FF] border border-[#E8EFF8] hover:border-[#BBDDFF] transition-all flex flex-col items-center gap-2 text-center group"
              >
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#0866F5] shadow-xs group-hover:scale-105 transition-transform">
                  <MessageSquare size={16} />
                </div>
                <span className="text-[12.5px] font-bold text-[#07194A]">Flat Chat</span>
              </Link>

              <a
                href="https://expo.dev/artifacts/eas/7Gqyn0CAktWgIqO9PGcirnFs-33zaClCJNMtHjioyzA.apk"
                download="baari-app.apk"
                className="p-3.5 rounded-2xl bg-[#F8FAFD] hover:bg-[#EDF5FF] border border-[#E8EFF8] hover:border-[#BBDDFF] transition-all flex flex-col items-center gap-2 text-center group"
              >
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#0866F5] shadow-xs group-hover:scale-105 transition-transform">
                  <Download size={16} />
                </div>
                <span className="text-[12.5px] font-bold text-[#07194A]">Get Android APK</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="w-full py-6 text-center text-[12.5px] text-[#8895B3] border-t border-[#EDF2F9]">
        <span>© {new Date().getFullYear()} Baari · Har Kaam Ki Apni Baari.</span>
      </footer>
    </div>
  );
}
