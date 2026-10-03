"use client";

import React from "react";
import { QuickPickPreset } from "@/hooks/useQuickPicks";
import { renderPresetIcon } from "../CreateKaamModal";
import { Zap } from "lucide-react";

interface QuickPickRowProps {
  presets: QuickPickPreset[];
  selectedQuickPickId: string | null;
  onSelectQuickPick: (item: QuickPickPreset) => void;
}

export const QuickPickRow: React.FC<QuickPickRowProps> = React.memo(({
  presets,
  selectedQuickPickId,
  onSelectQuickPick,
}) => {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1 mb-2">
        <Zap size={14} className="text-navy" />
        <span className="text-[12px] font-semibold text-deepNavy uppercase tracking-wider">
          QUICK PICK
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {presets.map((item) => {
          const isSelected = selectedQuickPickId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectQuickPick(item)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-[10px] border whitespace-nowrap text-[13px] leading-[18px] font-medium transition-all cursor-pointer ${
                isSelected
                  ? "bg-navy border-navy text-white shadow-xs"
                  : "bg-offWhite border-border text-navy hover:bg-border/60"
              }`}
            >
              {renderPresetIcon(
                item.icon,
                15,
                isSelected ? "text-white" : "text-navy"
              )}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

QuickPickRow.displayName = "QuickPickRow";
