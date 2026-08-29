import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';
import { useSession } from '../store/session';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(API_BASE_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
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
  }

  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinFlatRoom = (flatId: string) => {
  const s = getSocket();
  if (s.connected) {
    s.emit('join_flat', { flatId });
  }
};
