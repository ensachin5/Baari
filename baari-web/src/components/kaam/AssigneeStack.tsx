"use client";

import React from "react";
import { Avatar } from "../ui/Avatar";
import { Check } from "lucide-react";

export interface AssigneeInfo {
  userId: string;
  userName: string;
  userImage?: string | null;
  status?: "assigned" | "completed";
}

interface AssigneeStackProps {
  assignees: AssigneeInfo[];
  maxVisible?: number;
  className?: string;
}

/**
 * Mirrors baari-app/components/kaam/AssigneeStack.tsx exactly.
 */
export const AssigneeStack: React.FC<AssigneeStackProps> = ({
  assignees,
  maxVisible = 3,
  className = "",
}) => {
  if (!assignees || assignees.length === 0) return null;

  const visible = assignees.slice(0, maxVisible);
  const remaining = assignees.length - maxVisible;

  return (
    <div className={`flex items-center ${className}`}>
      {visible.map((assignee, index) => {
        const isCompleted = assignee.status === "completed";
        return (
          <div
            key={assignee.userId || index}
            style={{
              marginLeft: index === 0 ? 0 : -10,
              zIndex: 10 - index,
            }}
            className="relative"
          >
            <Avatar
              name={assignee.userName}
              image={assignee.userImage}
              size="sm"
              className="border-2 border-white"
            />
            {isCompleted && (
              <div className="absolute -bottom-[2px] -right-[2px] bg-deepNavy rounded-full w-[14px] h-[14px] flex items-center justify-center border-[1.5px] border-white">
                <Check size={8} className="text-white" strokeWidth={3} />
              </div>
            )}
          </div>
        );
      })}
      {remaining > 0 && (
        <div
          style={{ marginLeft: -10, zIndex: 0 }}
          className="w-8 h-8 rounded-full bg-paleSky border-2 border-white flex items-center justify-center"
        >
          <span className="text-[12px] leading-[16px] text-deepNavy font-bold">
            +{remaining}
          </span>
        </div>
      )}
    </div>
  );
};
