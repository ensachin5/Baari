"use client";

import React from "react";
import { Clock } from "lucide-react";

interface DueDatePickerProps {
  dueOffsetDays: number;
  onSelectDueOffsetDays: (offset: number) => void;
  formatDateDisplay: (offsetDays: number) => { label: string; sub: string; isToday: boolean };
}

export const DueDatePicker: React.FC<DueDatePickerProps> = React.memo(({
  dueOffsetDays,
  onSelectDueOffsetDays,
  formatDateDisplay,
}) => {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Clock size={14} className="text-navy" />
        <span className="text-[12px] font-semibold text-deepNavy uppercase tracking-wider">
          FIRST OCCURRENCE DUE DATE
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((offset) => {
          const info = formatDateDisplay(offset);
          const isSelected = dueOffsetDays === offset;
          const isDueToday = info.isToday;

          return (
            <button
              key={offset}
              type="button"
              onClick={() => onSelectDueOffsetDays(offset)}
              className={`p-3 rounded-[10px] border text-left transition-all cursor-pointer ${
                isSelected
                  ? isDueToday
                    ? "bg-[#FEF3C7] border-[#F59E0B]"
                    : "bg-paleSky/70 border-navy"
                  : "bg-offWhite border-border hover:bg-border/60"
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className={`text-[13px] font-semibold ${
                    isSelected
                      ? isDueToday
                        ? "text-[#92400E]"
                        : "text-navy"
                      : "text-deepNavy"
                  }`}
                >
                  {info.label}
                </span>
                {isDueToday && isSelected && (
                  <span className="bg-[#D97706] text-white font-bold text-[8px] uppercase px-1 py-0.5 rounded">
                    Due soon
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] block ${
                  isSelected
                    ? isDueToday
                      ? "text-[#B45309]"
                      : "text-navy"
                    : "text-mutedNavy"
                }`}
              >
                {info.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

DueDatePicker.displayName = "DueDatePicker";
