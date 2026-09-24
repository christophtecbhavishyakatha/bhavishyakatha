import cron from "node-cron";
import db from "../config/db.js";

export const callTimersCleanupJob = cron.schedule("0 0 * * *", async () => {
  try {
    console.log("🔄 Cleaning completed/expired call timers...");

    const [result] = await db.execute(`
      DELETE FROM call_timers
      WHERE status != 'ongoing'
    `);

    console.log(`✅ Deleted ${result.affectedRows || 0} call timer rows`);
  } catch (err) {
    console.error("❌ Call timer cleanup cron error:", err);
  }
});

// Auto-start cron when imported