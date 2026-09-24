import { Server } from "socket.io";
import redisSubscriber, {
  connectRedisSubscriber,
} from "../config/redisSubscriber.js";

export const initSocket = async (server) => {
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("Socket client connected:", socket.id);

    socket.on("chat:join", (payload = {}) => {
      const channelName = String(
        payload.channelName || payload.channel_name || ""
      ).trim();

      if (!channelName) {
        socket.emit("chat:error", { message: "channelName is required" });
        return;
      }

      console.log(
        `[CHAT SOCKET JOIN] socket=${socket.id} callId=${
          payload.callId ? String(payload.callId) : ""
        } room=${channelName}`
      );
      socket.join(channelName);
      socket.data.channelName = channelName;

      socket.emit("chat:joined", {
        channelName,
        callId: payload.callId ? String(payload.callId) : "",
      });
    });

    socket.on("chat:leave", (payload = {}) => {
      const channelName =
        String(payload.channelName || payload.channel_name || "").trim() ||
        socket.data.channelName;

      if (channelName) {
        console.log(`[CHAT SOCKET LEAVE] socket=${socket.id} room=${channelName}`);
        socket.leave(channelName);
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket client disconnected:", socket.id);
    });
  });

  await connectRedisSubscriber();

  await redisSubscriber.subscribe("astrologer_status", (message) => {
    const data = JSON.parse(message);
    io.emit("astrologer-status-update", data);
  });

  await redisSubscriber.subscribe("chat_events", (message) => {
    const data = JSON.parse(message);

    if (!data?.room || !data?.event) {
      return;
    }

    console.log(
      `[CHAT REDIS RELAY] topic=chat_events room=${data.room} event=${data.event} callId=${
        data?.payload?.callId || ""
      }`
    );
    io.to(data.room).emit(data.event, data.payload);
  });

  return io;
};
