import cron from "node-cron";
import db from "../config/db.js";

export const pendingRequestTimeoutJob = cron.schedule("*/5 * * * *", async () => {
  try {
    console.log("🔄 Checking pending requests for timeout...");

    const threshold = new Date(Date.now() - 28 * 60 * 1000);

    const [result] = await db.execute(
      `UPDATE call_requests
       SET status = 'timeout'
       WHERE status = 'pending'
       AND created_at <= ?`,
      [threshold]
    );

    console.log(`✅ Timed out ${result.affectedRows || 0} requests`);
  } catch (err) {
    console.error("❌ Cron job error:", err);
  }
});

// Auto-start cron when imported
