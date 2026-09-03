"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthSession } from "@/lib/auth-client";
import { useSession } from "@/store/session";
import { useSocket } from "@/lib/socket";
import { Avatar } from "@/components/ui/Avatar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useAuthSession();
  const { user, activeFlat, isHydrated, hydrate } = useSession();

  // Initialize socket lifecycle
  useSocket();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!sessionLoading && !session?.user && isHydrated && !user) {
      router.replace("/sign-in");
    }
  }, [session, sessionLoading, user, isHydrated, router]);

  const navTabs = [
    {
      name: "Home",
      href: "/home",
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? "text-navy stroke-[2.5]" : "text-black-light"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: "Expense",
      href: "/expense",
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? "text-navy stroke-[2.5]" : "text-black-light"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "Activity",
      href: "/activity",
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? "text-navy stroke-[2.5]" : "text-black-light"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      name: "Profile",
      href: "/profile",
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? "text-navy stroke-[2.5]" : "text-black-light"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col pb-20 md:pb-0">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E5E9F0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-navy text-white flex items-center justify-center font-bold text-lg select-none shadow-xs">
              B
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-navy text-[22px] tracking-tight">
                {activeFlat?.name || "Baari"}
              </span>
              {activeFlat?.inviteCode && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-paleSky text-deepNavy text-xs font-mono font-semibold">
                  #{activeFlat.inviteCode}
                </span>
              )}
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navTabs.map((tab) => {
              const isActive = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-body-small font-medium transition-all ${
                    isActive
                      ? "bg-sky-light/80 text-navy font-semibold"
                      : "text-black-light hover:bg-white-off hover:text-black"
                  }`}
                >
                  {tab.icon(isActive)}
                  <span>{tab.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User profile avatar */}
          <Link href="/profile" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Avatar
              src={user?.image || session?.user?.image}
              name={user?.name || session?.user?.name || "User"}
              size="sm"
            />
          </Link>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#E5E9F0] h-16 flex items-center justify-around px-2 shadow-lg">
        {navTabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 ${
                isActive ? "text-navy" : "text-black-light"
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
