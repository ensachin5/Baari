"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "../ui/Modal";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { api } from "@/lib/api";
import {
  Repeat,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  History,
  Check,
} from "lucide-react";
import { KaamTask } from "./KaamCard";

interface TaskOccurrenceHistory {
  id: string;
  occurrenceDate: string;
  status: "pending" | "done" | "missed";
  createdAt: string;
  assignees: {
    id: string;
    userId: string;
    userName: string;
    userImage?: string | null;
    status: "assigned" | "completed";
    completedAt?: string | null;
  }[];
}

interface TaskHistoryResponse {
  task: KaamTask & {
    customRotationGroups?: Array<{ groupOrder: number; userIds: string[] }>;
    creatorName?: string;
  };
  occurrences: TaskOccurrenceHistory[];
  nextCursor?: string | null;
}

interface KaamDetailModalProps {
  visible: boolean;
  taskId: string | null;
  initialTask?: KaamTask | null;
  onClose: () => void;
  onComplete?: (occurrenceId: string) => void;
}

export const KaamDetailModal: React.FC<KaamDetailModalProps> = ({
  visible,
  taskId,
  initialTask,
  onClose,
}) => {
  const [taskData, setTaskData] = useState<TaskHistoryResponse["task"] | null>(
    (initialTask as any) || null
  );
  const [occurrences, setOccurrences] = useState<TaskOccurrenceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const activeTaskId = taskId || initialTask?.id;

  const fetchHistory = useCallback(async () => {
    if (!activeTaskId) return;
    try {
      console.log("[KaamDetailModal Web] Fetching history for task:", activeTaskId);
      setLoading(true);
      const res = await api.get<TaskHistoryResponse>(
        `/api/tasks/${activeTaskId}/history?limit=20`
      );
      console.log("[KaamDetailModal Web] History fetched successfully:", res?.occurrences?.length, "occurrences");
      if (res?.task) {
        setTaskData(res.task);
      }
      setOccurrences(res?.occurrences || []);
      setNextCursor(res?.nextCursor || null);
    } catch (error) {
      console.error("[KaamDetailModal Web] Error fetching task history:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTaskId]);

  useEffect(() => {
    console.log("[KaamDetailModal Web] visible:", visible, "activeTaskId:", activeTaskId);
    if (visible && activeTaskId) {
      if (initialTask) {
        setTaskData(initialTask as any);
      }
      fetchHistory();
    } else {
      setOccurrences([]);
      setNextCursor(null);
    }
  }, [visible, activeTaskId, initialTask, fetchHistory]);

  const loadMoreHistory = async () => {
    if (!activeTaskId || !nextCursor || loadingMore) return;
    try {
      setLoadingMore(true);
      const res = await api.get<TaskHistoryResponse>(
        `/api/tasks/${activeTaskId}/history?limit=20&cursor=${nextCursor}`
      );
      setOccurrences((prev) => [...prev, ...(res?.occurrences || [])]);
      setNextCursor(res?.nextCursor || null);
    } catch (error) {
      console.error("[KaamDetailModal Web] Error loading more task history:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      const today = new Date();
      const todayUTC = new Date(
        Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
      );
      const yesterdayUTC = new Date(todayUTC);
      yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);

      if (date.getTime() === todayUTC.getTime()) return "Today";
      if (date.getTime() === yesterdayUTC.getTime()) return "Yesterday";

      return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const currentTask = taskData || initialTask;

  if (!currentTask && loading) {
    return (
      <Modal visible={visible} onClose={onClose} title="Kaam Details">
        <div className="py-12 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-navy border-t-transparent rounded-full animate-spin" />
        </div>
      </Modal>
    );
  }

  if (!currentTask) return null;

  return (
    <Modal visible={visible} onClose={onClose} title="Kaam Details">
      <div className="space-y-4">
        {/* Header Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge label={currentTask.category} category={currentTask.category} />
          {currentTask.recurrence !== "once" && (
            <div className="flex items-center bg-offWhite px-2 py-0.5 rounded-md gap-1">
              <Repeat size={11} className="text-mutedNavy" />
              <span className="text-[11px] text-mutedNavy capitalize font-medium">
                {currentTask.recurrence}
              </span>
            </div>
          )}
          {currentTask.currentOccurrence && (
            <Badge
              label={
                currentTask.currentOccurrence.status === "done"
                  ? "Done"
                  : currentTask.currentOccurrence.status === "in_progress"
                  ? "In Progress"
                  : "Pending"
              }
              status={
                currentTask.currentOccurrence.status === "done"
                  ? "done"
                  : currentTask.currentOccurrence.status === "in_progress"
                  ? "in_progress"
                  : "pending"
              }
            />
          )}
        </div>

        {/* Task Title & Description */}
        <div>
          <h1 className="text-[20px] font-bold text-navy mb-1 leading-snug">
            {currentTask.title}
          </h1>
          {currentTask.description ? (
            <p className="text-[14px] text-grayBlack leading-relaxed">
              {currentTask.description}
            </p>
          ) : null}
        </div>

        {/* Next in Rotation Box */}
        {currentTask.recurrence !== "once" && currentTask.nextAssignee && (
          <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Users size={14} className="text-[#15803D]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#15803D]">
                Next Turn in Rotation
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Avatar
                name={currentTask.nextAssignee.name}
                image={currentTask.nextAssignee.image}
                size="sm"
              />
              <span className="text-[14px] font-semibold text-navy">
                {currentTask.nextAssignee.name}
              </span>
            </div>
          </div>
        )}

        {/* Custom Rotation Order Sequence */}
        {currentTask.assignmentMode === "custom_rotation" &&
          currentTask.customRotationGroups &&
          currentTask.customRotationGroups.length > 0 && (
            <div className="bg-offWhite border border-border rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Repeat size={14} className="text-navy" />
                <span className="text-[13px] font-bold text-navy">
                  Custom Rotation Turn Order
                </span>
              </div>
              <p className="text-[11px] text-mutedNavy mb-2.5">
                Groups rotate in the sequence shown below:
              </p>
              <div className="flex items-center flex-wrap gap-2">
                {currentTask.customRotationGroups.map((group, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1.5 bg-white border border-border rounded-lg px-2.5 py-1 shadow-2xs">
                      <div className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-navy leading-tight">
                          Turn {group.groupOrder || idx + 1}
                        </div>
                        <div className="text-[9px] text-grayBlack">
                          {group.userIds.length}{" "}
                          {group.userIds.length === 1 ? "person" : "people"}
                        </div>
                      </div>
                    </div>
                    {idx <
                      (currentTask.customRotationGroups?.length || 0) - 1 && (
                      <ArrowRight size={13} className="text-mutedNavy" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Occurrence History Section */}
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <History size={16} className="text-navy" />
            <h3 className="text-[16px] font-bold text-navy">
              Occurrence History
            </h3>
          </div>

          {loading && occurrences.length === 0 ? (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
            </div>
          ) : occurrences.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <Calendar size={28} className="text-sky mb-1" />
              <p className="text-[13px] text-grayBlack">
                No past occurrences recorded yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {occurrences.map((occ) => {
                const isDone = occ.status === "done";
                const isMissed = occ.status === "missed";

                return (
                  <div
                    key={occ.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isDone
                        ? "bg-[#F0FDF4] border-[#DCFCE7]"
                        : isMissed
                        ? "bg-[#FEF2F2] border-[#FEE2E2]"
                        : "bg-white border-border"
                    }`}
                  >
                    {/* Occ Date & Status */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/5">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-mutedNavy" />
                        <span className="text-[13px] font-bold text-navy">
                          {formatDate(occ.occurrenceDate)}
                        </span>
                      </div>
                      <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isDone
                            ? "bg-[#DCFCE7] text-[#15803D]"
                            : isMissed
                            ? "bg-[#FEE2E2] text-[#DC2626]"
                            : "bg-offWhite text-mutedNavy"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 size={11} className="text-[#15803D]" />
                        ) : isMissed ? (
                          <XCircle size={11} className="text-[#DC2626]" />
                        ) : (
                          <Clock size={11} className="text-mutedNavy" />
                        )}
                        <span>
                          {isDone
                            ? "Completed"
                            : isMissed
                            ? "Missed"
                            : "Pending"}
                        </span>
                      </div>
                    </div>

                    {/* Assignees list */}
                    <div className="space-y-1.5">
                      {occ.assignees.map((assignee) => {
                        const isMemberCompleted =
                          assignee.status === "completed";
                        return (
                          <div
                            key={assignee.id || assignee.userId}
                            className="flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <Avatar
                                name={assignee.userName}
                                image={assignee.userImage}
                                size="xs"
                              />
                              <div>
                                <span className="text-[12px] font-semibold text-navy block leading-tight">
                                  {assignee.userName}
                                </span>
                                <span className="text-[10px] text-grayBlack">
                                  {isMemberCompleted
                                    ? `Completed${
                                        assignee.completedAt
                                          ? ` at ${formatTime(
                                              assignee.completedAt
                                            )}`
                                          : ""
                                      }`
                                    : isMissed
                                    ? "Missed task"
                                    : "Assigned"}
                                </span>
                              </div>
                            </div>
                            {isMemberCompleted && (
                              <div className="w-4 h-4 rounded-full bg-[#16A34A] text-white flex items-center justify-center">
                                <Check size={10} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Load More Button */}
              {nextCursor && (
                <div className="pt-1 flex justify-center">
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={loadMoreHistory}
                    className="px-3 py-1.5 rounded-full bg-offWhite border border-border text-[11px] font-semibold text-navy hover:bg-border transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {loadingMore ? "Loading..." : "Load older occurrences"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
