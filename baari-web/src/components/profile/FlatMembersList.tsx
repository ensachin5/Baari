"use client";

import React from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Users, Trash2 } from "lucide-react";

export interface MemberItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  role: "admin" | "member";
}

interface FlatMembersListProps {
  members: MemberItem[];
  currentUserId?: string;
  isAdmin: boolean;
  onRemoveMember: (member: MemberItem) => void;
}

export const FlatMembersList: React.FC<FlatMembersListProps> = React.memo(({
  members,
  currentUserId,
  isAdmin,
  onRemoveMember,
}) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[18px] font-semibold text-black">
          Flatmates ({members.length})
        </h2>
        <Users size={18} className="text-navy" />
      </div>

      <Card variant="outlined" className="py-1 px-4">
        {members.map((member, idx) => {
          const isSelf = member.userId === currentUserId;
          return (
            <div
              key={member.userId || idx}
              className={`flex items-center py-3 gap-3 ${
                idx !== members.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <Avatar name={member.name} image={member.image} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-black truncate">
                  {member.name} {isSelf && "(You)"}
                </p>
                <p className="text-[11px] text-grayBlack truncate">
                  {member.email}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {member.role === "admin" && (
                  <Badge label="Admin" status="done" showIcon={false} />
                )}

                {isAdmin && !isSelf && (
                  <button
                    type="button"
                    onClick={() => onRemoveMember(member)}
                    className="p-1.5 rounded-[6px] bg-[#FEF2F2] text-deepNavy hover:bg-red-100 transition-colors cursor-pointer"
                    title="Remove member"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
});

FlatMembersList.displayName = "FlatMembersList";
