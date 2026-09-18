import cron from "node-cron";
import db from "../config/db.js";
import redisClient from "../config/redis.js";
import { forceRemoveUser } from "../services/agoraForceRemove.js";
import { archiveChatMessages } from "../services/chatArchive.service.js";
import {userApp} from "../config/firebase.js";
import { appendFile } from "node:fs/promises";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_PROCESSING_ATTEMPTS = 3;
const PROCESSING_LEASE_MINUTES = 2;
const DEBUG_LOG_FILE = new URL("./call-expiry-cron-debug.log", import.meta.url);

const writeCronDebugLog = async ({ call, context, error }) => {
  const entry = {
    timestamp: new Date().toISOString(),
    call: call
      ? {
          callId: call.call_id,
          customerId: call.customer_id,
          astrologerId: call.astrologer_id,
          callType: call.call_type,
          expiresAt: call.expires_at,
          maxDurationSec: call.max_duration_sec,
          processingAttempts: call.processing_attempts,
        }
      : null,
    context,
    error: error
      ? {
          name: error.name,
          message: error.message || String(error),
          code: error.code,
          errno: error.errno,
          sqlState: error.sqlState,
          sqlMessage: error.sqlMessage,
          stack: error.stack,
        }
      : null,
  };

  try {
    await appendFile(DEBUG_LOG_FILE, `${JSON.stringify(entry)}\n`, "utf8");
  } catch (logError) {
    console.error("Could not write call expiry debug log:", logError);
  }
};

const closeChatResources = async (call) => {
  if (call.call_type !== "chat" || !call.channel_name) {
    return;
  }

  try {
    await archiveChatMessages({
      callId: call.call_id,
      channelName: call.channel_name,
    });
  } catch (archiveError) {
    console.error(
      `Chat archive failed for call ${call.call_id}:`,
      archiveError
    );
  }

  try {
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
  } catch (redisError) {
    console.error(
      `Redis chat ended event failed for call ${call.call_id}:`,
      redisError
    );
  }
};

const verifyWalletLogUniqueConstraint = async () => {
  const [rows] = await db.execute(
    `SELECT index_name
       FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'call_wallet_logs'
        AND non_unique = 0
      GROUP BY index_name
      HAVING GROUP_CONCAT(column_name ORDER BY seq_in_index) =
             'call_request_id,event_type'`
  );

  if (!rows.length) {
    throw new Error(
      "Missing unique constraint on call_wallet_logs(call_request_id, event_type)"
    );
  }
};

export const startCallExpiryCron = () => {
  verifyWalletLogUniqueConstraint()
    .then(() => {
      cron.schedule("*/5 * * * * *", async () => {
    let connection;

    try {
      /*
       * ---------------------------------------------------------
       * 1. Find expired ongoing calls
       * ---------------------------------------------------------
       */
      connection = await db.getConnection();

      const [calls] = await connection.execute(
        `SELECT
            ct.call_id,
            ct.customer_id,
            ct.astrologer_id,
            ct.call_type,
            ct.user_uid,
            ct.astrologer_uid,
            ct.expires_at,
            cr.channel_name,
            cr.started_at,
            cr.max_duration_sec,
            ct.processing_attempts
         FROM call_timers ct
         JOIN call_requests cr
           ON cr.id = ct.call_id
         WHERE (
             (ct.status = 'ongoing' AND ct.expires_at <= NOW())
             OR (
               ct.status = 'processing'
               AND ct.processing_attempts < ${MAX_PROCESSING_ATTEMPTS}
               AND ct.processing_started_at <= DATE_SUB(NOW(), INTERVAL ${PROCESSING_LEASE_MINUTES} MINUTE)
             )
           )`
      );

      connection.release();
      connection = null;

      if (calls.length === 0) {
        return;
      }

      /*
       * ---------------------------------------------------------
       * 2. Process each expired call
       * ---------------------------------------------------------
       */
      for (const call of calls) {
        const conn = await db.getConnection();

        let transactionStarted = false;
        const debugContext = {
          stage: "connection_acquired",
          durationSec: null,
          durationMin: null,
          rate: null,
          platformRate: null,
          callCharge: null,
          platformFee: null,
          totalCustomerCharge: null,
          userWalletBefore: null,
          userWalletAfter: null,
          astrologerWalletBefore: null,
          astrologerWalletAfter: null,
        };

        try {
          /*
           * -----------------------------------------------------
           * IMPORTANT:
           * Atomically claim the call.
           *
           * Only ONE cron execution can change:
           *
           * ongoing -> processing
           *
           * If another cron already claimed it,
           * affectedRows will be 0 and we STOP.
           * -----------------------------------------------------
           */
          await conn.beginTransaction();
          transactionStarted = true;
          debugContext.stage = "claim_started";

          const [claimResult] = await conn.execute(
            `UPDATE call_timers
             SET status = 'processing',
                 processing_attempts = COALESCE(processing_attempts, 0) + 1,
                 processing_started_at = NOW(),
                 last_processing_error = NULL
             WHERE call_id = ?
               AND (
                 (status = 'ongoing' AND expires_at <= NOW())
                 OR (
                   status = 'processing'
                   AND processing_attempts < ${MAX_PROCESSING_ATTEMPTS}
                   AND processing_started_at <= DATE_SUB(NOW(), INTERVAL ${PROCESSING_LEASE_MINUTES} MINUTE)
                 )
               )`,
            [call.call_id]
          );

          if (claimResult.affectedRows !== 1) {
            await conn.rollback();
            transactionStarted = false;

            console.log(
              `Call ${call.call_id} already processed by another worker`
            );

            continue;
          }

          // Commit the processing claim before any Agora/network calls.
          await conn.commit();
          transactionStarted = false;
          debugContext.stage = "claim_committed";

          /*
           * -----------------------------------------------------
           * 3. Remove users from Agora
           * -----------------------------------------------------
           */
          if (call.call_type !== "chat") {
            debugContext.stage = "agora_cleanup";
            try {
              await forceRemoveUser({
                channelName: call.channel_name,
                uid: call.user_uid,
              });
            } catch (err) {
              console.log(
                `User ${call.user_uid} already left or removal failed`
              );
            }

            await sleep(1000);

            try {
              await forceRemoveUser({
                channelName: call.channel_name,
                uid: call.astrologer_uid,
              });
            } catch (err) {
              console.log(
                `Astrologer ${call.astrologer_uid} already left or removal failed`
              );
            }
          } else {
            debugContext.stage = "chat_cleanup";
            console.log(
              `Chat ${call.call_id} reached max duration and will be closed`
            );
          }

          /*
           * -----------------------------------------------------
           * 4. Begin final settlement transaction
           * -----------------------------------------------------
           */
          await conn.beginTransaction();
          transactionStarted = true;
          debugContext.stage = "settlement_transaction_started";

          const [[callRequest]] = await conn.execute(
            `SELECT
                id,
                status,
                started_at,
                channel_name,
                call_charge,
                platform_fee,
                duration
             FROM call_requests
             WHERE id = ?
             FOR UPDATE`,
            [call.call_id]
          );

          if (!callRequest) {
            throw new Error(`Call request ${call.call_id} not found`);
          }

          /* If another process already completed the call, do not charge again. */
          if (callRequest.status === "completed") {
            await conn.execute(
               `UPDATE call_timers
               SET status = 'forced_end',
                   processing_started_at = NULL,
                   last_processing_error = NULL
               WHERE call_id = ?`,
              [call.call_id]
            );

            await conn.commit();
            transactionStarted = false;

            console.log(
              `Call ${call.call_id} was already completed. No wallet deduction.`
            );

            continue;
          }

          /*
           * -----------------------------------------------------
           * 5. Calculate duration
           * -----------------------------------------------------
           */
          const maxDurationSec = Number(call.max_duration_sec);

          if (!Number.isFinite(maxDurationSec) || maxDurationSec <= 0) {
            const error = new Error(
              `Invalid max_duration_sec for call ${call.call_id}: ${call.max_duration_sec}`
            );
            error.permanent = true;
            throw error;
          }

          const startTime = new Date(
            callRequest.started_at || call.started_at
          );

          const endTime = new Date(call.expires_at);

          if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
            const error = new Error(
              `Invalid start/end time for call ${call.call_id}`
            );
            error.permanent = true;
            throw error;
          }

          let durationSec = Math.max(
            0,
            Math.floor((endTime - startTime) / 1000)
          );

          durationSec = Math.min(
            durationSec,
            maxDurationSec
          );

          const durationMin = Math.ceil(durationSec / 60);
          debugContext.durationSec = durationSec;
          debugContext.durationMin = durationMin;

          /*
           * -----------------------------------------------------
           * 6. Get astrologer fees
           * -----------------------------------------------------
           */
          const [[fees]] = await conn.execute(
            `SELECT
                audio_call_rate,
                audio_platform_fee,
                video_call_rate,
                video_platform_fee,
                chat_rate,
                chat_platform_fee
             FROM astrologer_fees
             WHERE astrologer_id = ?
             FOR UPDATE`,
            [call.astrologer_id]
          );

          if (!fees) {
            throw new Error(
              `Fees not found for astrologer ${call.astrologer_id}`
            );
          }

          let rate = 0;
          let platformRate = 0;

          if (call.call_type === "audio") {
            rate = Number(fees.audio_call_rate || 0);
            platformRate = Number(fees.audio_platform_fee || 0);
          } else if (call.call_type === "video") {
            rate = Number(fees.video_call_rate || 0);
            platformRate = Number(fees.video_platform_fee || 0);
          } else if (call.call_type === "chat") {
            rate = Number(fees.chat_rate || 0);
            platformRate = Number(fees.chat_platform_fee || 0);
          } else {
            throw new Error(
              `Invalid call type ${call.call_type} for call ${call.call_id}`
            );
          }

          /*
           * -----------------------------------------------------
           * 7. Calculate charges
           * -----------------------------------------------------
           */
          const callCharge = durationMin * rate;
          const platformFee = durationMin * platformRate;

          const totalCustomerCharge =
            callCharge + platformFee;

          Object.assign(debugContext, {
            stage: "charges_calculated",
            rate,
            platformRate,
            callCharge,
            platformFee,
            totalCustomerCharge,
          });

          console.log(
            `Call ${call.call_id}`,
            {
              durationSec,
              durationMin,
              rate,
              platformRate,
              callCharge,
              platformFee,
              totalCustomerCharge,
            }
          );

          /*
           * -----------------------------------------------------
           * 8. Lock wallet rows
           *
           * This prevents another transaction from changing
           * the wallet while we calculate the final balance.
           * -----------------------------------------------------
           */
          const [[userWalletRow]] = await conn.execute(
            `SELECT COALESCE(wallet_balance, 0) AS wallet_balance
               FROM users
              WHERE id = ?
              FOR UPDATE`,
            [call.customer_id]
          );

          const [[astrologerWalletRow]] = await conn.execute(
            `SELECT COALESCE(wallet_balance, 0) AS wallet_balance
               FROM astrologer_profiles
              WHERE astrologer_id = ?
              FOR UPDATE`,
            [call.astrologer_id]
          );

          if (!userWalletRow || !astrologerWalletRow) {
            throw new Error(
              `Wallet row missing for user ${call.customer_id} or astrologer ${call.astrologer_id}`
            );
          }

          const userWalletBefore = Number(userWalletRow.wallet_balance);
          const astrologerWalletBefore = Number(
            astrologerWalletRow.wallet_balance
          );

          if (
            !Number.isFinite(userWalletBefore) ||
            !Number.isFinite(astrologerWalletBefore)
          ) {
            const error = new Error(
              `Invalid wallet balance for call ${call.call_id}`
            );
            error.permanent = true;
            throw error;
          }

          /*
           * -----------------------------------------------------
           * 9. Prevent negative wallet
           * -----------------------------------------------------
           *
           * If your system allows negative wallet balances,
           * remove this check.
           * -----------------------------------------------------
           */
     /*     if (userWalletBefore < totalCustomerCharge) {
            throw new Error(
              `Insufficient wallet balance for user ${call.customer_id}. ` +
              `Balance=${userWalletBefore}, ` +
              `Required=${totalCustomerCharge}`
            );
          }
*/
          const userWalletAfter =
            userWalletBefore - totalCustomerCharge;

          const astrologerWalletAfter =
            astrologerWalletBefore + callCharge;

          Object.assign(debugContext, {
            stage: "wallet_rows_locked",
            userWalletBefore,
            userWalletAfter,
            astrologerWalletBefore,
            astrologerWalletAfter,
          });

          /*
           * -----------------------------------------------------
           * 10. Mark call completed
           * -----------------------------------------------------
           */
          const [completedResult] = await conn.execute(
            `UPDATE call_requests
             SET status = 'completed',
                 ended_at = NOW(),
                 call_charge = ?,
                 platform_fee = ?,
                 duration = ?
             WHERE id = ?
               AND status <> 'completed'`,
            [
              callCharge,
              platformFee,
              durationSec,
              call.call_id,
            ]
          );

          if (completedResult.affectedRows !== 1) {
            throw new Error(
              `Call ${call.call_id} could not be marked completed`
            );
          }

          /*
           * -----------------------------------------------------
           * 11. Mark timer forced_end
           * -----------------------------------------------------
           */
          await conn.execute(
            `UPDATE call_timers
             SET status = 'forced_end',
                 processing_started_at = NULL,
                 last_processing_error = NULL
             WHERE call_id = ?`,
            [call.call_id]
          );

          /*
           * -----------------------------------------------------
           * 12. Insert wallet transaction log
           *
           * IMPORTANT:
           * Add a UNIQUE KEY on
           * (call_request_id, event_type)
           * in your database.
           * -----------------------------------------------------
           */
          await conn.execute(
            `INSERT INTO call_wallet_logs
             (
               call_request_id,
               customer_id,
               astrologer_id,
               call_type,
               event_type,
               user_wallet_before,
               astrologer_wallet_before,
               user_wallet_after,
               astrologer_wallet_after,
               rate_per_minute,
               platform_fee_per_minute,
               call_charge,
               platform_fee,
               total_customer_charge
             )
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

          /*
           * -----------------------------------------------------
           * 13. Update wallet balances last
           *
           * These updates are still part of the same transaction.
           * If either update fails, the call state and wallet log
           * are rolled back together.
           * -----------------------------------------------------
           */
          debugContext.stage = "wallet_updates";

          const [userWalletUpdate] = await conn.execute(
            `UPDATE users
             SET wallet_balance = wallet_balance - ?
             WHERE id = ?
               AND wallet_balance >= ?`,
            [
              totalCustomerCharge,
              call.customer_id,
              totalCustomerCharge,
            ]
          );

          if (
            totalCustomerCharge > 0 &&
            userWalletUpdate.affectedRows !== 1
          ) {
            throw new Error(
              `User wallet update failed for user ${call.customer_id}`
            );
          }

          const [astrologerWalletUpdate] = await conn.execute(
            `UPDATE astrologer_profiles
             SET wallet_balance = wallet_balance + ?
             WHERE astrologer_id = ?`,
            [callCharge, call.astrologer_id]
          );

          if (callCharge > 0 && astrologerWalletUpdate.affectedRows !== 1) {
            throw new Error(
              `Astrologer wallet update failed for astrologer ${call.astrologer_id}`
            );
          }

          debugContext.stage = "wallet_updates_completed";

          /*
           * -----------------------------------------------------
           * 14. Commit everything
           * -----------------------------------------------------
           */
          await conn.commit();
          transactionStarted = false;

          console.log(
            `Call ${call.call_id} successfully force-ended and settled`
          );
await sendCallEndedNotification({
  userId: call.customer_id,
  callId: call.call_id,
  callType: call.call_type,
  durationSec,
  totalCharge: totalCustomerCharge,
});
          /*
           * -----------------------------------------------------
           * 16. Archive chat AFTER successful transaction
           * -----------------------------------------------------
           */
          await closeChatResources(call);
        } catch (err) {
          /*
           * -----------------------------------------------------
           * Roll back the settlement transaction if anything failed.
           * -----------------------------------------------------
           */
          if (transactionStarted) {
            try {
              await conn.rollback();
            } catch (rollbackError) {
              console.error(
                `Rollback failed for call ${call.call_id}:`,
                rollbackError
              );
            }
          }

          const attemptNumber = Number(call.processing_attempts || 0) + 1;
          const permanentlyFailed =
            err.permanent === true || attemptNumber >= MAX_PROCESSING_ATTEMPTS;
          // forced_end is an existing timer status and prevents another cron
          // run from retrying a settlement that permanently failed.
          const nextStatus = permanentlyFailed
            ? 'forced_end'
            : 'ongoing';

          debugContext.stage = "error_handling";
          debugContext.attemptNumber = attemptNumber;
          debugContext.nextStatus = nextStatus;

          await writeCronDebugLog({
            call,
            context: debugContext,
            error: err,
          });

          // The processing claim was already committed. Retry boundedly;
          // after the limit, close the timer and retain the error details.
          try {
            await conn.execute(
              `UPDATE call_timers
               SET status = ?,
                   processing_started_at = NULL,
                   last_processing_error = ?
               WHERE call_id = ?
                 AND status = 'processing'`,
              [
                nextStatus,
                String(err.message || err).slice(0, 2000),
                call.call_id,
              ]
            );
          } catch (releaseError) {
            console.error(
              `Could not release processing claim for call ${call.call_id}:`,
              releaseError
            );
          }

          // Close chat resources even when settlement or wallet updates fail.
          await closeChatResources(call);

          console.error(
            `Force end ${permanentlyFailed ? 'permanently failed' : 'failed'} for call ${call.call_id} (attempt ${attemptNumber}/${MAX_PROCESSING_ATTEMPTS}):`,
            err
          );
        } finally {
          conn.release();
        }
      }
    } catch (err) {
      if (connection) {
        connection.release();
      }

      await writeCronDebugLog({
        context: { stage: "cron_cycle_error" },
        error: err,
      });

      console.error("Call expiry cron error:", err);
    }
      });

      console.log("Call expiry cron started (every 5 seconds)");
    })
    .catch((error) => {
      console.error(
        "Call expiry cron was not started because database hardening checks failed:",
        error
      );
    });
};

const sendCallEndedNotification = async ({
  userId,
  callId,
  callType,
  durationSec,
  totalCharge,
}) => {
  try {
    const [users] = await db.execute(
      `SELECT fcmToken, wallet_balance
       FROM users
       WHERE id = ?
         AND wallet_balance < 30
         AND fcmToken IS NOT NULL
         AND fcmToken <> ''
       LIMIT 1`,
      [userId]
    );

    // No notification required if balance is >= 30
    if (!users.length) {
      console.log(
        `No low-balance notification required for user ${userId}`
      );
      return;
    }

    const fcmToken = users[0].fcmToken;
    const walletBalance = Number(users[0].wallet_balance || 0);

    await userApp.messaging().send({
      token: fcmToken,

      notification: {
        title: "Recharge Reminder",
        body: "Your consultation has ended. Recharge to continue consulting.",
      },

      data: {
        notificationType: "Recharge",
       // callId: String(callId),
       // callType: String(callType),
       // duration: String(durationSec || 0),
       // charge: String(totalCharge || 0),
       // walletBalance: String(walletBalance),
      },

      android: {
        priority: "high",

        notification: {
        //  channelId: "recharge",
          sound: "default",
        //  defaultSound: false,
        //  defaultVibrateTimings: false,
        },
      },
    });

    console.log(
      `Recharge notification sent to user ${userId}. Balance: ${walletBalance}`
    );
  } catch (error) {
    console.error(
      `Recharge notification failed for user ${userId}:`,
      error
    );

    // Notification failure must never affect call settlement
  }
};
