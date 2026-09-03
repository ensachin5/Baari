"use client";

import React from "react";

interface SegmentedControlProps {
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
  className?: string;
}

/**
 * Mirrors baari-app/components/ui/SegmentedControl.tsx exactly.
 */
export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selected,
  onSelect,
  className = "",
}) => {
  return (
    <div
      className={`flex bg-offWhite rounded-[10px] p-[3px] border border-border ${className}`}
    >
      {options.map((option) => {
        const isSelected = selected === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`flex-1 py-2 flex items-center justify-center rounded-[6px] transition-all text-[12px] leading-[16px] select-none cursor-pointer ${
              isSelected
                ? "bg-navy text-white font-bold shadow-[0_1px_2px_rgba(6,23,41,0.15)]"
                : "text-grayBlack font-semibold hover:text-navy"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
