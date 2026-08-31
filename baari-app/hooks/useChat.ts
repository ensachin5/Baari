import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from '../store/session';
import { getSocket } from '../lib/socket';
import { api } from '../lib/api';
import { ChatMessage } from '../components/chat/MessageBubble';

export interface TypingUser {
  userId: string;
  userName: string;
}

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
      const data = await api.get<{ messages: ChatMessage[]; nextCursor: string | null }>('/api/messages', {
        flatId: activeFlat.id,
      });
      const fetched = (data.messages || []).map((m) => ({ ...m, status: 'sent' as const })).reverse();
      setMessages(fetched);
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error('[useChat] Error fetching message history:', error);
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
      socket.emit('join_flat', { flatId: activeFlat.id });
    }

    const handleNewMessage = (data: { message: ChatMessage }) => {
      if (data?.message) {
        const incoming = { ...data.message, status: 'sent' as const, reads: data.message.reads || [] };
        setMessages((prev) => {
          const tempIdx = prev.findIndex(
            (m) => m.status === 'sending' && m.content === incoming.content && m.senderId === incoming.senderId
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

    const handleUserTyping = (data: { userId: string; userName: string; isTyping: boolean }) => {
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

    const handleMessageRead = (data: { userId: string; messageId: string; userName?: string; userImage?: string }) => {
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
                  { userId: data.userId, userName: data.userName || 'Flatmate', userImage: data.userImage },
                ],
              };
            }
          }
          return msg;
        })
      );
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('message_read', handleMessageRead);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('message_read', handleMessageRead);
    };
  }, [activeFlat?.id, currentUser?.id]);

  // Load older messages (pagination)
  const loadMore = useCallback(async () => {
    if (!activeFlat?.id || !nextCursor || loadingMore) return;
    try {
      setLoadingMore(true);
      const data = await api.get<{ messages: ChatMessage[]; nextCursor: string | null }>('/api/messages', {
        flatId: activeFlat.id,
        cursor: nextCursor,
      });
      const olderMessages = (data.messages || []).map((m) => ({ ...m, status: 'sent' as const })).reverse();
      setMessages((prev) => [...olderMessages, ...prev]);
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error('[useChat] Error loading more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [activeFlat?.id, nextCursor, loadingMore]);

  // Emit typing indicator
  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (!activeFlat?.id) return;
      const socket = getSocket();
      socket.emit('typing', { flatId: activeFlat.id, isTyping });

      if (isTyping) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('typing', { flatId: activeFlat.id, isTyping: false });
        }, 3000);
      }
    },
    [activeFlat?.id]
  );

  // Mark read up to message
  const markReadUpTo = useCallback(
    async (messageId: string) => {
      if (!activeFlat?.id || !messageId) return;
      try {
        await api.post('/api/messages/read-up-to', { messageId });
      } catch (_) {}
    },
    [activeFlat?.id]
  );

  // Optimistic message send
  const sendMessage = useCallback(
    (content: string) => {
      if (!activeFlat?.id || !currentUser?.id || !content.trim()) return;

      emitTyping(false);
      const trimmed = content.trim();
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const tempMessage: ChatMessage = {
        id: tempId,
        flatId: activeFlat.id,
        senderId: currentUser.id,
        content: trimmed,
        createdAt: new Date().toISOString(),
        status: 'sending',
        sender: {
          id: currentUser.id,
          name: currentUser.name,
          image: currentUser.image,
        },
      };

      setMessages((prev) => [...prev, tempMessage]);

      const socket = getSocket();
      socket.emit(
        'send_message',
        {
          flatId: activeFlat.id,
          content: trimmed,
        },
        (response: any) => {
          if (response?.error) {
            console.error('[useChat] Failed to send message:', response.error);
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
            );
          } else if (response?.message) {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? { ...response.message, status: 'sent' } : m))
            );
          }
        }
      );
    },
    [activeFlat?.id, currentUser, emitTyping]
  );

  const retryMessage = useCallback(
    (tempMsg: ChatMessage) => {
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      sendMessage(tempMsg.content);
    },
    [sendMessage]
  );

  return {
    messages,
    loading,
    loadingMore,
    hasMore: !!nextCursor,
    typingUsers,
    sendMessage,
    retryMessage,
    emitTyping,
    markReadUpTo,
    loadMore,
  };
};
