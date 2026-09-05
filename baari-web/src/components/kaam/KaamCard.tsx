"use client";

import React from "react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { AssigneeStack, AssigneeInfo } from "./AssigneeStack";
import {
  CheckCircle2,
  Users,
  Repeat,
  SkipForward,
  Trash2,
} from "lucide-react";
import { useSession } from "@/store/session";

export interface KaamTask {
  id: string;
  flatId: string;
  title: string;
  category: "water" | "garbage" | "chore" | "custom";
  description?: string | null;
  peopleRequired: number;
  recurrence: "once" | "daily" | "weekly" | "custom";
  assignmentMode?: "auto_rotate" | "all" | "custom_rotation";
  customRotationPool?: string[] | null;
  customRotationGroupSize?: number | null;
  customRotationGroups?: Array<{ groupOrder: number; userIds: string[] }> | null;
  createdBy: string;
  creatorName?: string;
  nextAssignee?: {
    id: string;
    name: string;
    image?: string | null;
  } | null;
  currentOccurrence?: {
    id: string;
    occurrenceDate: string;
    status: "pending" | "in_progress" | "done" | "missed";
    members: {
      id: string;
      userId: string;
      status: "assigned" | "completed";
      completedAt?: string | null;
      userName: string;
      userImage?: string | null;
    }[];
  } | null;
}

interface KaamCardProps {
  task: KaamTask;
  onComplete: (occurrenceId: string) => void;
  onPress?: (task: KaamTask) => void;
  onSkipTurn?: (occurrenceId: string, taskTitle: string) => void;
  onDelete?: (taskId: string) => void;
  loading?: boolean;
}

/**
 * Mirrors baari-app/components/kaam/KaamCard.tsx exactly.
 */
export const KaamCard: React.FC<KaamCardProps> = ({
  task,
  onComplete,
  onPress,
  onSkipTurn,
  onDelete,
  loading = false,
}) => {
  const currentUser = useSession((state) => state.user);
  const activeFlat = useSession((state) => state.activeFlat);
  const currentOcc = task.currentOccurrence;

  const isCreator = task.createdBy === currentUser?.id;
  const isAdmin = activeFlat?.role === "admin";
  const canDelete = isCreator || isAdmin;

  const members = currentOcc?.members || [];
  const myAssignment = members.find((m) => m.userId === currentUser?.id);
  const isMyPartDone = myAssignment?.status === "completed";
  const isFullyDone = currentOcc?.status === "done";

  const completedCount = members.filter((m) => m.status === "completed").length;
  const totalRequired = members.length || task.peopleRequired;

  const assignees: AssigneeInfo[] = members.map((m) => ({
    userId: m.userId,
    userName: m.userName,
    userImage: m.userImage,
    status: m.status,
  }));

  const handleDeletePress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${task.title}"? This cannot be undone.`)) {
      onDelete?.(task.id);
    }
  };

  return (
    <div
      onClick={() => {
        console.log("[KaamCard Web] Clicked card:", task.id, task.title);
        onPress?.(task);
      }}
      className="cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0"
    >
      <Card
        variant={isFullyDone ? "muted" : "outlined"}
        className="p-4"
      >
      {/* Top row: Category & Recurrence & Next in Rotation & Status + Delete */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 flex-wrap">
          <Badge label={task.category} category={task.category} />
          {task.recurrence !== "once" && (
            <div className="flex items-center bg-offWhite px-[6px] py-[2px] rounded-[6px] gap-[3px]">
              <Repeat size={10} className="text-mutedNavy" />
              <span className="text-[10px] text-mutedNavy capitalize font-medium">
                {task.recurrence}
              </span>
            </div>
          )}
          {task.recurrence !== "once" && task.nextAssignee && (
            <div className="bg-[#F0FDF4] px-[6px] py-[2px] rounded-[6px] border border-[#DCFCE7]">
              <span className="text-[10px] font-semibold text-[#166534]">
                Next: {task.nextAssignee.name.split(" ")[0]}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-[6px]">
          {isFullyDone ? (
            <Badge label="Done" status="done" />
          ) : (
            <Badge
              label={
                currentOcc?.status === "in_progress"
                  ? "In Progress"
                  : "Pending"
              }
              status={
                currentOcc?.status === "in_progress"
                  ? "in_progress"
                  : "pending"
              }
            />
          )}
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={handleDeletePress}
              className="p-[3px] rounded-[6px] bg-offWhite text-[#94A3B8] hover:text-[#DC2626] transition-colors cursor-pointer"
              title="Delete task"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Task Title & Description */}
      <h2
        className={`text-[18px] leading-[24px] font-semibold mb-1 ${
          isFullyDone
            ? "text-grayBlack line-through"
            : "text-black"
        }`}
      >
        {task.title}
      </h2>

      {task.description ? (
        <p className="text-[14px] leading-[20px] text-grayBlack mb-2 line-clamp-2">
          {task.description}
        </p>
      ) : null}

      {/* Divider */}
      <div className="h-[1px] bg-border my-2" />

      {/* Footer Info: Assignees & Action */}
      <div className="flex items-center justify-between min-h-[36px]">
        <div className="flex items-center gap-2">
          <AssigneeStack assignees={assignees} />
          {totalRequired > 1 && (
            <div className="flex items-center gap-1">
              <Users size={12} className="text-mutedNavy" />
              <span className="text-[11px] leading-[14px] text-mutedNavy font-medium">
                {completedCount}/{totalRequired} done
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {currentOcc && myAssignment && !isFullyDone && (
          <div className="flex items-center gap-1">
            {onSkipTurn && !isMyPartDone && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSkipTurn(currentOcc.id, task.title);
                }}
                className="flex items-center gap-1 px-2 py-[6px] rounded-[10px] bg-offWhite border border-border text-mutedNavy text-[11px] font-semibold hover:bg-border transition-colors cursor-pointer"
              >
                <SkipForward size={12} className="text-mutedNavy" strokeWidth={2.2} />
                <span>Skip turn</span>
              </button>
            )}

            <button
              type="button"
              disabled={isMyPartDone || loading}
              onClick={(e) => {
                e.stopPropagation();
                onComplete(currentOcc.id);
              }}
              className={`flex items-center gap-1 px-3 py-[6px] rounded-[10px] text-[12px] leading-[16px] font-semibold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                isMyPartDone
                  ? "bg-paleSky text-deepNavy"
                  : "bg-navy text-white hover:bg-deepNavy active:bg-deepNavy shadow-xs"
              }`}
            >
              <CheckCircle2
                size={16}
                className={isMyPartDone ? "text-deepNavy" : "text-white"}
              />
              <span>{isMyPartDone ? "Your part done" : "Mark Done"}</span>
            </button>
          </div>
        )}
      </div>
    </Card>
  </div>
);
};
