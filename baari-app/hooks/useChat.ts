import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from '../store/session';
import { getSocket } from '../lib/socket';
import { ChatMessage } from '../components/chat/MessageBubble';

export const useChat = () => {
  const activeFlat = useSession((state) => state.activeFlat);
  const currentUser = useSession((state) => state.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeFlat?.id) return;

    const socket = getSocket();
    socket.emit('join_flat', { flatId: activeFlat.id });

    const handleNewMessage = (data: { message: ChatMessage }) => {
      if (data?.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [activeFlat?.id]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!activeFlat?.id || !currentUser?.id || !content.trim()) return;

      const socket = getSocket();
      socket.emit('send_message', {
        flatId: activeFlat.id,
        senderId: currentUser.id,
        content: content.trim(),
      });
    },
    [activeFlat?.id, currentUser?.id]
  );

  return {
    messages,
    loading,
    sendMessage,
  };
};
