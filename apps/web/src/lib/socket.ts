import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "@/store/session";

let socket: Socket | null = null;
let isWarmingUp = false;

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "";

// Pre-warm backend HTTP server before initiating WebSocket handshake
async function warmUpBackend(): Promise<void> {
  if (isWarmingUp) return;
  isWarmingUp = true;
  try {
    console.log('[Socket] Pinging backend /health-ping to warm up cold instance before socket handshake...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    const res = await fetch("/health-ping", {
      method: "GET",
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

let lastConnectErrorLog = 0;

function createStubSocket(): Socket {
  const listeners: Record<string, Set<Function>> = {};
  const stub: any = {
    connected: false,
    id: undefined,
    auth: {},
    connect: () => stub,
    disconnect: () => stub,
    on: (event: string, fn: Function) => {
      if (!listeners[event]) listeners[event] = new Set();
      listeners[event].add(fn);
      return stub;
    },
    off: (event: string, fn: Function) => {
      listeners[event]?.delete(fn);
      return stub;
    },
    emit: (event: string, ...args: any[]) => {
      const lastArg = args[args.length - 1];
      if (typeof lastArg === "function") {
        lastArg({ error: "No WebSocket server configured" });
      }
      return stub;
    },
    io: {
      on: () => stub.io,
      off: () => stub.io,
    },
  };
  return stub as Socket;
}

export const getSocket = (): Socket => {
  if (!SOCKET_URL) {
    if (!socket) {
      socket = createStubSocket();
    }
    return socket;
  }

  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
      timeout: 45000,
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
        socket?.emit("join_flat", { flatId: activeFlat.id });
      }
    });

    socket.io.on("reconnect", (attempt) => {
      console.log('[Socket] Event "reconnect" - Reconnected on attempt:', attempt, 'socketId:', socket?.id);
      useSession.getState().setSocketConnected(true);
      const activeFlat = useSession.getState().activeFlat;
      if (activeFlat?.id) {
        socket?.emit("join_flat", { flatId: activeFlat.id });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log('[Socket] Event "disconnect" - Disconnected with reason:', reason, 'socketId:', socket?.id);
      useSession.getState().setSocketConnected(false);
    });

    socket.on("connect_error", (error) => {
      const now = Date.now();
      if (now - lastConnectErrorLog > 10000) {
        lastConnectErrorLog = now;
        console.warn('[Socket] Connection attempt failed (will auto-retry):', error.message);
      }
      if (
        error.message === "Unauthorized" ||
        error.message === "Authentication failed"
      ) {
        console.warn('[Socket] Disconnecting unauthenticated socket until valid session is established.');
        socket?.disconnect();
      }
    });
  }

  return socket;
};

export const connectSocket = async () => {
  if (!SOCKET_URL) {
    return;
  }
  const token = useSession.getState().token;
  const s = getSocket();
  if (token) {
    s.auth = { token };
  }
  if (!s.connected) {
    console.log('[Socket] Initiating socket.connect(). Token present:', !!token);
    // Non-blocking pre-warm ping for cold start
    if (!SOCKET_URL.includes('localhost')) {
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
  if (!SOCKET_URL) return;
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
  const token = useSession((state) => state.token);
  const activeFlat = useSession((state) => state.activeFlat);
  const isHydrated = useSession((state) => state.isHydrated);

  useEffect(() => {
    if (!isHydrated) return;

    if (user && token) {
      connectSocket();
      if (activeFlat?.id) {
        joinFlatRoom(activeFlat.id);
      }
    } else if (!user) {
      disconnectSocket();
    }

    // Tab visibility change listener: pause socket when tab is hidden to preserve CPU & battery
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        console.log('[Socket] Document hidden (tab backgrounded). Disconnecting socket...');
        disconnectSocket();
      } else {
        console.log('[Socket] Document visible (tab active). Reconnecting socket...');
        const currentUser = useSession.getState().user;
        const currentToken = useSession.getState().token;
        if (currentUser && currentToken) {
          connectSocket();
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [user, token, activeFlat?.id, isHydrated]);

  return user ? getSocket() : null;
}
