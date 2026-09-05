import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "./api";
import { useSession } from "@/store/session";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(API_BASE_URL, {
      autoConnect: false,
      transports: ["polling", "websocket"],
      withCredentials: true,
      upgrade: true,
      auth: (cb) => {
        const token = useSession.getState().token;
        cb({ token: token || "" });
      },
    });

    socket.on("connect", () => {
      console.log('[Socket] Event "connect" - Connected successfully. socketId:', socket?.id);
      useSession.getState().setSocketConnected(true);
      const activeFlat = useSession.getState().activeFlat;
      if (activeFlat?.id) {
        console.log('[Socket] [join_flat] Auto-joining flat room on connect. flatId:', activeFlat.id, 'socketId:', socket?.id);
        socket?.emit("join_flat", { flatId: activeFlat.id });
        console.log('[Socket] [join_flat] Emitted join_flat for flatId:', activeFlat.id);
      }
    });

    socket.io.on("reconnect", (attempt) => {
      console.log('[Socket] Event "reconnect" - Reconnected on attempt:', attempt, 'socketId:', socket?.id);
      useSession.getState().setSocketConnected(true);
      const activeFlat = useSession.getState().activeFlat;
      if (activeFlat?.id) {
        console.log('[Socket] [join_flat] Re-joining flat room on reconnect. flatId:', activeFlat.id, 'socketId:', socket?.id);
        socket?.emit("join_flat", { flatId: activeFlat.id });
        console.log('[Socket] [join_flat] Emitted join_flat for flatId:', activeFlat.id);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log('[Socket] Event "disconnect" - Disconnected with reason:', reason, 'socketId:', socket?.id);
      useSession.getState().setSocketConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error('[Socket] Event "connect_error" - Connection error:', error.message, error);
      if (
        error.message === "Unauthorized" ||
        error.message === "Authentication failed"
      ) {
        socket?.disconnect();
      }
    });
  }

  return socket;
};

export const connectSocket = () => {
  const token = useSession.getState().token;
  const s = getSocket();
  if (token) {
    s.auth = { token };
  }
  if (!s.connected) {
    console.log('[Socket] Initiating socket.connect(). Token present:', !!token);
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
      s.emit("join_flat", { flatId });
      console.log('[Socket] [join_flat] Emitted join_flat for room:', flatId);
    } else {
      console.log('[Socket] joinFlatRoom called while socket disconnected. Connecting first...');
      connectSocket();
    }
  }
};

export function useSocket() {
  const user = useSession((state) => state.user);
  const activeFlat = useSession((state) => state.activeFlat);
  const isHydrated = useSession((state) => state.isHydrated);

  useEffect(() => {
    if (!isHydrated) return;

    if (user) {
      connectSocket();
      if (activeFlat?.id) {
        joinFlatRoom(activeFlat.id);
      }
    } else {
      disconnectSocket();
    }
  }, [user, activeFlat?.id, isHydrated]);

  return user ? getSocket() : null;
}
