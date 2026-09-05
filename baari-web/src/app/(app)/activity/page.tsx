"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useActivity } from "@/hooks/useActivity";
import { useSession } from "@/store/session";
import { ActivityItem, ActivityEntry } from "@/components/activity/ActivityItem";
import { WeeklySummaryCard } from "@/components/kaam/WeeklySummaryCard";
import { Activity as ActivityIcon } from "lucide-react";

/**
 * Mirrors baari-app/app/(tabs)/activity.tsx exactly.
 */
export default function ActivityPage() {
  const router = useRouter();
  const activeFlat = useSession((state) => state.activeFlat);
  const { activities, loading, hasMore, loadMore } = useActivity();

  const handleActivityPress = (activity: ActivityEntry) => {
    if (activity.type.startsWith("task_")) {
      router.push("/home");
    } else if (
      activity.type === "expense_added" ||
      activity.type === "settlement" ||
      activity.type === "settlement_confirmed"
    ) {
      router.push("/expense");
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-4xl mx-auto w-full pb-20 lg:pb-6">
      {/* Header matching baari-app styles.header */}
      <div className="px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0.75rem))] border-b border-border bg-white sticky top-0 z-20">
        <h1 className="text-[22px] leading-[28px] font-semibold text-black">
          Flat Activity Feed
        </h1>
        <p className="text-[12px] leading-[16px] text-grayBlack mt-0.5">
          Real-time updates of tasks, expenses & settlements
        </p>
      </div>

      <div className="px-5 pt-3 space-y-3">
        {/* Weekly Summary Card */}
        <WeeklySummaryCard flatId={activeFlat?.id} />

        {/* Activity Items List */}
        {activities.length > 0 ? (
          <div className="bg-white rounded-[14px] border border-border p-3 divide-y divide-border">
            {activities.map((item) => (
              <ActivityItem
                key={item.id}
                activity={item}
                onPress={handleActivityPress}
              />
            ))}
          </div>
        ) : (
          !loading && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <ActivityIcon size={40} className="text-sky mb-2" />
              <h2 className="text-[18px] leading-[24px] font-semibold text-black mb-1">
                No activity yet
              </h2>
              <p className="text-[14px] leading-[20px] text-grayBlack max-w-[280px]">
                Actions like completing tasks, adding expenses, or joining will
                appear here in real time.
              </p>
            </div>
          )
        )}

        {/* Load More Button */}
        {hasMore && (
          <div className="text-center py-4">
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              className="px-4 py-2 rounded-full border border-border text-[13px] font-semibold text-navy bg-offWhite hover:bg-border/60 transition-colors cursor-pointer"
            >
              {loading ? "Loading..." : "Load Older Activities"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
