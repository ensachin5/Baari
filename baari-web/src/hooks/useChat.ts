"use client";

import { useCallback, useRef } from "react";
import { useSession } from "@/store/session";
import { getSocket } from "@/lib/socket";
import { api } from "@/lib/api";
import { ChatMessage } from "@/components/chat/MessageBubble";
import { useChatSocket, TypingUser } from "./chat/useChatSocket";
import { useChatPagination } from "./chat/useChatPagination";

export type { TypingUser };

export const useChat = () => {
  const activeFlat = useSession((state) => state.activeFlat);
  const currentUser = useSession((state) => state.user);

  const {
    messages,
    setMessages,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  } = useChatPagination({ activeFlatId: activeFlat?.id });

  const pendingOpsRef = useRef<Map<string, { action: "edit"; content: string } | { action: "delete" }>>(new Map());
  const sendingTempMsgsRef = useRef<{ tempId: string; originalContent: string }[]>([]);

  const processConfirmedMessage = useCallback(
    (tempId: string, confirmedMsg: ChatMessage): ChatMessage => {
      const pendingOp = pendingOpsRef.current.get(tempId);
      const finalMsg: ChatMessage = { ...confirmedMsg, status: "sent" as const };

      if (pendingOp) {
        pendingOpsRef.current.delete(tempId);
        if (pendingOp.action === "edit") {
          finalMsg.content = pendingOp.content;
          finalMsg.editedAt = new Date().toISOString();
          api.patch(`/api/messages/${confirmedMsg.id}`, { content: pendingOp.content }).catch((err) => {
            console.error("[useChat] Failed executing queued edit for confirmed message:", err);
          });
        } else if (pendingOp.action === "delete") {
          finalMsg.content = "";
          finalMsg.deletedAt = new Date().toISOString();
          api.delete(`/api/messages/${confirmedMsg.id}`).catch((err) => {
            console.error("[useChat] Failed executing queued delete for confirmed message:", err);
          });
        }
      }
      return finalMsg;
    },
    []
  );

  const markReadUpTo = useCallback(
    async (messageId: string) => {
      if (!activeFlat?.id || !messageId || messageId.startsWith("temp")) return;
      try {
        await api.post("/api/messages/read-up-to", { messageId });
      } catch (_) {}
    },
    [activeFlat?.id]
  );

  const handleNewMessage = useCallback(
    (incomingMsg: ChatMessage) => {
      const incoming = {
        ...incomingMsg,
        status: "sent" as const,
        reads: incomingMsg.reads || [],
      };

      setMessages((prev) => {
        let tempIdx = -1;
        let matchedTempId = "";

        const itemIdx = sendingTempMsgsRef.current.findIndex(
          (item) => item.originalContent === incoming.content
        );
        if (itemIdx !== -1) {
          matchedTempId = sendingTempMsgsRef.current[itemIdx].tempId;
          sendingTempMsgsRef.current.splice(itemIdx, 1);
          tempIdx = prev.findIndex((m) => m.id === matchedTempId);
        }

        if (tempIdx === -1) {
          tempIdx = prev.findIndex(
            (m) =>
              m.status === "sending" &&
              m.senderId === incoming.senderId &&
              (m.content === incoming.content || pendingOpsRef.current.has(m.id))
          );
          if (tempIdx !== -1) {
            matchedTempId = prev[tempIdx].id;
          }
        }

        if (tempIdx !== -1 && matchedTempId) {
          const next = [...prev];
          next[tempIdx] = processConfirmedMessage(matchedTempId, incoming);
          return next;
        }

        if (prev.some((m) => m.id === incoming.id)) {
          return prev;
        }

        return [...prev, incoming];
      });

      if (incoming.senderId !== currentUser?.id) {
        markReadUpTo(incoming.id);
      }
    },
    [currentUser?.id, markReadUpTo, processConfirmedMessage, setMessages]
  );

  const handleMessageEdited = useCallback((data: { messageId: string; content: string; editedAt: string }) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === data.messageId
          ? { ...msg, content: data.content, editedAt: data.editedAt }
          : msg
      )
    );
  }, [setMessages]);

  const handleMessageDeleted = useCallback((data: { messageId: string; deletedAt: string }) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === data.messageId
          ? { ...msg, content: "", deletedAt: data.deletedAt }
          : msg
      )
    );
  }, [setMessages]);

  const handleMessageRead = useCallback((data: { userId: string; messageId: string; userName?: string; userImage?: string }) => {
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
  }, [setMessages]);

  const { typingUsers, emitTyping } = useChatSocket({
    activeFlatId: activeFlat?.id,
    currentUserId: currentUser?.id,
    onNewMessage: handleNewMessage,
    onMessageEdited: handleMessageEdited,
    onMessageDeleted: handleMessageDeleted,
    onMessageRead: handleMessageRead,
  });

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      const trimmed = newContent.trim();
      if (!messageId || !trimmed) return;

      const editedAt = new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, content: trimmed, editedAt } : m
        )
      );

      if (messageId.startsWith("temp")) {
        pendingOpsRef.current.set(messageId, { action: "edit", content: trimmed });
        return;
      }

      try {
        await api.patch(`/api/messages/${messageId}`, { content: trimmed });
      } catch (err) {
        console.error("[useChat] Failed to edit message:", err);
      }
    },
    [setMessages]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!messageId) return;

      const deletedAt = new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, content: "", deletedAt } : m
        )
      );

      if (messageId.startsWith("temp")) {
        pendingOpsRef.current.set(messageId, { action: "delete" });
        return;
      }

      try {
        await api.delete(`/api/messages/${messageId}`);
      } catch (err) {
        console.error("[useChat] Failed to delete message:", err);
      }
    },
    [setMessages]
  );

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

      sendingTempMsgsRef.current.push({
        tempId,
        originalContent: trimmed,
      });

      setMessages((prev) => [...prev, optimisticMsg]);

      const socket = getSocket();
      let isAcked = false;

      const emitTimeout = setTimeout(() => {
        if (!isAcked) {
          console.warn("[useChat] Socket emit ack timed out (5s), using REST fallback");
          api
            .post<{ message: ChatMessage }>("/api/messages", {
              flatId: activeFlat.id,
              content: trimmed,
            })
            .then((res) => {
              if (res?.message) {
                const confirmed = processConfirmedMessage(tempId, res.message);
                setMessages((prev) =>
                  prev.map((m) => (m.id === tempId ? confirmed : m))
                );
              }
            })
            .catch((err) => {
              console.error("[useChat] REST fallback failed:", err);
              setMessages((prev) =>
                prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m))
              );
            });
        }
      }, 5000);

      try {
        socket.emit(
          "send_message",
          { flatId: activeFlat.id, content: trimmed },
          (response: { success: boolean; message?: ChatMessage; error?: string }) => {
            isAcked = true;
            clearTimeout(emitTimeout);

            if (response?.success && response.message) {
              const confirmed = processConfirmedMessage(tempId, response.message);
              setMessages((prev) =>
                prev.map((m) => (m.id === tempId ? confirmed : m))
              );
            } else {
              console.error("[useChat] Socket send_message ack error:", response?.error);
              setMessages((prev) =>
                prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m))
              );
            }
          }
        );
      } catch (err) {
        clearTimeout(emitTimeout);
        console.error("[useChat] Exception emitting send_message socket event:", err);
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m))
        );
      }
    },
    [activeFlat?.id, currentUser, emitTyping, processConfirmedMessage, setMessages]
  );

  const retryMessage = useCallback(
    async (tempMsg: ChatMessage) => {
      if (!activeFlat?.id || !tempMsg?.content) return;

      setMessages((prev) =>
        prev.map((m) => (m.id === tempMsg.id ? { ...m, status: "sending" } : m))
      );

      try {
        const res = await api.post<{ message: ChatMessage }>("/api/messages", {
          flatId: activeFlat.id,
          content: tempMsg.content,
        });

        if (res?.message) {
          const confirmed = processConfirmedMessage(tempMsg.id, res.message);
          setMessages((prev) =>
            prev.map((m) => (m.id === tempMsg.id ? confirmed : m))
          );
        }
      } catch (err) {
        console.error("[useChat] Retry message failed:", err);
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMsg.id ? { ...m, status: "failed" } : m))
        );
      }
    },
    [activeFlat?.id, processConfirmedMessage, setMessages]
  );

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    typingUsers,
    sendMessage,
    retryMessage,
    editMessage,
    deleteMessage,
    emitTyping,
    markReadUpTo,
    loadMore,
  };
};
