"use client";

import React, { useState, useEffect } from "react";
import { Card } from "../ui/Card";
import { api } from "@/lib/api";
import { CheckSquare, X } from "lucide-react";

interface WeeklySummaryItem {
  userId: string;
  userName: string;
  userImage: string | null;
  totalCompleted: number;
  breakdown: { taskTitle: string; count: number }[];
}

interface WeeklySummaryCardProps {
  flatId?: string;
  dismissible?: boolean;
}

/**
 * Mirrors baari-app/components/kaam/WeeklySummaryCard.tsx exactly.
 */
export const WeeklySummaryCard: React.FC<WeeklySummaryCardProps> = ({
  flatId,
  dismissible = false,
}) => {
  const [summary, setSummary] = useState<WeeklySummaryItem[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!flatId) return;

    let mounted = true;
    api
      .get<{ weeklySummary: WeeklySummaryItem[] }>(
        `/api/tasks/weekly-summary?flatId=${flatId}`
      )
      .then((res) => {
        if (mounted) {
          setSummary(res.weeklySummary || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [flatId]);

  if (isDismissed || loading || summary.length === 0) {
    return null;
  }

  return (
    <Card variant="outlined" className="bg-[#F8FAFC] border-border mb-3 p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <CheckSquare size={16} className="text-navy" />
          <span className="text-[14px] font-bold text-deepNavy">
            This Week&apos;s Kaam
          </span>
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="text-grayBlack hover:text-black cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="space-y-1 mt-1">
        {summary.map((userSum) => {
          const breakdownText = userSum.breakdown
            .map((b) => `${b.taskTitle} ×${b.count}`)
            .join(", ");

          return (
            <div key={userSum.userId} className="flex flex-wrap items-center text-[13px]">
              <span className="font-semibold text-deepNavy mr-1.5">
                {userSum.userName}:
              </span>
              <span className="font-normal text-mutedNavy">
                {breakdownText}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
