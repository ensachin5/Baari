import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';
import { useSession } from '../store/session';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const token = useSession.getState().token;

    socket = io(API_BASE_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: {
        token: token || '',
      },
    });

    socket.on('connect', () => {
      useSession.getState().setSocketConnected(true);
      const activeFlat = useSession.getState().activeFlat;
      if (activeFlat?.id) {
        socket?.emit('join_flat', { flatId: activeFlat.id });
      }
    });

    socket.on('disconnect', () => {
      useSession.getState().setSocketConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.warn('[Socket] Connection error:', error.message);
    });
  }

  return socket;
};

export const connectSocket = () => {
  const token = useSession.getState().token;
  if (!token) return;

  const s = getSocket();

  // Update auth token payload in case it refreshed or changed
  if (s.auth && typeof s.auth === 'object') {
    (s.auth as Record<string, any>).token = token;
  }

  if (!s.connected) {
    s.connect();
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    useSession.getState().setSocketConnected(false);
  }
};

export const joinFlatRoom = (flatId: string) => {
  const s = getSocket();
  if (s.connected && flatId) {
    s.emit('join_flat', { flatId });
  }
};

/**
 * Custom hook to manage socket lifecycle on mount / unmount / auth change.
 * Connects when user is authenticated, joins flat room, and cleans up on unmount or logout.
 */
export function useSocket() {
  const token = useSession((state) => state.token);
  const activeFlat = useSession((state) => state.activeFlat);
  const isHydrated = useSession((state) => state.isHydrated);

  useEffect(() => {
    if (!isHydrated) return;

    if (token) {
      connectSocket();
      if (activeFlat?.id) {
        joinFlatRoom(activeFlat.id);
      }
    } else {
      disconnectSocket();
    }
  }, [token, activeFlat?.id, isHydrated]);

  return getSocket();
}
