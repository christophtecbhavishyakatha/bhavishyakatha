import { createClient } from "redis";

const redisSubscriber = createClient({
url: "redis://127.0.0.1:6379",
  socket: {
    reconnectStrategy: (retries) => {
      console.log("🔁 Redis reconnect attempt:", retries);
      return Math.min(retries * 100, 3000);
    },
  },
});

redisSubscriber.on("connect", () => {
  console.log("🟡 Redis subscriber connecting...");
});

redisSubscriber.on("ready", () => {
  console.log("🟢 Redis subscriber ready");
});

redisSubscriber.on("end", () => {
  console.log("🔴 Redis subscriber connection closed");
});

redisSubscriber.on("error", (err) => {
  console.error("❌ Redis Subscriber Error:", err.message);
});

/**
 * Connect Redis subscriber (call once at server startup)
 */
export const connectRedisSubscriber = async () => {
  if (!redisSubscriber.isOpen) {
    await redisSubscriber.connect();
    console.log("🟢 Redis subscriber connected");
  }
};

export default redisSubscriber;
