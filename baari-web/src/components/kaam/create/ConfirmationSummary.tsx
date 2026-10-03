"use client";

import React from "react";
import { Info } from "lucide-react";

interface ConfirmationSummaryProps {
  title: string;
  category: string;
  assignmentMode: string;
  assigneesCount: number;
  recurrence: string;
  dueDateLabel: string;
}

export const ConfirmationSummary: React.FC<ConfirmationSummaryProps> = React.memo(({
  title,
  category,
  assignmentMode,
  assigneesCount,
  recurrence,
  dueDateLabel,
}) => {
  if (!title.trim()) return null;

  return (
    <div className="mb-4 p-3 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0]">
      <div className="flex items-center gap-1.5 mb-1">
        <Info size={14} className="text-navy" />
        <span className="text-[10px] font-bold tracking-wider text-deepNavy uppercase">
          KAAM SUMMARY
        </span>
      </div>
      <p className="text-[11px] text-mutedNavy leading-relaxed">
        <span className="font-semibold text-deepNavy">{title}</span> ({category}) •{" "}
        {assignmentMode === "auto_rotate"
          ? "Auto-rotate across all"
          : `Custom rotation (${assigneesCount} member${assigneesCount > 1 ? "s" : ""})`}{" "}
        • Recurrence: <span className="font-semibold text-deepNavy">{recurrence}</span> • First due:{" "}
        <span className="font-semibold text-deepNavy">{dueDateLabel}</span>
      </p>
    </div>
  );
});

ConfirmationSummary.displayName = "ConfirmationSummary";
