import { createClient } from "redis";

const redisClient = createClient({
url: "redis://127.0.0.1:6379",
});

redisClient.on("error", (err) => {
  console.error("❌ Redis Client Error:", err.message);
});

redisClient.on("connect", () => {
  console.log("✅ Redis client connected");
});

redisClient.on("ready", () => {
  console.log("🟢 Redis is ready to use");
});

redisClient.on("end", () => {
  console.log("⚠️ Redis connection closed");
});

// Connect and test
async function testRedis() {
  try {
    await redisClient.connect();

    // Test ping
    const pong = await redisClient.ping();
    console.log("💬 Redis PING response:", pong); // Should print PONG
  } catch (err) {
    console.error("❌ Failed to connect to Redis:", err.message);
  }
}

testRedis();

export default redisClient;
