"use client";

import React from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Flame, Edit3 } from "lucide-react";

interface ProfileHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    currentStreak?: number;
    longestStreak?: number;
  } | null;
  isAdmin: boolean;
  onEditPress: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = React.memo(({
  user,
  isAdmin,
  onEditPress,
}) => {
  return (
    <Card variant="outlined" className="p-4 mb-4">
      <div className="flex items-center gap-4">
        <Avatar name={user?.name || "User"} image={user?.image} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-semibold text-black truncate">
              {user?.name || "Flatmate"}
            </h2>
            {typeof user?.currentStreak === "number" && user.currentStreak > 0 && (
              <div className="flex items-center gap-1 bg-[#F0F9FF] px-2 py-0.5 rounded-full border border-paleSky">
                <Flame size={14} className="text-sky fill-sky" />
                <span className="text-[11px] font-bold text-deepSky">
                  {user.currentStreak}
                </span>
              </div>
            )}
          </div>
          <p className="text-[14px] text-grayBlack truncate mt-0.5">
            {user?.email || ""}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge
              label={isAdmin ? "Flat Admin" : "Member"}
              status={isAdmin ? "done" : "pending"}
              showIcon={false}
            />
            {typeof user?.longestStreak === "number" && user.longestStreak > 0 && (
              <span className="text-[12px] text-mutedNavy">
                Best streak: {user.longestStreak}d
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onEditPress}
          className="p-2 rounded-full bg-offWhite text-navy hover:bg-border/60 transition-colors cursor-pointer"
        >
          <Edit3 size={18} />
        </button>
      </div>
    </Card>
  );
});

ProfileHeader.displayName = "ProfileHeader";
