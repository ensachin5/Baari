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
      console.log("[Socket] Connected successfully with ID:", socket?.id);
      useSession.getState().setSocketConnected(true);
      const activeFlat = useSession.getState().activeFlat;
      if (activeFlat?.id) {
        console.log("[Socket] Joining flat room on connect:", activeFlat.id, "Socket ID:", socket?.id);
        socket?.emit("join_flat", { flatId: activeFlat.id });
      }
    });

    socket.io.on("reconnect", (attempt) => {
      console.log("[Socket] Reconnected successfully on attempt:", attempt, "Socket ID:", socket?.id);
      useSession.getState().setSocketConnected(true);
      const activeFlat = useSession.getState().activeFlat;
      if (activeFlat?.id) {
        console.log("[Socket] Re-joining flat room on reconnect:", activeFlat.id, "Socket ID:", socket?.id);
        socket?.emit("join_flat", { flatId: activeFlat.id });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      useSession.getState().setSocketConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.warn("[Socket] Connection error:", error.message);
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
      s.emit("join_flat", { flatId });
    } else {
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
