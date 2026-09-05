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

let isWarmingUp = false;

// Pre-warm backend HTTP server before initiating WebSocket handshake
async function warmUpBackend(): Promise<void> {
  if (isWarmingUp) return;
  isWarmingUp = true;
  try {
    console.log('[Socket] Pinging backend /health-ping to warm up cold instance before socket handshake...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    const res = await fetch(`${API_BASE_URL}/health-ping`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    console.log('[Socket] Backend warm-up ping completed with status:', res.status);
  } catch (err: any) {
    console.warn('[Socket] Backend warm-up ping finished/aborted:', err?.message);
  } finally {
    isWarmingUp = false;
  }
}

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(API_BASE_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 60000, // 60s timeout to handle Render cold starts
      transports: ['websocket', 'polling'],
      upgrade: true,
      auth: (cb) => {
        resolveSocketToken().then((tok) => {
          cb({ token: tok || '' });
        });
      },
    });

    socket.on('connect', () => {
      console.log('[Socket] Event "connect" - Connected successfully. socketId:', socket?.id);
      useSession.getState().setSocketConnected(true);
      const activeFlat = useSession.getState().activeFlat;
      if (activeFlat?.id) {
        console.log('[Socket] [join_flat] Auto-joining flat room on connect. flatId:', activeFlat.id, 'socketId:', socket?.id);
        socket?.emit('join_flat', { flatId: activeFlat.id });
        console.log('[Socket] [join_flat] Emitted join_flat for flatId:', activeFlat.id);
      }
    });

    socket.io.on('reconnect', (attempt) => {
      console.log('[Socket] Event "reconnect" - Reconnected on attempt:', attempt, 'socketId:', socket?.id);
      useSession.getState().setSocketConnected(true);
      const activeFlat = useSession.getState().activeFlat;
      if (activeFlat?.id) {
        console.log('[Socket] [join_flat] Re-joining flat room on reconnect. flatId:', activeFlat.id, 'socketId:', socket?.id);
        socket?.emit('join_flat', { flatId: activeFlat.id });
        console.log('[Socket] [join_flat] Emitted join_flat for flatId:', activeFlat.id);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Event "disconnect" - Disconnected with reason:', reason, 'socketId:', socket?.id);
      useSession.getState().setSocketConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Event "connect_error" - Connection error:', error.message, error);
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
    console.log('[Socket] Initiating socket.connect(). Token present:', !!token);
    if (!API_BASE_URL.includes('localhost') && !API_BASE_URL.includes('127.0.0.1')) {
      warmUpBackend().catch(() => {});
    }
    s.connect();
  }
};

export const disconnectSocket = () => {
  if (socket) {
    console.log('[Socket] Explicitly disconnecting socket. socketId:', socket.id);
    socket.disconnect();
    socket = null;
    useSession.getState().setSocketConnected(false);
  }
};

export const joinFlatRoom = (flatId: string) => {
  const s = getSocket();
  if (flatId) {
    if (s.connected) {
      console.log('[Socket] [join_flat] Emitting join_flat for room:', flatId, 'socketId:', s.id);
      s.emit('join_flat', { flatId });
      console.log('[Socket] [join_flat] Emitted join_flat for room:', flatId);
    } else {
      console.log('[Socket] joinFlatRoom called while socket disconnected. Connecting first...');
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
