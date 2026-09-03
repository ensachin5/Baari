"use client";

import React from "react";
import { Avatar } from "../ui/Avatar";
import {
  Plus,
  CheckCircle2,
  SkipForward,
  AlertTriangle,
  Receipt,
  HandCoins,
  ShieldCheck,
  UserPlus,
  Trash2,
} from "lucide-react";

export interface ActivityEntry {
  id: string;
  flatId: string;
  actorId: string;
  type:
    | "task_created"
    | "task_completed"
    | "task_missed"
    | "task_skipped"
    | "task_deleted"
    | "expense_added"
    | "settlement"
    | "settlement_confirmed"
    | "member_joined";
  referenceId?: string | null;
  metadata?: any;
  createdAt: string;
  actorName: string;
  actorImage?: string | null;
}

interface ActivityItemProps {
  activity: ActivityEntry;
  onPress?: (activity: ActivityEntry) => void;
}

/**
 * Mirrors baari-app/components/activity/ActivityItem.tsx exactly.
 */
export const ActivityItem: React.FC<ActivityItemProps> = ({
  activity,
  onPress,
}) => {
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const getActivityDetails = () => {
    switch (activity.type) {
      case "task_created":
        return {
          icon: <Plus size={13} className="text-[#4F46E5]" strokeWidth={2.5} />,
          bg: "bg-[#EEF2FF]",
          border: "border-[#C7D2FE]",
          actionText: `created Kaam "${activity.metadata?.taskTitle || "Task"}"`,
        };
      case "task_completed":
        return {
          icon: <CheckCircle2 size={13} className="text-[#059669]" strokeWidth={2.2} />,
          bg: "bg-[#ECFDF5]",
          border: "border-[#A7F3D0]",
          actionText: activity.metadata?.isFullyDone
            ? `completed Kaam "${activity.metadata?.taskTitle || "Task"}"`
            : `completed part of "${activity.metadata?.taskTitle || "Task"}"`,
        };
      case "task_skipped":
        return {
          icon: <SkipForward size={13} className="text-[#0284C7]" strokeWidth={2.2} />,
          bg: "bg-[#F0F9FF]",
          border: "border-[#BAE6FD]",
          actionText: `passed turn for "${
            activity.metadata?.taskTitle || "Task"
          }" to ${activity.metadata?.passedToName || "flatmate"}`,
        };
      case "task_missed":
        return {
          icon: <AlertTriangle size={13} className="text-white" strokeWidth={2.2} />,
          bg: "bg-deepNavy",
          border: "border-deepNavy",
          actionText: `missed Kaam "${activity.metadata?.taskTitle || "Task"}"`,
        };
      case "task_deleted":
        return {
          icon: <Trash2 size={13} className="text-[#DC2626]" strokeWidth={2.2} />,
          bg: "bg-[#FEF2F2]",
          border: "border-[#FECACA]",
          actionText: `deleted Kaam "${activity.metadata?.taskTitle || "Task"}"`,
        };
      case "expense_added":
        return {
          icon: <Receipt size={13} className="text-[#D97706]" strokeWidth={2.2} />,
          bg: "bg-[#FFFBEB]",
          border: "border-[#FDE68A]",
          actionText: `added expense "${
            activity.metadata?.title || "Expense"
          }" (₹${activity.metadata?.amount || ""})`,
        };
      case "settlement":
        return {
          icon: <HandCoins size={13} className="text-[#2563EB]" strokeWidth={2.2} />,
          bg: "bg-[#EFF6FF]",
          border: "border-[#BFDBFE]",
          actionText: `sent payment of ₹${activity.metadata?.amount || ""} to ${
            activity.metadata?.paidToName || "Flatmate"
          }`,
        };
      case "settlement_confirmed":
        return {
          icon: <ShieldCheck size={13} className="text-[#059669]" strokeWidth={2.2} />,
          bg: "bg-[#ECFDF5]",
          border: "border-[#A7F3D0]",
          actionText: `confirmed ₹${activity.metadata?.amount || ""} payment from ${
            activity.metadata?.paidByName || "Flatmate"
          }`,
        };
      case "member_joined":
        return {
          icon: <UserPlus size={13} className="text-[#9333EA]" strokeWidth={2.2} />,
          bg: "bg-[#FAF5FF]",
          border: "border-[#E9D5FF]",
          actionText: `joined the flat`,
        };
      default:
        return {
          icon: <Plus size={13} className="text-navy" strokeWidth={2.2} />,
          bg: "bg-paleSky",
          border: "border-[#BAE6FD]",
          actionText: "performed an action",
        };
    }
  };

  const { icon, bg, border, actionText } = getActivityDetails();

  return (
    <div
      onClick={() => onPress?.(activity)}
      className="flex items-center py-3 border-b border-border hover:bg-offWhite/50 px-2 rounded-[8px] transition-colors cursor-pointer"
    >
      <div className="relative mr-3 flex-shrink-0">
        <Avatar name={activity.actorName} image={activity.actorImage} size="md" />
        <div
          className={`absolute -bottom-[2px] -right-[4px] w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px] ${bg} ${border}`}
        >
          {icon}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] leading-[18px] text-black">
          <strong className="font-semibold text-deepNavy">
            {activity.actorName}{" "}
          </strong>
          <span className="font-normal text-mutedNavy">{actionText}</span>
        </p>
        <span className="block text-[12px] leading-[16px] text-grayBlack mt-0.5">
          {formatTime(activity.createdAt)}
        </span>
      </div>
    </div>
  );
};
