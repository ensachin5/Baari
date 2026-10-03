"use client";

import React from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Card } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { KaamCard, KaamTask } from "@/components/kaam/KaamCard";
import { ClipboardCheck, Plus } from "lucide-react";

interface KaamSectionProps {
  flatId?: string | null;
  filter: "today" | "upcoming" | "recurring";
  onFilterChange: (val: "today" | "upcoming" | "recurring") => void;
  todayTasksCount: number;
  todayCompletedCount: number;
  kaamLoading: boolean;
  tasks: KaamTask[];
  filteredTasks: KaamTask[];
  completingId?: string | null;
  onSelectTask: (task: KaamTask) => void;
  onCompleteTask: (occId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenCreateModal: () => void;
}

export const KaamSection: React.FC<KaamSectionProps> = React.memo(({
  filter,
  onFilterChange,
  todayTasksCount,
  todayCompletedCount,
  kaamLoading,
  tasks,
  filteredTasks,
  completingId,
  onSelectTask,
  onCompleteTask,
  onDeleteTask,
  onOpenCreateModal,
}) => {
  return (
    <div className="relative pb-24">
      {/* Filter Tabs */}
      <div className="my-4">
        <SegmentedControl
          options={[
            { label: "Today", value: "today" },
            { label: "Upcoming", value: "upcoming" },
            { label: "Recurring", value: "recurring" },
          ]}
          selected={filter}
          onSelect={(val) => onFilterChange(val as any)}
        />
      </div>

      {/* Today's Summary Card */}
      {filter === "today" && (
        <Card variant="muted" className="mb-4 bg-paleSky border-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[18px] font-semibold text-black">Today&apos;s Kaam</h2>
              <p className="text-[14px] text-mutedNavy mt-0.5">
                {todayCompletedCount} of {todayTasksCount} tasks completed
              </p>
            </div>
            <div className="bg-navy px-3 py-1 rounded-full">
              <span className="text-[14px] font-medium text-white">
                {todayTasksCount > 0
                  ? `${Math.round((todayCompletedCount / todayTasksCount) * 100)}%`
                  : "100%"}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Kaam Cards */}
      {kaamLoading && tasks.length === 0 ? (
        <CardSkeleton count={3} />
      ) : filteredTasks.length > 0 ? (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <KaamCard
              key={task.id}
              task={task}
              onPress={onSelectTask}
              onComplete={onCompleteTask}
              onDelete={onDeleteTask}
              loading={completingId === task.currentOccurrence?.id}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <ClipboardCheck size={40} className="text-sky" strokeWidth={1.8} />
          <h2 className="text-[18px] font-semibold text-black mt-3">
            No Kaam due in this view!
          </h2>
          <p className="text-[14px] text-grayBlack mt-1 max-w-sm">
            Tap the + button below to create a new shared household task.
          </p>
        </div>
      )}

      {/* Floating Action Button for Create Task */}
      <button
        type="button"
        onClick={onOpenCreateModal}
        className="fixed bottom-20 md:bottom-5 right-5 flex items-center gap-1 bg-navy text-white py-3 px-4 rounded-full font-bold text-[16px] shadow-lg hover:bg-deepNavy transition-all cursor-pointer z-30"
      >
        <Plus size={20} className="text-white" strokeWidth={2.5} />
        <span>Create Kaam</span>
      </button>
    </div>
  );
});

KaamSection.displayName = "KaamSection";
