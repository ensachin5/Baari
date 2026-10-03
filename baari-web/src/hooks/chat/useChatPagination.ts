"use client";

import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { ChatMessage } from "@/components/chat/MessageBubble";

interface UseChatPaginationProps {
  activeFlatId?: string | null;
}

export const useChatPagination = ({ activeFlatId }: UseChatPaginationProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!activeFlatId) return;
    try {
      setLoading(true);
      const data = await api.get<{
        messages: ChatMessage[];
        nextCursor: string | null;
      }>("/api/messages", {
        flatId: activeFlatId,
      });
      const fetched = (data.messages || [])
        .map((m) => ({ ...m, status: "sent" as const }))
        .reverse();
      setMessages(fetched);
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error("[useChatPagination] Error fetching message history:", error);
    } finally {
      setLoading(false);
    }
  }, [activeFlatId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const loadMore = useCallback(async () => {
    if (!activeFlatId || !nextCursor || loadingMore) return;
    try {
      setLoadingMore(true);
      const data = await api.get<{
        messages: ChatMessage[];
        nextCursor: string | null;
      }>("/api/messages", {
        flatId: activeFlatId,
        cursor: nextCursor,
      });
      const olderMessages = (data.messages || [])
        .map((m) => ({ ...m, status: "sent" as const }))
        .reverse();
      setMessages((prev) => [...olderMessages, ...prev]);
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error("[useChatPagination] Error loading more messages:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [activeFlatId, nextCursor, loadingMore]);

  return {
    messages,
    setMessages,
    loading,
    loadingMore,
    hasMore: !!nextCursor,
    loadMore,
  };
};
