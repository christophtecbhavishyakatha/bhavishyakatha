import cron from "node-cron";
import db from "../config/db.js";
import redisClient from "../config/redis.js";

export const startAutoOfflineCron = () => {
    
  cron.schedule("*/5 * * * *", async () => {
    try {
      console.log("[CRON] Checking inactive astrologers...");

      // 1️⃣ Find astrologers to auto-offline
      const [rows] = await db.query(`
        SELECT astrologer_id
        FROM astrologer_status
        WHERE
          status NOT IN ('offline')
          AND last_seen < NOW() - INTERVAL 300 MINUTE
      `);

      if (rows.length === 0) {
        console.log("[CRON] No astrologers to auto-offline");
        return;
      }

      // 2️⃣ Update DB
      await db.query(`
        UPDATE astrologer_status
        SET
          status = 'offline',
          audio_call = 0,
          video_call = 0,
          chat = 0
        WHERE
          status NOT IN ('offline')
          AND last_seen < NOW() - INTERVAL 300 MINUTE
      `);

      // 3️⃣ Fire Redis for EACH astrologer
      for (const row of rows) {
        const payload = JSON.stringify({
          astrologer_id: String(row.astrologer_id),
          status: "offline",
          audio: false,
          video: false,
          chat: false,
          updated_at: new Date().toISOString(),
        });

        await redisClient.publish("astrologer_status", payload);
      }

      console.log(`[CRON] Auto-offlined & published ${rows.length} astrologer(s)`);

    } catch (err) {
      console.error("[CRON] Auto-offline failed:", err);
    }
  });
};
