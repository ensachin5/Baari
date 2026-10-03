"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { CheckCircle2, Flame, HandCoins } from "lucide-react";

interface ProfileStatsSectionProps {
  stats: {
    kaamCompletedThisMonth: number;
    currentStreak: number;
    longestStreak: number;
    settlementsCountThisMonth: number;
    amountSettledThisMonth: number;
  };
}

export const ProfileStatsSection: React.FC<ProfileStatsSectionProps> = React.memo(({ stats }) => {
  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      <Card variant="outlined" className="p-3 flex flex-col items-start">
        <div className="w-7 h-7 rounded-[8px] bg-[#ECFDF5] flex items-center justify-center mb-1.5">
          <CheckCircle2 size={16} className="text-[#059669]" strokeWidth={2.2} />
        </div>
        <span className="text-[16px] font-bold text-black">{stats.kaamCompletedThisMonth}</span>
        <span className="text-[11px] font-semibold text-navy mt-0.5">Kaam Done</span>
        <span className="text-[9px] text-grayBlack">this month</span>
      </Card>

      <Card variant="outlined" className="p-3 flex flex-col items-start">
        <div className="w-7 h-7 rounded-[8px] bg-[#FFFBEB] flex items-center justify-center mb-1.5">
          <Flame size={16} className="text-[#D97706] fill-[#FDE68A]" strokeWidth={2} />
        </div>
        <span className="text-[16px] font-bold text-black">{stats.currentStreak}d</span>
        <span className="text-[11px] font-semibold text-navy mt-0.5">On-Time Streak</span>
        <span className="text-[9px] text-grayBlack">best: {stats.longestStreak}d</span>
      </Card>

      <Card variant="outlined" className="p-3 flex flex-col items-start">
        <div className="w-7 h-7 rounded-[8px] bg-[#EFF6FF] flex items-center justify-center mb-1.5">
          <HandCoins size={16} className="text-[#2563EB]" strokeWidth={2.2} />
        </div>
        <span className="text-[16px] font-bold text-black">₹{stats.amountSettledThisMonth.toFixed(0)}</span>
        <span className="text-[11px] font-semibold text-navy mt-0.5">Settled</span>
        <span className="text-[9px] text-grayBlack">{stats.settlementsCountThisMonth} payments</span>
      </Card>
    </div>
  );
});

ProfileStatsSection.displayName = "ProfileStatsSection";
