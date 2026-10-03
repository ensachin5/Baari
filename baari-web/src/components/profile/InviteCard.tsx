"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { ShieldCheck, Copy, Check, Share2 } from "lucide-react";

interface InviteCardProps {
  activeFlat: {
    name: string;
    inviteCode: string;
  } | null;
  copied: boolean;
  onCopyInviteCode: () => void;
  onShareInviteCode: () => void;
}

export const InviteCard: React.FC<InviteCardProps> = React.memo(({
  activeFlat,
  copied,
  onCopyInviteCode,
  onShareInviteCode,
}) => {
  if (!activeFlat) return null;

  return (
    <Card variant="elevated" className="p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[12px] font-semibold text-mutedNavy tracking-wide block uppercase">
            CURRENT FLAT
          </span>
          <h2 className="text-[18px] font-semibold text-black">{activeFlat.name}</h2>
        </div>
        <ShieldCheck size={24} className="text-navy" />
      </div>

      {/* Invite Code Box */}
      <div className="flex items-center justify-between bg-offWhite p-4 rounded-[10px] border border-border">
        <div>
          <span className="text-[10px] text-mutedNavy block uppercase">
            FLAT INVITE CODE
          </span>
          <span className="font-bold text-[18px] text-navy tracking-widest mt-0.5 block">
            {activeFlat.inviteCode}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCopyInviteCode}
            className="p-2 bg-white rounded-[6px] border border-border text-navy hover:bg-offWhite transition-colors cursor-pointer"
            title="Copy invite code"
          >
            {copied ? <Check size={18} className="text-deepNavy" /> : <Copy size={18} />}
          </button>

          <button
            type="button"
            onClick={onShareInviteCode}
            className="p-2 bg-white rounded-[6px] border border-border text-navy hover:bg-offWhite transition-colors cursor-pointer"
            title="Share invite code"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>
      {copied && (
        <p className="text-[12px] text-navy text-right mt-1 font-medium">
          Copied to clipboard!
        </p>
      )}
    </Card>
  );
});

InviteCard.displayName = "InviteCard";
