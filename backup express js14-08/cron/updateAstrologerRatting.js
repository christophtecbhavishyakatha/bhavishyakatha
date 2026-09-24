import cron from "node-cron";
import db from "../config/db.js";

export const updateAstrologerRatting = () => { cron.schedule(
  "0 0 * * *", // every 24 hrs at midnight
  async () => {
    console.log("🕛 Running astrologer rank update cron...");

    try {
      const [rows] = await db.query(`
        SELECT 
          astrologer_id,
          ROUND(AVG(rating), 2) AS avg_rating
        FROM feedback_rating
        GROUP BY astrologer_id
        HAVING COUNT(*) > 10
      `);

      if (!rows || rows.length === 0) {
        console.log("ℹ️ No astrologers with >10 ratings");
        return;
      }

      for (const row of rows) {
        await db.query(
          `
          UPDATE astrologers
          SET rank = ?, rank_display = 1
          WHERE id = ?
          `,
          [row.avg_rating, row.astrologer_id]
        );
      }

      console.log(`✅ Updated rank for ${rows.length} astrologers`);
    } catch (error) {
      console.error("❌ Rank update cron failed:", error);
    }
  },
  {
    timezone: "Asia/Kolkata",
  }
);
}
export default updateAstrologerRatting;
