import { io, Socket } from "socket.io-client";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

let socket: Socket | null = null;
let socketToken: string | null = null;
let debugListenersBound = false;
let offlineHandlersBound = false;

// Check if we're in the browser
const isBrowser = typeof window !== "undefined";

export function connectSocket(token: string): Socket {
  if (!BASE_URL) {
    throw new Error("Error in configuration: URL is not defined");
  }

  if (!socket) {
    socket = io(BASE_URL, {
      path: "/realtime",
      transports: ["polling", "websocket"],
      autoConnect: false,
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 5000,
      upgrade: false,
    });
  }

  if (token && socketToken !== token) {
    socket.auth = { token };
    socketToken = token;
  }

  if (!debugListenersBound) {
    socket.on("connect_error", () => {
      // Real-time updates are optional; avoid noisy console errors when the
      // backend does not support the preferred transport.
    });
    debugListenersBound = true;
  }

  // Bind offline/online handlers only once and only in browser
  if (isBrowser && !offlineHandlersBound) {
    const handleOffline = () => {
      if (socket) {
        socket.disconnect();
        // Don't attempt to reconnect until online
        socket.io.opts.reconnection = false;
      }
    };

    const handleOnline = () => {
      if (socket) {
        socket.io.opts.reconnection = true;
        socket.connect();
        if (socketToken) {
          refreshSocketAuth(socketToken);
        }
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    offlineHandlersBound = true;
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function refreshSocketAuth(token: string) {
  if (!socket) return;
  socket.auth = { token };
  socketToken = token;
  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  socketToken = null;
  debugListenersBound = false;
  offlineHandlersBound = false;
}

// Optional: Export a cleanup function if you need to remove event listeners
export function cleanupSocketListeners() {
  if (isBrowser && offlineHandlersBound) {
    // Note: You'd need to store references to the handlers to remove them
    // For now, this is a placeholder if you need it
    offlineHandlersBound = false;
  }
}
