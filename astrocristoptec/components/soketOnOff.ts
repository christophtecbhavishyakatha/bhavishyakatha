import { io, Socket } from "socket.io-client";

const SOCKET_URL = "https://bhavishyakatha.in";

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});
