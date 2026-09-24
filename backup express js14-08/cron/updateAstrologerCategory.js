import cron from "node-cron";
import db from "../config/db.js";

export const updateAstrologerCategory = () => {
  cron.schedule(
    "45 0 * * *", // Every day at 12:45 AM
    async () => {
      console.log("?? Running astrologer category update...");

      const conn = await db.getConnection();

      try {
        await conn.beginTransaction();

        const [rows] = await conn.query(`
       SELECT
    a.id,
    a.rank,

    af.totalAudio,
    af.totalVideo,
    af.totalChat,

    COUNT(cr.id) AS total_calls,

    ROUND(
        IFNULL(SUM(cr.duration), 0) / 60,
        2
    ) AS total_minutes

FROM astrologers a

LEFT JOIN astrologer_fees af
       ON af.astrologer_id = a.id

LEFT JOIN call_requests cr
       ON cr.astrologer_id = a.id
      AND cr.status = 'completed'
      AND cr.started_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)

GROUP BY
    a.id,
    a.rank,
    af.totalAudio,
    af.totalVideo,
    af.totalChat;
        `);

        console.log(`Found ${rows.length} astrologers to evaluate`);

        for (const row of rows) {

          let category = "Expert";
          let commission = 40;

          const rank = Number(row.rank || 0);
          const calls = Number(row.total_calls || 0);
          const minutes = Number(row.total_minutes || 0);

          if (
            rank >= 4.5 &&
            calls >= 500 &&
            minutes >= 2500
          ) {
            category = "Elite";
            commission = 30;
          }
          else if (
            rank >= 4 &&
            calls >= 200 &&
            minutes >= 1000
          ) {
            category = "Pro";
            commission = 35;
          }

          // Audio
          const totalAudio = Number(row.totalAudio || 0);
          const audioPlatformFee = +(totalAudio * commission / 100).toFixed(2);
          const audioRate = +(totalAudio - audioPlatformFee).toFixed(2);

          // Video
          const totalVideo = Number(row.totalVideo || 0);
          const videoPlatformFee = +(totalVideo * commission / 100).toFixed(2);
          const videoRate = +(totalVideo - videoPlatformFee).toFixed(2);

          // Chat
          const totalChat = Number(row.totalChat || 0);
          const chatPlatformFee = +(totalChat * commission / 100).toFixed(2);
          const chatRate = +(totalChat - chatPlatformFee).toFixed(2);

          // Update category
          await conn.query(
            `
            UPDATE astrologers
            SET category = ?
            WHERE id = ?
            `,
            [category, row.id]
          );

          // Update fees
          await conn.query(
            `
            UPDATE astrologer_fees
            SET
                audio_call_rate = ?,
                audio_platform_fee = ?,
                audio_call_platform_commission = ?,

                video_call_rate = ?,
                video_platform_fee = ?,
                video_call_platform_commission = ?,

                chat_rate = ?,
                chat_platform_fee = ?,
                chat_platform_commission = ?

            WHERE astrologer_id = ?
            `,
            [
              audioRate,
              audioPlatformFee,
              commission,

              videoRate,
              videoPlatformFee,
              commission,

              chatRate,
              chatPlatformFee,
              commission,

              row.id
            ]
          );
        }

        await conn.commit();

        console.log(`? Successfully updated ${rows.length} astrologers`);

      } catch (err) {

        await conn.rollback();

        console.error("? Category cron failed:", err);

      } finally {

        conn.release();

      }

    },
    {
      timezone: "Asia/Kolkata",
    }
  );
};

export default updateAstrologerCategory;