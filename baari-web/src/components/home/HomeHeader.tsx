"use client";

import React from "react";
import { CheckSquare2, MessageCircle } from "lucide-react";

interface HomeHeaderProps {
  activeFlat: {
    name: string;
  } | null;
  memberCountText: string;
  activeTab: 0 | 1;
  onSelectTab: (tab: 0 | 1) => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = React.memo(({
  activeFlat,
  memberCountText,
  activeTab,
  onSelectTab,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] border-b border-border sticky top-0 z-10">
      <div className="flex-1 mr-2 min-w-0">
        <span className="text-[11px] font-bold text-navy uppercase tracking-wider block">
          Baari
        </span>
        {activeFlat?.name ? (
          <div className="flex items-center gap-1 mt-0.5 min-w-0">
            <h1 className="text-[22px] font-semibold text-deepNavy truncate">
              {activeFlat.name}
            </h1>
            <span className="text-[12px] text-mutedNavy whitespace-nowrap">
              · {memberCountText}
            </span>
          </div>
        ) : (
          <div className="h-[22px] w-[120px] bg-border rounded mt-0.5 animate-pulse" />
        )}
      </div>

      {/* 2-Page Indicator Switcher */}
      <div className="flex bg-offWhite rounded-full p-[3px] border border-border">
        <button
          type="button"
          onClick={() => onSelectTab(0)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
            activeTab === 0
              ? "bg-navy text-white shadow-xs"
              : "text-mutedNavy hover:text-navy"
          }`}
        >
          <CheckSquare2 size={13} strokeWidth={2.2} />
          <span>Kaam</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab(1)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
            activeTab === 1
              ? "bg-navy text-white shadow-xs"
              : "text-mutedNavy hover:text-navy"
          }`}
        >
          <MessageCircle size={13} strokeWidth={2.2} />
          <span>Chat</span>
        </button>
      </div>
    </div>
  );
});

HomeHeader.displayName = "HomeHeader";
