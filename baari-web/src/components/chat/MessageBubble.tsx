"use client";

import React, { useState, useRef } from "react";
import { Avatar } from "../ui/Avatar";
import { RefreshCw, MoreVertical, Edit2, Trash2, Check, X } from "lucide-react";

export interface ChatMessage {
  id: string;
  flatId: string;
  senderId: string;
  content: string;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
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
  onEdit?: (messageId: string, newContent: string) => Promise<void> | void;
  onDelete?: (messageId: string) => Promise<void> | void;
}

/**
 * MessageBubble for baari-web with full design and feature parity with baari-app.
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
  showSenderHeader = true,
  onRetry,
  onEdit,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showMenu, setShowMenu] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ left: number; top: number } | null>(null);
  const menuTriggerRef = useRef<HTMLDivElement>(null);

  const openMenuAtTarget = (targetElement?: HTMLElement | null) => {
    const el = targetElement || menuTriggerRef.current;
    if (el && typeof window !== "undefined") {
      const rect = el.getBoundingClientRect();
      const menuWidth = 130;
      const menuHeight = 80;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate horizontal coordinate (default: right-aligned with anchor)
      let left = rect.right - menuWidth;
      // If overflowing left (< 12px), flip to align with left of anchor
      if (left < 12) {
        left = Math.max(12, rect.left);
      }
      // Guarantee left stays strictly within [12px, viewportWidth - menuWidth - 12px]
      left = Math.max(12, Math.min(left, viewportWidth - menuWidth - 12));

      // Calculate vertical coordinate (default: open above anchor)
      let top: number;
      if (rect.top - menuHeight < 12) {
        // Open downwards below anchor
        top = Math.min(rect.bottom + 4, viewportHeight - menuHeight - 12);
      } else {
        // Open upwards above anchor
        top = Math.max(12, rect.top - menuHeight - 4);
      }

      setMenuCoords({ left, top });
      setShowMenu(true);
    }
  };

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showMenu) {
      setShowMenu(false);
    } else {
      openMenuAtTarget(menuTriggerRef.current);
    }
  };

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
  const isDeleted = Boolean(message.deletedAt);
  const isEdited = Boolean(message.editedAt) && !isDeleted;

  const handleDelete = () => {
    setShowMenu(false);
    if (window.confirm("Delete this message? This can't be undone.")) {
      onDelete?.(message.id);
    }
  };

  const handleStartEdit = () => {
    setShowMenu(false);
    setEditContent(message.content);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    if (trimmed === message.content) {
      setIsEditing(false);
      return;
    }
    setIsEditing(false);
    onEdit?.(message.id, trimmed);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  // ── Current user's message (right-aligned) ──────────────────────────────
  if (isCurrentUser) {
    return (
      <div
        className={`group relative flex items-end justify-end px-3 ${
          isSending ? "opacity-65" : ""
        }`}
      >
        {/* Retry button for failed messages */}
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

        {/* Action button: persistent on touch/mobile-web viewports, reveals on hover on desktop */}
        {!isDeleted && !isSending && !isFailed && !isEditing && (
          <div
            ref={menuTriggerRef}
            className="relative mr-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity"
          >
            <button
              type="button"
              onClick={handleToggleMenu}
              className="p-1 rounded-full text-mutedNavy hover:bg-offWhite hover:text-navy cursor-pointer transition-colors"
              title="Message options"
              aria-label="Message options"
            >
              <MoreVertical size={14} />
            </button>

            {showMenu && menuCoords && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div
                  style={{
                    position: "fixed",
                    left: `${menuCoords.left}px`,
                    top: `${menuCoords.top}px`,
                    minWidth: "125px",
                  }}
                  className="z-50 bg-white border border-border rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
                >
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="w-full px-3 py-1.5 text-left text-xs text-navy hover:bg-offWhite flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Edit2 size={12} className="text-mutedNavy" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full px-3 py-1.5 text-left text-xs text-[#DC2626] hover:bg-[#FEE2E2] flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Trash2 size={12} className="text-[#DC2626]" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Bubble */}
        {isEditing ? (
          <div className="max-w-[85%] sm:max-w-[75%] p-2 rounded-[14px] rounded-br-[2px] bg-navy text-white shadow-sm">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-transparent text-white text-[14px] leading-[20px] resize-none outline-none border-none p-0 focus:ring-0"
              rows={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                } else if (e.key === "Escape") {
                  handleCancelEdit();
                }
              }}
            />
            <div className="flex items-center justify-end gap-1.5 mt-2 pt-1 border-t border-white/20">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              >
                <X size={12} />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-paleSky text-navy hover:bg-white cursor-pointer transition-colors"
              >
                <Check size={12} />
                Save
              </button>
            </div>
          </div>
        ) : (
          <div
            onContextMenu={(e) => {
              if (!isDeleted && !isSending && !isFailed) {
                e.preventDefault();
                openMenuAtTarget(e.currentTarget);
              }
            }}
            className={`max-w-[75%] py-2 px-3 rounded-[14px] rounded-br-[2px] ${
              isFailed
                ? "bg-[#FEE2E2] border border-[#FCA5A5]"
                : isDeleted
                ? "bg-offWhite border border-border"
                : "bg-sky text-white"
            }`}
          >
            <p
              className={`text-[16px] leading-[24px] break-words ${
                isFailed
                  ? "text-[#991B1B]"
                  : isDeleted
                  ? "text-grayBlack italic"
                  : "text-white"
              }`}
            >
              {isDeleted ? "This message was deleted" : message.content}
            </p>
            <div className="flex items-center justify-end gap-1 mt-[2px]">
              {isEdited && (
                <span
                  className={`text-[9px] leading-[12px] italic ${
                    isDeleted ? "text-grayBlack" : "text-paleSky"
                  }`}
                >
                  (edited)
                </span>
              )}
              <span
                className={`block text-[10px] leading-[14px] text-right ${
                  isFailed
                    ? "text-[#DC2626]"
                    : isDeleted
                    ? "text-grayBlack"
                    : "text-paleSky"
                }`}
              >
                {isSending
                  ? "Sending..."
                  : isFailed
                  ? "Failed"
                  : formatTime(message.createdAt)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Other user's message (left-aligned) ─────────────────────────────────
  return (
    <div className="flex items-end px-3">
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
      <div
        className={`max-w-[75%] py-2 px-3 rounded-[14px] rounded-bl-[2px] bg-offWhite border border-border`}
      >
        {showSenderHeader && !isDeleted && (
          <span className="block text-[12px] leading-[16px] font-bold text-navy mb-[2px]">
            {message.sender?.name || "Flatmate"}
          </span>
        )}
        <p
          className={`text-[16px] leading-[24px] break-words ${
            isDeleted ? "text-grayBlack italic" : "text-navy"
          }`}
        >
          {isDeleted ? "This message was deleted" : message.content}
        </p>
        <div className="flex items-center justify-end gap-1 mt-[2px]">
          {isEdited && (
            <span className="text-[9px] leading-[12px] italic text-grayBlack">
              (edited)
            </span>
          )}
          <span className="block text-[10px] leading-[14px] text-grayBlack text-right">
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
};
