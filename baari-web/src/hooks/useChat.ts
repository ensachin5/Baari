"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "@/store/session";
import { getSocket } from "@/lib/socket";
import { api } from "@/lib/api";
import { ChatMessage } from "@/components/chat/MessageBubble";

export interface TypingUser {
  userId: string;
  userName: string;
}

/**
 * Mirrors baari-app/hooks/useChat.ts exactly.
 */
export const useChat = () => {
  const activeFlat = useSession((state) => state.activeFlat);
  const currentUser = useSession((state) => state.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial message history
  const fetchMessages = useCallback(async () => {
    if (!activeFlat?.id) return;
    try {
      setLoading(true);
      const data = await api.get<{
        messages: ChatMessage[];
        nextCursor: string | null;
      }>("/api/messages", {
        flatId: activeFlat.id,
      });
      const fetched = (data.messages || [])
        .map((m) => ({ ...m, status: "sent" as const }))
        .reverse();
      setMessages(fetched);
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error("[useChat] Error fetching message history:", error);
    } finally {
      setLoading(false);
    }
  }, [activeFlat?.id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Socket.io Realtime Listeners for new_message, user_typing, message_read
  useEffect(() => {
    if (!activeFlat?.id) return;

    const socket = getSocket();
    if (socket.connected) {
      socket.emit("join_flat", { flatId: activeFlat.id });
    }

    const handleNewMessage = (data: { message: ChatMessage }) => {
      if (data?.message) {
        const incoming = {
          ...data.message,
          status: "sent" as const,
          reads: data.message.reads || [],
        };
        setMessages((prev) => {
          const tempIdx = prev.findIndex(
            (m) =>
              m.status === "sending" &&
              m.content === incoming.content &&
              m.senderId === incoming.senderId
          );
          if (tempIdx !== -1) {
            const next = [...prev];
            next[tempIdx] = incoming;
            return next;
          }
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      }
    };

    const handleUserTyping = (data: {
      userId: string;
      userName: string;
      isTyping: boolean;
    }) => {
      if (!data?.userId || data.userId === currentUser?.id) return;
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
      if (!data?.messageId || !data?.userId) return;
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === data.messageId) {
            const existingReads = (msg as any).reads || [];
            if (!existingReads.some((r: any) => r.userId === data.userId)) {
              return {
                ...msg,
                reads: [
                  ...existingReads,
                  {
                    userId: data.userId,
                    userName: data.userName || "Flatmate",
                    userImage: data.userImage,
                  },
                ],
              };
            }
          }
          return msg;
        })
      );
    };

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("message_read", handleMessageRead);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("message_read", handleMessageRead);
    };
  }, [activeFlat?.id, currentUser?.id]);

  // Load older messages (pagination)
  const loadMore = useCallback(async () => {
    if (!activeFlat?.id || !nextCursor || loadingMore) return;
    try {
      setLoadingMore(true);
      const data = await api.get<{
        messages: ChatMessage[];
        nextCursor: string | null;
      }>("/api/messages", {
        flatId: activeFlat.id,
        cursor: nextCursor,
      });
      const olderMessages = (data.messages || [])
        .map((m) => ({ ...m, status: "sent" as const }))
        .reverse();
      setMessages((prev) => [...olderMessages, ...prev]);
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error("[useChat] Error loading more messages:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [activeFlat?.id, nextCursor, loadingMore]);

  // Emit typing indicator
  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (!activeFlat?.id) return;
      const socket = getSocket();
      socket.emit("typing", { flatId: activeFlat.id, isTyping });

      if (isTyping) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit("typing", { flatId: activeFlat.id, isTyping: false });
        }, 3000);
      }
    },
    [activeFlat?.id]
  );

  // Optimistic message send with Socket.io (with 5s ack timeout) & REST fallback
  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeFlat?.id || !currentUser?.id || !content.trim()) return;

      emitTyping(false);
      const trimmed = content.trim();
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: ChatMessage = {
        id: tempId,
        flatId: activeFlat.id,
        senderId: currentUser.id,
        content: trimmed,
        createdAt: new Date().toISOString(),
        status: "sending",
        sender: {
          id: currentUser.id,
          name: currentUser.name || "You",
          image: currentUser.image,
        },
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      const socket = getSocket();
      console.log(
        `[useChat] Attempting send_message. Socket connected: ${socket.connected}, socketId: ${socket.id}, flatId: ${activeFlat.id}`
      );

      let sentViaSocket = false;

      if (socket.connected) {
        try {
          // Emit with 5-second ack timeout
          const socketPromise = new Promise<{
            success?: boolean;
            message?: ChatMessage;
            error?: string;
          }>((resolve, reject) => {
            const timeoutTimer = setTimeout(() => {
              reject(
                new Error("Socket send_message acknowledgment timed out after 5000ms")
              );
            }, 5000);

            socket.emit(
              "send_message",
              { flatId: activeFlat.id, content: trimmed },
              (ack: any) => {
                clearTimeout(timeoutTimer);
                resolve(ack || {});
              }
            );
          });

          const response = await socketPromise;
          if (response?.error) {
            console.warn(
              "[useChat] Socket send returned error from server:",
              response.error
            );
          } else if (response?.message) {
            console.log(
              "[useChat] Message sent successfully via Socket.io ack:",
              response.message.id
            );
            sentViaSocket = true;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId
                  ? { ...response.message!, status: "sent" as const }
                  : m
              )
            );
          }
        } catch (socketErr: any) {
          console.warn(
            "[useChat] Socket send timed out or threw error:",
            socketErr?.message
          );
        }
      }

      // If socket wasn't connected or socket emit failed/timed out, execute REST fallback
      if (!sentViaSocket) {
        console.log("[useChat] Executing REST POST /api/messages fallback...");
        try {
          const data = await api.post<{ message: ChatMessage }>(
            "/api/messages",
            {
              flatId: activeFlat.id,
              content: trimmed,
            }
          );
          if (data?.message) {
            console.log(
              "[useChat] Message sent successfully via REST fallback:",
              data.message.id
            );
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId
                  ? { ...data.message, status: "sent" as const }
                  : m
              )
            );
          }
        } catch (restErr: any) {
          console.error(
            "[useChat] REST send fallback also failed:",
            restErr?.message || restErr
          );
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m))
          );
        }
      }
    },
    [activeFlat?.id, currentUser, emitTyping]
  );

  const retryMessage = useCallback(
    async (msg: ChatMessage) => {
      console.log("[useChat] Retrying failed message:", msg.id);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      await sendMessage(msg.content);
    },
    [sendMessage]
  );

  const markReadUpTo = useCallback(
    async (messageId: string) => {
      if (!activeFlat?.id || !messageId || messageId.startsWith("temp-")) return;
      try {
        await api.post("/api/messages/read-up-to", { messageId });
      } catch (_) {}
    },
    [activeFlat?.id]
  );

  return {
    messages,
    loading,
    loadingMore,
    hasMore: Boolean(nextCursor),
    typingUsers,
    sendMessage,
    retryMessage,
    emitTyping,
    markReadUpTo,
    loadMore,
  };
};
