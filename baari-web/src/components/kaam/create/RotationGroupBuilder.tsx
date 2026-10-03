"use client";

import React from "react";
import { Avatar } from "@/components/ui/Avatar";
import { FlatMember } from "../CreateKaamModal";
import {
  RotateCcw,
  Plus,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Shuffle,
} from "lucide-react";

interface RotationGroupBuilderProps {
  customGroups: Array<{ id: string; userIds: string[] }>;
  members: FlatMember[];
  unassignedUserIds: string[];
  onDeleteGroup: (groupId: string) => void;
  onRemoveMemberFromGroup: (groupId: string, userId: string) => void;
  onAddMemberToGroup: (groupId: string, userId: string) => void;
  onAddNewEmptyGroup: () => void;
  onAutoDistribute: () => void;
  onCreateSoloGroup: (userId: string) => void;
  onMoveGroup: (index: number, direction: "up" | "down") => void;
  getGroupTypeLabel: (count: number) => string;
  getOrdinal: (n: number) => string;
}

export const RotationGroupBuilder: React.FC<RotationGroupBuilderProps> = React.memo(({
  customGroups,
  members,
  unassignedUserIds,
  onDeleteGroup,
  onRemoveMemberFromGroup,
  onAddMemberToGroup,
  onAddNewEmptyGroup,
  onAutoDistribute,
  onCreateSoloGroup,
  onMoveGroup,
  getGroupTypeLabel,
  getOrdinal,
}) => {
  return (
    <div className="space-y-4">
      {/* STEP 1: FORM ROTATION GROUPS (MANUAL PAIRING) */}
      <div className="p-3.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0]">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-navy text-white text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide">
            STEP 1
          </span>
          <h4 className="text-[13px] font-semibold text-deepNavy">
            Manual Pairing & Group Slots
          </h4>
        </div>
        <p className="text-[11px] text-mutedNavy mb-3">
          Choose who belongs in each group. Click ✕ to remove to unassigned pool.
        </p>

        {/* Group list */}
        <div className="space-y-2">
          {customGroups.map((grp, gIdx) => {
            const groupMembers = grp.userIds.map(
              (id) => members.find((m) => m.userId === id) || { userId: id, name: "Member", image: null, role: "member" as const }
            );
            const typeLabel = getGroupTypeLabel(grp.userIds.length);

            return (
              <div key={grp.id || gIdx} className="p-2.5 rounded-[10px] bg-white border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-paleSky text-navy text-[10px] font-semibold px-2 py-0.5 rounded-[4px]">
                      Group {gIdx + 1}
                    </span>
                    <span className="text-[11px] font-medium text-mutedNavy">
                      {typeLabel}
                    </span>
                  </div>

                  {customGroups.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteGroup(grp.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                      title="Delete group"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Members inside group */}
                <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
                  {groupMembers.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic py-1">
                      No flatmates assigned yet
                    </span>
                  ) : (
                    groupMembers.map((m) => (
                      <div
                        key={m.userId}
                        className="flex items-center gap-1.5 bg-offWhite border border-border rounded-full py-0.5 pl-1 pr-2"
                      >
                        <Avatar name={m.name} image={m.image} size="sm" />
                        <span className="text-[11px] font-semibold text-deepNavy">
                          {m.name.split(" ")[0]}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveMemberFromGroup(grp.id, m.userId)}
                          className="text-mutedNavy hover:text-red-500 transition-colors ml-0.5 cursor-pointer"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Quick add unassigned person to this group */}
                {unassignedUserIds.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <span className="text-[10px] text-mutedNavy whitespace-nowrap">
                      + Add to Group {gIdx + 1}:
                    </span>
                    {unassignedUserIds.map((uid) => {
                      const unassignedM = members.find((m) => m.userId === uid);
                      const name = unassignedM?.name ? unassignedM.name.split(" ")[0] : "Member";
                      return (
                        <button
                          key={uid}
                          type="button"
                          onClick={() => onAddMemberToGroup(grp.id, uid)}
                          className="flex items-center gap-1 bg-paleSky text-navy text-[10px] font-semibold px-2 py-0.5 rounded-full hover:bg-sky/50 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Plus size={10} strokeWidth={3} />
                          <span>{name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1 Actions */}
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={onAddNewEmptyGroup}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-[6px] bg-white border border-border text-[11px] font-semibold text-navy hover:bg-offWhite transition-colors cursor-pointer"
          >
            <Plus size={12} strokeWidth={2.4} />
            <span>Add Group Slot</span>
          </button>

          <button
            type="button"
            onClick={onAutoDistribute}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-[6px] bg-white border border-border text-[11px] font-semibold text-navy hover:bg-offWhite transition-colors cursor-pointer"
          >
            <Shuffle size={12} strokeWidth={2.4} />
            <span>Auto-Balance</span>
          </button>
        </div>

        {/* LEFTOVER / UNASSIGNED BANNER */}
        {unassignedUserIds.length > 0 && (
          <div className="mt-3 p-3 rounded-[10px] bg-[#FEF3C7] border border-[#FCD34D]">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle size={14} className="text-[#D97706]" />
              <span className="text-[11px] font-semibold text-[#92400E]">
                Remaining Flatmates ({unassignedUserIds.length} Leftover)
              </span>
            </div>
            <p className="text-[10px] text-[#78350F] mb-2">
              Place leftover flatmate(s) into an existing group or create a solo turn:
            </p>

            <div className="space-y-1.5">
              {unassignedUserIds.map((uid) => {
                const m = members.find((mem) => mem.userId === uid);
                const firstName = m?.name ? m.name.split(" ")[0] : "Member";

                return (
                  <div
                    key={uid}
                    className="flex items-center justify-between p-1.5 rounded-[6px] bg-white border border-[#FDE68A]"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar name={m?.name || "Member"} image={m?.image} size="sm" />
                      <span className="text-[11px] font-semibold text-deepNavy">
                        {firstName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {customGroups.map((grp, gIdx) => (
                        <button
                          key={grp.id || gIdx}
                          type="button"
                          onClick={() => onAddMemberToGroup(grp.id, uid)}
                          className="bg-paleSky text-navy text-[10px] font-semibold px-2 py-1 rounded hover:bg-sky/50 transition-colors cursor-pointer"
                        >
                          + Group {gIdx + 1}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => onCreateSoloGroup(uid)}
                        className="bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] text-[10px] font-semibold px-2 py-1 rounded hover:bg-[#DBEAFE] transition-colors cursor-pointer"
                      >
                        + Solo Turn
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* STEP 2: EXPLICIT TURN ORDER SELECTION */}
      <div className="p-3.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0]">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-navy text-white text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide">
            STEP 2
          </span>
          <h4 className="text-[13px] font-semibold text-deepNavy">
            Explicit Turn Order
          </h4>
        </div>
        <p className="text-[11px] text-mutedNavy mb-3">
          Use ▲ and ▼ to choose which group goes 1st, 2nd, 3rd, etc.
        </p>

        <div className="space-y-1.5">
          {customGroups.map((grp, idx) => {
            const names = grp.userIds
              .map((id) => members.find((m) => m.userId === id)?.name?.split(" ")[0] || "Member")
              .join(" & ");
            const typeLabel = getGroupTypeLabel(grp.userIds.length);

            return (
              <div
                key={grp.id || idx}
                className="flex items-center justify-between p-2 rounded-[8px] bg-white border border-border"
              >
                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 text-navy font-bold text-[10px] px-2 py-1 rounded">
                    {getOrdinal(idx + 1)} Turn
                  </span>
                  <div>
                    <span className="text-[12px] font-semibold text-deepNavy block leading-tight">
                      {names || "Empty Group"}
                    </span>
                    <span className="text-[10px] text-mutedNavy">
                      {grp.userIds.length} {grp.userIds.length === 1 ? "person" : "people"} ({typeLabel})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onMoveGroup(idx, "up")}
                    disabled={idx === 0}
                    className="p-1.5 rounded bg-slate-50 border border-slate-200 text-navy hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronUp size={14} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveGroup(idx, "down")}
                    disabled={idx === customGroups.length - 1}
                    className="p-1.5 rounded bg-slate-50 border border-slate-200 text-navy hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronDown size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ROTATION CONFIRMATION PREVIEW */}
      <div className="p-3 rounded-[10px] bg-paleSky/40 border border-sky/30">
        <div className="flex items-center gap-1.5 mb-1.5">
          <RotateCcw size={14} className="text-navy" />
          <span className="text-[11px] font-bold text-deepNavy">
            Rotation Sequence ({customGroups.filter((g) => g.userIds.length > 0).length} turns):
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {customGroups
            .filter((g) => g.userIds.length > 0)
            .map((grp, idx, validArr) => {
              const names = grp.userIds
                .map((id) => members.find((m) => m.userId === id)?.name?.split(" ")[0] || "Member")
                .join(" & ");
              const typeLabel = getGroupTypeLabel(grp.userIds.length);

              return (
                <div key={grp.id || idx} className="flex items-center gap-1">
                  <span className="bg-navy text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-[11px] font-semibold text-deepNavy">
                    {names} <span className="text-[10px] text-mutedNavy">({typeLabel})</span>
                  </span>
                  {idx < validArr.length - 1 && (
                    <span className="text-[11px] text-mutedNavy ml-0.5">→</span>
                  )}
                </div>
              );
            })}
        </div>
        <p className="text-[10px] text-mutedNavy">
          Rotates in this exact sequence. Group order is stored in rotation sequence.
        </p>
      </div>
    </div>
  );
});

RotationGroupBuilder.displayName = "RotationGroupBuilder";
