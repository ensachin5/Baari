"use client";

import React from "react";
import { MessageBubble, ChatMessage } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageCircle } from "lucide-react";
import { TypingUser } from "@/hooks/useChat";

interface ChatSectionProps {
  chatLoading: boolean;
  messages: ChatMessage[];
  chatScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  currentUser: { id: string } | null;
  retryMessage: (message: ChatMessage) => void;
  editMessage: (id: string, text: string) => void;
  deleteMessage: (id: string) => void;
  sendMessage: (text: string) => void;
  emitTyping: (isTyping: boolean) => void;
  typingUsers: TypingUser[];
  formatDateDivider: (isoString: string) => string;
}

export const ChatSection: React.FC<ChatSectionProps> = React.memo(({
  chatLoading,
  messages,
  chatScrollContainerRef,
  chatEndRef,
  hasMore,
  loadingMore,
  loadMore,
  currentUser,
  retryMessage,
  editMessage,
  deleteMessage,
  sendMessage,
  emitTyping,
  typingUsers,
  formatDateDivider,
}) => {
  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-white flex-shrink-0">
        <h2 className="text-[18px] font-semibold text-black">Flat Group Chat</h2>
        <p className="text-[12px] text-mutedNavy mt-0.5">Realtime chat with flatmates</p>
      </div>

      {chatLoading && messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-navy border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div
          ref={chatScrollContainerRef}
          onScroll={(e) => {
            const target = e.currentTarget;
            if (target.scrollTop === 0 && hasMore && !loadingMore) {
              loadMore();
            }
          }}
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >
          {loadingMore && (
            <div className="text-center py-2">
              <span className="text-[12px] text-mutedNavy">Loading older messages...</span>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <MessageCircle size={44} className="text-sky" strokeWidth={1.75} />
              <h3 className="text-[18px] font-semibold text-black mt-3">No messages yet</h3>
              <p className="text-[14px] text-grayBlack mt-1">Start the conversation with your flatmates!</p>
            </div>
          ) : (
            messages.map((item, index) => {
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const isDifferentSender = !prevMsg || prevMsg.senderId !== item.senderId;
              const currentDate = formatDateDivider(item.createdAt);
              const prevDate = prevMsg ? formatDateDivider(prevMsg.createdAt) : null;
              const showDateDivider = currentDate && currentDate !== prevDate;

              return (
                <React.Fragment key={item.id}>
                  {showDateDivider && (
                    <div className="flex items-center justify-center my-3">
                      <span className="text-[10px] font-semibold text-mutedNavy bg-paleSky px-3 py-0.5 rounded-full">
                        {currentDate}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    message={item}
                    isCurrentUser={item.senderId === currentUser?.id}
                    showSenderHeader={isDifferentSender}
                    onRetry={retryMessage}
                    onEdit={editMessage}
                    onDelete={deleteMessage}
                  />
                </React.Fragment>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>
      )}

      {typingUsers.length > 0 && (
        <div className="px-4 py-1 bg-white flex-shrink-0">
          <span className="text-[12px] italic text-mutedNavy">
            {typingUsers.length === 1
              ? `${typingUsers[0].userName} is typing...`
              : typingUsers.length === 2
              ? `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`
              : `${typingUsers.length} people are typing...`}
          </span>
        </div>
      )}

      <div className="border-t border-border flex-shrink-0">
        <ChatInput
          onSend={sendMessage}
          onTyping={emitTyping}
        />
      </div>
    </div>
  );
});

ChatSection.displayName = "ChatSection";
