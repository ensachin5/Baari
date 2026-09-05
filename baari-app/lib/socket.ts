import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';
import { useSession } from '../store/session';

let socket: Socket | null = null;

export async function resolveSocketToken(): Promise<string | null> {
  let token = useSession.getState().token;
  if (!token && Platform.OS !== 'web') {
    try {
      token = await SecureStore.getItemAsync('baari_session_token');
    } catch (_) {}

    if (!token) {
      try {
        const rawCookie = await SecureStore.getItemAsync('baari_cookie');
        if (rawCookie) {
          const parsed = JSON.parse(rawCookie);
          for (const key of Object.keys(parsed)) {
            if (key.includes('session_token') && parsed[key]?.value) {
              token = parsed[key].value;
              break;
            }
          }
        }
      } catch (_) {}
    }
  }
  return token;
}

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(API_BASE_URL, {
      autoConnect: false,
      transports: ['polling', 'websocket'],
      upgrade: true,
      auth: (cb) => {
        resolveSocketToken().then((tok) => {
          cb({ token: tok || '' });
        });
      },
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected successfully with ID:', socket?.id);
      useSession.getState().setSocketConnected(true);
      const activeFlat = useSession.getState().activeFlat;
      if (activeFlat?.id) {
        console.log('[Socket] Joining flat room on connect:', activeFlat.id);
        socket?.emit('join_flat', { flatId: activeFlat.id });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      useSession.getState().setSocketConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.warn('[Socket] Connection error:', error.message);
      if (error.message === 'Unauthorized' || error.message === 'Authentication failed') {
        socket?.disconnect();
        return;
      }
    });
  }

  return socket;
};

export const connectSocket = async () => {
  const token = await resolveSocketToken();
  const s = getSocket();
  if (token) {
    s.auth = { token };
  }
  if (!s.connected) {
    console.log('[Socket] Initiating socket connection with token present:', !!token);
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
  if (flatId) {
    if (s.connected) {
      console.log('[Socket] Emitting join_flat room:', flatId);
      s.emit('join_flat', { flatId });
    } else {
      connectSocket();
    }
  }
};

/**
 * Custom hook to manage socket lifecycle on mount / unmount / auth change.
 * Connects when user is authenticated, joins flat room, and cleans up on unmount or logout.
 */
export function useSocket() {
  const token = useSession((state) => state.token);
  const user = useSession((state) => state.user);
  const activeFlat = useSession((state) => state.activeFlat);
  const isHydrated = useSession((state) => state.isHydrated);

  useEffect(() => {
    if (!isHydrated) return;

    let isMounted = true;
    const init = async () => {
      const resolvedToken = await resolveSocketToken();
      if (!isMounted) return;
      if (resolvedToken || user?.id) {
        await connectSocket();
        if (activeFlat?.id) {
          joinFlatRoom(activeFlat.id);
        }
      } else {
        disconnectSocket();
      }
    };
    init();

    return () => {
      isMounted = false;
    };
  }, [token, user?.id, activeFlat?.id, isHydrated]);

  return user?.id ? getSocket() : null;
}
