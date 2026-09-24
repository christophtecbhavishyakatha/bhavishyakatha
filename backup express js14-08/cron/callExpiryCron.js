import cron from "node-cron";
import db from "../config/db.js";
import redisClient from "../config/redis.js";
import { forceRemoveUser } from "../services/agoraForceRemove.js";
import { archiveChatMessages } from "../services/chatArchive.service.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const startCallExpiryCron = () => {
  cron.schedule("*/5 * * * * *", async () => {
    let connection;

    try {
      connection = await db.getConnection();

      const [calls] = await connection.execute(
        `SELECT
            ct.call_id,
            ct.customer_id,
            ct.astrologer_id,
            ct.call_type,
            ct.user_uid,
            ct.astrologer_uid,
            cr.channel_name,
            cr.started_at,
            cr.max_duration_sec
         FROM call_timers ct
         JOIN call_requests cr ON cr.id = ct.call_id
         WHERE ct.status = 'ongoing'
           AND ct.expires_at <= NOW()`
      );

      connection.release();

      if (calls.length === 0) return;

      for (const call of calls) {
        const conn = await db.getConnection();

        try {
          if (call.call_type !== "chat") {
            try {
              await forceRemoveUser({
                channelName: call.channel_name,
                uid: call.user_uid,
              });
            } catch (err) {
              console.log(`User ${call.user_uid} already left or removal failed`);
            }

            await sleep(1000);

            try {
              await forceRemoveUser({
                channelName: call.channel_name,
                uid: call.astrologer_uid,
              });
            } catch (err) {
              console.log(`Astrologer ${call.astrologer_uid} already left or removal failed`);
            }
          } else {
            console.log(`Chat ${call.call_id} reached max duration and will be closed`);
          }

          await conn.beginTransaction();

          const startTime = new Date(call.started_at);
          const endTime = new Date();

          let durationSec = Math.max(
            0,
            Math.floor((endTime - startTime) / 1000)
          );

          durationSec = Math.min(durationSec, call.max_duration_sec);

          const durationMin = Math.ceil(durationSec / 60);

          const [[fees]] = await conn.execute(
            `SELECT
                audio_call_rate,
                audio_platform_fee,
                video_call_rate,
                video_platform_fee,
                chat_rate,
                chat_platform_fee
             FROM astrologer_fees
             WHERE astrologer_id = ?`,
            [call.astrologer_id]
          );

          if (!fees) {
            throw new Error(`Fees not found for astrologer ${call.astrologer_id}`);
          }

          let rate = 0;
          let platformRate = 0;

          if (call.call_type === "audio") {
            rate = fees.audio_call_rate;
            platformRate = fees.audio_platform_fee;
          }

          if (call.call_type === "video") {
            rate = fees.video_call_rate;
            platformRate = fees.video_platform_fee;
          }

          if (call.call_type === "chat") {
            rate = fees.chat_rate;
            platformRate = fees.chat_platform_fee;
          }

          const callCharge = durationMin * rate;
          const platformFee = durationMin * platformRate;
          const totalCustomerCharge = callCharge + platformFee;

          const [[walletSnapshot]] = await conn.execute(
            `SELECT
                (SELECT COALESCE(wallet_balance, 0) FROM users WHERE id = ?) AS user_wallet_balance,
                (SELECT COALESCE(wallet_balance, 0) FROM astrologer_profiles WHERE astrologer_id = ?) AS astrologer_wallet_balance`,
            [call.customer_id, call.astrologer_id]
          );

          const userWalletBefore = Number(walletSnapshot?.user_wallet_balance || 0);
          const astrologerWalletBefore = Number(walletSnapshot?.astrologer_wallet_balance || 0);
          const userWalletAfter = userWalletBefore - totalCustomerCharge;
          const astrologerWalletAfter = astrologerWalletBefore + callCharge;

          console.log("call charge:", callCharge, "platformfees:", platformFee);

          await conn.execute(
            `UPDATE call_requests
             SET status = 'completed',
                 ended_at = NOW(),
                 call_charge = ?,
                 platform_fee = ?,
                 duration = ?
             WHERE id = ?`,
            [callCharge, platformFee, durationSec, call.call_id]
          );

          await conn.execute(
            `UPDATE call_timers
             SET status = 'forced_end',
                 expires_at = NOW()
             WHERE call_id = ?`,
            [call.call_id]
          );

          await conn.execute(
            `UPDATE users
             SET wallet_balance = wallet_balance - ?
             WHERE id = ?`,
            [totalCustomerCharge, call.customer_id]
          );

          await conn.execute(
            `UPDATE astrologer_profiles
             SET wallet_balance = wallet_balance + ?
             WHERE astrologer_id = ?`,
            [callCharge, call.astrologer_id]
          );

          await conn.execute(
            `INSERT INTO call_wallet_logs
             (call_request_id, customer_id, astrologer_id, call_type, event_type,
              user_wallet_before, astrologer_wallet_before, user_wallet_after, astrologer_wallet_after,
              rate_per_minute, platform_fee_per_minute, call_charge, platform_fee, total_customer_charge)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              call.call_id,
              call.customer_id,
              call.astrologer_id,
              call.call_type,
              "call_completed",
              userWalletBefore,
              astrologerWalletBefore,
              userWalletAfter,
              astrologerWalletAfter,
              rate,
              platformRate,
              callCharge,
              platformFee,
              totalCustomerCharge,
            ]
          );

          await conn.commit();

          if (call.call_type === "chat" && call.channel_name) {
            await archiveChatMessages({
              callId: call.call_id,
              channelName: call.channel_name,
            });

            await redisClient.publish(
              "chat_events",
              JSON.stringify({
                event: "chat:ended",
                room: call.channel_name,
                payload: {
                  callId: String(call.call_id),
                  reason: "timeout",
                  endedAt: new Date().toISOString(),
                },
              })
            );
          }

          console.log(`Call ${call.call_id} force-ended`);
        } catch (err) {
          await conn.rollback();
          console.error(`Force end failed for call ${call.call_id}:`, err);
        } finally {
          conn.release();
        }
      }
    } catch (err) {
      if (connection) connection.release();
      console.error("Cron error:", err);
    }
  });

  console.log("Call expiry cron started (every 5 sec)");
};
