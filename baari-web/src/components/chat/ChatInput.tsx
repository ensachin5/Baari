"use client";

import React, { useState } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
}

/**
 * Mirrors baari-app/components/chat/ChatInput.tsx exactly.
 */
export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onTyping,
  disabled = false,
}) => {
  const [text, setText] = useState("");

  const handleChangeText = (val: string) => {
    setText(val);
    if (onTyping) {
      onTyping(val.length > 0);
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || disabled) return;
    if (onTyping) onTyping(false);
    onSend(text.trim());
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-3 py-2 bg-white border-t border-border">
      <form
        onSubmit={handleSend}
        className="flex items-center bg-offWhite rounded-[20px] px-3 py-1 border border-border"
      >
        <input
          type="text"
          placeholder="Message flatmates..."
          value={text}
          onChange={(e) => handleChangeText(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={1000}
          className="flex-1 bg-transparent text-[16px] leading-[24px] text-black placeholder:text-grayBlack focus:outline-none py-1.5"
        />
        <button
          type="submit"
          disabled={!text.trim() || disabled}
          className={`w-9 h-9 rounded-full flex items-center justify-center ml-1 transition-colors cursor-pointer disabled:cursor-not-allowed ${
            text.trim()
              ? "bg-navy text-white hover:bg-deepNavy shadow-xs"
              : "bg-transparent text-grayBlack"
          }`}
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
