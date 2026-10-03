"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useSession } from "@/store/session";
import { getSocket } from "@/lib/socket";
import { ChatMessage } from "@/components/chat/MessageBubble";

export interface TypingUser {
  userId: string;
  userName: string;
}

interface UseChatSocketProps {
  activeFlatId?: string | null;
  currentUserId?: string | null;
  onNewMessage: (message: ChatMessage) => void;
  onMessageEdited: (data: { messageId: string; content: string; editedAt: string }) => void;
  onMessageDeleted: (data: { messageId: string; deletedAt: string }) => void;
  onMessageRead: (data: { userId: string; messageId: string; userName?: string; userImage?: string }) => void;
}

export const useChatSocket = ({
  activeFlatId,
  currentUserId,
  onNewMessage,
  onMessageEdited,
  onMessageDeleted,
  onMessageRead,
}: UseChatSocketProps) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    if (!activeFlatId) return;

    const flatId = activeFlatId;
    const socket = getSocket();

    if (!socket.connected) {
      const token = useSession.getState().token;
      if (token) {
        socket.auth = { token };
      }
      socket.connect();
    }

    const joinRoom = () => {
      socket.emit("join_flat", { flatId });
    };

    if (socket.connected) {
      joinRoom();
    }

    socket.on("connect", joinRoom);

    const handleNewMessage = (data: { message: ChatMessage }) => {
      if (data?.message) {
        if (data.message.flatId && data.message.flatId !== flatId) return;
        onNewMessage(data.message);
      }
    };

    const handleUserTyping = (data: {
      userId: string;
      userName: string;
      isTyping: boolean;
    }) => {
      if (!data?.userId || data.userId === currentUserIdRef.current) return;
      setTypingUsers((prev) => {
        if (data.isTyping) {
          if (prev.some((u) => u.userId === data.userId)) return prev;
          return [...prev, { userId: data.userId, userName: data.userName }];
        } else {
          return prev.filter((u) => u.userId !== data.userId);
        }
      });
    };

    const handleMessageRead = (data: {
      userId: string;
      messageId: string;
      userName?: string;
      userImage?: string;
    }) => {
      if (data?.messageId && data?.userId) {
        onMessageRead(data);
      }
    };

    const handleEdited = (data: { messageId: string; content: string; editedAt: string }) => {
      if (data?.messageId) onMessageEdited(data);
    };

    const handleDeleted = (data: { messageId: string; deletedAt: string }) => {
      if (data?.messageId) onMessageDeleted(data);
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_edited", handleEdited);
    socket.on("message_deleted", handleDeleted);
    socket.on("user_typing", handleUserTyping);
    socket.on("message_read", handleMessageRead);

    return () => {
      socket.off("connect", joinRoom);
      socket.off("new_message", handleNewMessage);
      socket.off("message_edited", handleEdited);
      socket.off("message_deleted", handleDeleted);
      socket.off("user_typing", handleUserTyping);
      socket.off("message_read", handleMessageRead);
    };
  }, [activeFlatId, onNewMessage, onMessageEdited, onMessageDeleted, onMessageRead]);

  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (!activeFlatId) return;
      const socket = getSocket();
      socket.emit("typing", { flatId: activeFlatId, isTyping });

      if (isTyping) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit("typing", { flatId: activeFlatId, isTyping: false });
        }, 3000);
      }
    },
    [activeFlatId]
  );

  return {
    typingUsers,
    emitTyping,
  };
};
