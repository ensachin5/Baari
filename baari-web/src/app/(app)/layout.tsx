"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthSession } from "@/lib/auth-client";
import { useSession } from "@/store/session";
import { useSocket } from "@/lib/socket";
import { Avatar } from "@/components/ui/Avatar";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import {
  House,
  Wallet,
  Activity,
  User,
  Copy,
  Check,
} from "lucide-react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useAuthSession();
  const { user, activeFlat, isHydrated, hydrate } = useSession();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Initialize socket lifecycle
  useSocket();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Hide bottom nav bar automatically when mobile virtual keyboard appears
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkViewport = () => {
      if (window.visualViewport) {
        // If viewport height dropped by more than 120px, keyboard is open
        const isKeyboard = window.visualViewport.height < window.innerHeight - 120;
        setIsKeyboardVisible(isKeyboard);
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
        window.innerWidth < 1024
      ) {
        setIsKeyboardVisible(true);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement as HTMLElement | null;
        if (
          !active ||
          (active.tagName !== "INPUT" && active.tagName !== "TEXTAREA")
        ) {
          setIsKeyboardVisible(false);
        }
      }, 100);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", checkViewport);
      window.visualViewport.addEventListener("scroll", checkViewport);
    }
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", checkViewport);
        window.visualViewport.removeEventListener("scroll", checkViewport);
      }
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  useEffect(() => {
    if (session?.session?.token) {
      useSession.getState().setToken(session.session.token);
    }
    if (!sessionLoading && !session?.user && isHydrated && !user) {
      router.replace("/sign-in");
    }
  }, [session, sessionLoading, user, isHydrated, router]);

  const handleCopyInvite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeFlat?.inviteCode) {
      navigator.clipboard.writeText(activeFlat.inviteCode);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  const navTabs = [
    {
      name: "Home",
      href: "/home",
      icon: (active: boolean) => (
        <House
          size={18}
          className={active ? "text-navy stroke-[2.5]" : "text-mutedNavy"}
        />
      ),
    },
    {
      name: "Expense",
      href: "/expense",
      icon: (active: boolean) => (
        <Wallet
          size={18}
          className={active ? "text-navy stroke-[2.5]" : "text-mutedNavy"}
        />
      ),
    },
    {
      name: "Activity",
      href: "/activity",
      icon: (active: boolean) => (
        <Activity
          size={18}
          className={active ? "text-navy stroke-[2.5]" : "text-mutedNavy"}
        />
      ),
    },
    {
      name: "Profile",
      href: "/profile",
      icon: (active: boolean) => (
        <User
          size={18}
          className={active ? "text-navy stroke-[2.5]" : "text-mutedNavy"}
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col lg:flex-row">
      {/* Global Offline Banner */}
      <OfflineBanner />

      {/* ────────────────────────────────────────────────────────────────────────
          DESKTOP LEFT SIDEBAR (Visible only on lg: breakpoint and above)
      ────────────────────────────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-white border-r border-[#E5E9F0] flex-shrink-0 z-30 select-none">
        {/* Flat Brand Header */}
        <div className="p-5 border-b border-[#E5E9F0]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-navy text-white flex items-center justify-center font-bold text-lg shadow-xs flex-shrink-0">
              B
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-mutedNavy tracking-wider uppercase leading-tight">
                BAARI
              </p>
              <h2 className="font-bold text-navy text-[16px] leading-tight truncate">
                {activeFlat?.name || "My Flat"}
              </h2>
            </div>
          </div>

          {/* Invite Code Pill with Copy Action */}
          {activeFlat?.inviteCode && (
            <div className="mt-3 flex items-center justify-between bg-offWhite px-2.5 py-1.5 rounded-lg border border-border">
              <span className="text-xs text-mutedNavy font-medium">Invite Code:</span>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-border text-xs font-mono font-bold text-navy hover:bg-paleSky transition-colors cursor-pointer"
                title="Copy invite code"
              >
                <span>#{activeFlat.inviteCode}</span>
                {copiedInvite ? (
                  <Check size={11} className="text-[#16A34A]" />
                ) : (
                  <Copy size={11} className="text-mutedNavy" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navTabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] leading-[20px] transition-all ${
                  isActive
                    ? "bg-sky-light text-navy font-semibold shadow-2xs"
                    : "text-grayBlack hover:bg-offWhite hover:text-black font-medium"
                }`}
              >
                {tab.icon(isActive)}
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-[#E5E9F0]">
          <Link
            href="/profile"
            className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
              pathname.startsWith("/profile")
                ? "bg-sky-light/60"
                : "hover:bg-offWhite"
            }`}
          >
            <Avatar
              src={user?.image || session?.user?.image}
              name={user?.name || session?.user?.name || "User"}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-navy truncate leading-tight">
                {user?.name || session?.user?.name || "User"}
              </p>
              <p className="text-[11px] text-grayBlack truncate leading-tight mt-0.5">
                {user?.email || session?.user?.email || "Flatmate"}
              </p>
            </div>
          </Link>
        </div>
      </aside>

      {/* ────────────────────────────────────────────────────────────────────────
          MAIN PAGE CONTENT
      ────────────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-0 w-full min-w-0">
        {children}
      </main>

      {/* ────────────────────────────────────────────────────────────────────────
          MOBILE BOTTOM TAB BAR (Visible only below lg: breakpoint)
      ────────────────────────────────────────────────────────────────────────── */}
      <nav
        className={`mobile-bottom-nav lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#E5E9F0] h-16 flex items-center justify-around px-2 shadow-lg transition-all duration-150 ${
          isKeyboardVisible
            ? "hidden pointer-events-none -translate-y-full opacity-0"
            : "flex"
        }`}
      >
        {navTabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 ${
                isActive ? "text-navy" : "text-grayBlack"
              }`}
            >
              {tab.icon(isActive)}
              <span
                className={`text-[11px] mt-1 ${
                  isActive ? "font-semibold text-navy" : "font-normal"
                }`}
              >
                {tab.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
