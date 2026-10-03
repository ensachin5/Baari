"use client";

import React from "react";
import { Avatar } from "@/components/ui/Avatar";
import { FlatMember, AssignmentMode } from "../CreateKaamModal";
import { RotateCcw, SlidersHorizontal, User, Users, Check } from "lucide-react";

interface AssignToSelectorProps {
  assignmentMode: AssignmentMode;
  onSwitchAssignmentMode: (mode: AssignmentMode) => void;
  members: FlatMember[];
  selectedAssignees: string[];
  onMemberSelect: (userId: string) => void;
  groupSize: number;
  onGroupSizeChange: (size: number) => void;
  isSingleGroup: boolean;
  children?: React.ReactNode;
}

export const AssignToSelector: React.FC<AssignToSelectorProps> = React.memo(({
  assignmentMode,
  onSwitchAssignmentMode,
  members,
  selectedAssignees,
  onMemberSelect,
  groupSize,
  onGroupSizeChange,
  isSingleGroup,
  children,
}) => {
  return (
    <div className="mb-4">
      <span className="block text-[12px] font-semibold text-deepNavy uppercase tracking-wider mb-2">
        ASSIGN TO
      </span>

      {/* Mode Switcher */}
      <div className="flex bg-offWhite rounded-[10px] p-[3px] border border-border mb-3">
        <button
          type="button"
          onClick={() => onSwitchAssignmentMode("auto_rotate")}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-[6px] text-[12px] font-semibold transition-all cursor-pointer ${
            assignmentMode === "auto_rotate"
              ? "bg-navy text-white shadow-[0_1px_2px_rgba(6,23,41,0.15)]"
              : "text-mutedNavy hover:text-navy"
          }`}
        >
          <RotateCcw size={13} />
          <span>Auto-rotate</span>
        </button>

        <button
          type="button"
          onClick={() => onSwitchAssignmentMode("custom_rotation")}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-[6px] text-[12px] font-semibold transition-all cursor-pointer ${
            assignmentMode === "custom_rotation"
              ? "bg-navy text-white shadow-[0_1px_2px_rgba(6,23,41,0.15)]"
              : "text-mutedNavy hover:text-navy"
          }`}
        >
          <SlidersHorizontal size={13} />
          <span>Custom Rotation</span>
        </button>
      </div>

      {/* Mode 1: Auto-rotate Explanation Card */}
      {assignmentMode === "auto_rotate" && (
        <div className="flex items-center gap-3 p-3 rounded-[10px] bg-paleSky/50 border border-sky/30">
          <div className="w-9 h-9 rounded-full bg-paleSky flex items-center justify-center flex-shrink-0">
            <RotateCcw size={18} className="text-navy" strokeWidth={2.4} />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-navy leading-tight">
              Fair Round-Robin Rotation
            </p>
            <p className="text-[12px] text-mutedNavy leading-normal mt-0.5">
              Turns rotate automatically across all flatmates in equal order each time it&apos;s completed.
            </p>
          </div>
        </div>
      )}

      {/* Mode 2: Custom Rotation */}
      {assignmentMode === "custom_rotation" && (
        <div>
          <p className="text-[12px] text-grayBlack mb-2">
            Select flatmate(s) for this Kaam ({selectedAssignees.length} selected):
          </p>
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {members.map((m) => {
              const isSelected = selectedAssignees.includes(m.userId);
              const firstName = m.name ? m.name.split(" ")[0] : "Member";
              return (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() => onMemberSelect(m.userId)}
                  className={`flex flex-col items-center p-2 rounded-[10px] border transition-all cursor-pointer min-w-[70px] ${
                    isSelected
                      ? "bg-paleSky/70 border-navy"
                      : "bg-offWhite border-border"
                  }`}
                >
                  <div className="relative mb-1">
                    <Avatar name={m.name} image={m.image} size="md" />
                    {isSelected && (
                      <div className="absolute -bottom-1 -right-1 bg-deepNavy rounded-full w-4 h-4 flex items-center justify-center border border-white">
                        <Check size={10} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <span className="text-[12px] font-semibold text-black truncate max-w-[64px]">
                    {firstName}
                  </span>
                  <span className="text-[10px] text-grayBlack uppercase">
                    {m.role}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Case A: Exactly 1 Person Selected */}
          {selectedAssignees.length === 1 && (
            <div className="flex items-center gap-3 p-3 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] mt-3">
              <div className="w-9 h-9 rounded-full bg-paleSky flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-navy" strokeWidth={2.4} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-navy leading-tight">
                  This Kaam is assigned to {members.find((m) => m.userId === selectedAssignees[0])?.name || "Selected Member"}
                </p>
                <p className="text-[12px] text-mutedNavy leading-normal mt-0.5">
                  Assigned to this person on every occurrence (no rotation).
                </p>
              </div>
            </div>
          )}

          {/* Case B: Multiple People Selected */}
          {selectedAssignees.length > 1 && (
            <div className="mt-3">
              <p className="text-[11px] font-bold tracking-wider text-grayBlack uppercase mb-1.5">
                GROUP SIZE PER TURN
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => onGroupSizeChange(1)}
                  className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all cursor-pointer ${
                    groupSize === 1
                      ? "bg-navy border-navy text-white shadow-xs"
                      : "bg-offWhite border-border text-navy hover:bg-border/60"
                  }`}
                >
                  Individual (1)
                </button>

                {selectedAssignees.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => onGroupSizeChange(2)}
                    className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all cursor-pointer ${
                      groupSize === 2
                        ? "bg-navy border-navy text-white shadow-xs"
                        : "bg-offWhite border-border text-navy hover:bg-border/60"
                    }`}
                  >
                    Pairs (2)
                  </button>
                )}

                {selectedAssignees.length >= 3 && (
                  <button
                    type="button"
                    onClick={() => onGroupSizeChange(3)}
                    className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all cursor-pointer ${
                      groupSize === 3
                        ? "bg-navy border-navy text-white shadow-xs"
                        : "bg-offWhite border-border text-navy hover:bg-border/60"
                    }`}
                  >
                    Trios (3)
                  </button>
                )}

                {selectedAssignees.length > 2 && (
                  <button
                    type="button"
                    onClick={() => onGroupSizeChange(selectedAssignees.length)}
                    className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all cursor-pointer ${
                      groupSize === selectedAssignees.length
                        ? "bg-navy border-navy text-white shadow-xs"
                        : "bg-offWhite border-border text-navy hover:bg-border/60"
                    }`}
                  >
                    All Together ({selectedAssignees.length})
                  </button>
                )}
              </div>

              {/* If single group (All Together) */}
              {isSingleGroup ? (
                <div className="flex items-center gap-3 p-3 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="w-9 h-9 rounded-full bg-paleSky flex items-center justify-center flex-shrink-0">
                    <Users size={18} className="text-navy" strokeWidth={2.4} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-navy leading-tight">
                      Assigned to {selectedAssignees.map((id) => members.find((m) => m.userId === id)?.name?.split(" ")[0] || "Member").join(", ")} together
                    </p>
                    <p className="text-[12px] text-mutedNavy leading-normal mt-0.5">
                      All {selectedAssignees.length} flatmates are assigned together on every occurrence (no rotation).
                    </p>
                  </div>
                </div>
              ) : (
                children
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

AssignToSelector.displayName = "AssignToSelector";
