"use client";

import React from "react";
import { Avatar } from "../ui/Avatar";
import { RefreshCw } from "lucide-react";

export interface ChatMessage {
  id: string;
  flatId: string;
  senderId: string;
  content: string;
  createdAt: string;
  status?: "sending" | "sent" | "failed";
  reads?: any[];
  sender?: {
    id: string;
    name: string;
    image?: string | null;
  };
}

interface MessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  showSenderHeader?: boolean;
  onRetry?: (message: ChatMessage) => void;
}

/**
 * Mirrors baari-app/components/chat/MessageBubble.tsx exactly.
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
  showSenderHeader = true,
  onRetry,
}) => {
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const isSending = message.status === "sending";
  const isFailed = message.status === "failed";

  // ── Current user's message (right-aligned) ──────────────────────────────
  if (isCurrentUser) {
    return (
      <div
        className={`flex items-end justify-end my-[2px] px-3 ${
          isSending ? "opacity-65" : ""
        }`}
      >
        {isFailed && onRetry && (
          <button
            type="button"
            onClick={() => onRetry(message)}
            className="mr-1 p-1 text-[#DC2626] hover:opacity-75 cursor-pointer"
            title="Retry"
          >
            <RefreshCw size={14} />
          </button>
        )}
        <div
          className={`max-w-[75%] py-2 px-3 rounded-[14px] rounded-br-[2px] ${
            isFailed
              ? "bg-[#FEE2E2] border border-[#FCA5A5]"
              : "bg-sky text-white"
          }`}
        >
          <p className="text-[16px] leading-[24px] text-white break-words">
            {message.content}
          </p>
          <span className="block text-[10px] leading-[14px] text-paleSky text-right mt-[2px]">
            {isSending
              ? "Sending..."
              : isFailed
              ? "Failed"
              : formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    );
  }

  // ── Other user's message (left-aligned) ─────────────────────────────────
  return (
    <div className="flex items-end my-[2px] px-3">
      {/* Avatar column: 36px wide */}
      <div className="w-[36px] flex items-end pb-[2px] mr-1 flex-shrink-0">
        {showSenderHeader ? (
          <Avatar
            name={message.sender?.name || "Flatmate"}
            image={message.sender?.image}
            size="xs"
          />
        ) : null}
      </div>

      {/* Bubble column */}
      <div className="max-w-[75%] py-2 px-3 rounded-[14px] rounded-bl-[2px] bg-offWhite border border-border">
        {showSenderHeader && (
          <span className="block text-[12px] leading-[16px] font-bold text-navy mb-[2px]">
            {message.sender?.name || "Flatmate"}
          </span>
        )}
        <p className="text-[16px] leading-[24px] text-navy break-words">
          {message.content}
        </p>
        <span className="block text-[10px] leading-[14px] text-grayBlack text-right mt-[2px]">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
};
