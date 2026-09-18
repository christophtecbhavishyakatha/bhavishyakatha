// controllers/callController.js

import db from "../config/db.js";
import { userApp } from "../config/firebase.js";
import redisClient from "../config/redis.js";
import { forceRemoveUser } from "../services/agoraForceRemove.js";
import { archiveChatMessages } from "../services/chatArchive.service.js";

const getMissedCallTitle = (callType) => {
  switch (String(callType).toLowerCase()) {
    case "chat":
      return "Missed astrologer chat";
    case "video":
      return "Missed astrologer video call";
    default:
      return "Missed astrologer audio call";
  }
};

const getMissedCallBody = (callType) => {
  switch (String(callType).toLowerCase()) {
    case "chat":
      return "You missed a chat request from your astrologer.";
    case "video":
      return "You missed a video call from your astrologer.";
    default:
      return "You missed an audio call from your astrologer.";
  }
};

const sendMissedNotificationToUser = async (call, reason) => {
  if (!call?.user_fcm_token) {
    return;
  }

  const callType = String(call.call_type || "audio").toLowerCase();

  try {
    await userApp.messaging().send({
      token: call.user_fcm_token,
      data: {
        type: "CALL_CANCELLED",
        call_cancelled: "true",
        call_canelled: "true",
        reason,
        callId: String(call.call_id || call.id),
        callType,
        callerName: call.astrologer_name || "Astrologer",
        title: getMissedCallTitle(callType),
        body: getMissedCallBody(callType),
      },
      android: {
        priority: "high",
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
          },
        },
      },
    });
  } catch (error) {
    console.log("Missed call FCM error:", error);
  }
};

const publishChatEnded = async (call, reason) => {
  if (String(call?.call_type || "").toLowerCase() !== "chat" || !call.channel_name) {
    return;
  }

  await archiveChatMessages({
    callId: call.call_id || call.id,
    channelName: call.channel_name,
  });

  await redisClient.publish(
    "chat_events",
    JSON.stringify({
      event: "chat:ended",
      room: call.channel_name,
      payload: {
        callId: String(call.call_id || call.id),
        reason,
        endedAt: new Date().toISOString(),
      },
    })
  );
};

const insertUnchangedWalletLog = async ({
  callRequestId,
  customerId,
  astrologerId,
  callType,
  eventType,
}) => {
  const [[wallets]] = await db.query(
    `SELECT
        (SELECT COALESCE(wallet_balance, 0) FROM users WHERE id = ?) AS user_wallet_balance,
        (SELECT COALESCE(wallet_balance, 0) FROM astrologer_profiles WHERE astrologer_id = ?) AS astrologer_wallet_balance`,
    [customerId, astrologerId]
  );

  const userWalletBalance = Number(wallets?.user_wallet_balance || 0);
  const astrologerWalletBalance = Number(wallets?.astrologer_wallet_balance || 0);

  await db.query(
    `INSERT INTO call_wallet_logs
     (call_request_id, customer_id, astrologer_id, call_type, event_type,
      user_wallet_before, astrologer_wallet_before, user_wallet_after, astrologer_wallet_after,
      call_charge, platform_fee, total_customer_charge)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      callRequestId,
      customerId,
      astrologerId,
      callType,
      eventType,
      userWalletBalance,
      astrologerWalletBalance,
      userWalletBalance,
      astrologerWalletBalance,
      0,
      0,
      0,
    ]
  );
};

// Confirm an accepted incoming call from the customer's RingingScreen and
// close any duplicate requests that are still pending for the same customer.
export const acceptIncomingCall = async (req, res) => {
  let connection;

  try {
    const { callId } = req.body;

    if (!callId) {
      return res.status(400).json({
        success: false,
        message: "callId is required",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Read the customer first so both accept paths can serialize on the
    // same customer row. The request itself is locked again after that.
    const [callRows] = await connection.execute(
      `SELECT id, customer_id, status
       FROM call_requests
       WHERE id = ?
       LIMIT 1`,
      [callId]
    );

    if (!callRows.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    const customerId = callRows[0].customer_id;

    await connection.execute(
      `SELECT id
       FROM users
       WHERE id = ?
       FOR UPDATE`,
      [customerId]
    );

    const [lockedCallRows] = await connection.execute(
      `SELECT id, status
       FROM call_requests
       WHERE id = ?
       FOR UPDATE`,
      [callId]
    );

    if (!lockedCallRows.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    if (lockedCallRows[0].status !== "accepted") {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Call is not available to accept",
      });
    }

    const [cleanupResult] = await connection.execute(
      `UPDATE call_requests
       SET status = 'accepted_by_other',
           ended_at = NOW(),
           updated_at = NOW()
       WHERE customer_id = ?
         AND id != ?
         AND status = 'pending'`,
      [customerId, callId]
    );

    await connection.commit();

    return res.json({
      success: true,
      callId,
      closedRequests: cleanupResult.affectedRows,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Accept incoming call rollback error:", rollbackError);
      }
    }

    console.error("Accept incoming call error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to accept incoming call",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

export const rejectCall = async (req, res) => {
  try {
    const { callId } = req.body;

    if (!callId) {
      return res.status(400).json({ message: "callId is required" });
    }

    // 1. Get call details
    const [rows] = await db.query(
      `SELECT channel_name, astrologer_uid, status 
       FROM call_requests 
       WHERE id = ?`,
      [callId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Call not found" });
    }

    const call = rows[0];

    // 2. Force remove user (always attempt)
    if (call.channel_name && call.astrologer_uid) {
      try {
        await forceRemoveUser({
          channelName: call.channel_name,
          uid: call.astrologer_uid,
        });
      } catch (err) {
        console.warn("Agora remove failed:", err.message);
      }
    }

    // 3. Update status (only if not already rejected)
    if (call.status !== "rejected_by_user") {
      await db.query(
        `UPDATE call_requests 
         SET status = 'rejected_by_user', ended_at = NOW()
         WHERE id = ?`,
        [callId]
      );

      await db.query(
        `UPDATE call_timers
         SET status = 'rejected_by_user',
             expires_at = NOW(),
             max_duration_sec = CASE
               WHEN started_at IS NOT NULL
                 THEN TIMESTAMPDIFF(SECOND, started_at, NOW())
               ELSE 0
             END
         WHERE call_id = ?`,
        [callId]
      );
    }

    if (call.channel_name) {
      await archiveChatMessages({
        callId,
        channelName: call.channel_name,
      });
    }

    return res.json({
      success: true,
      message: "Call rejected successfully",
    });

  } catch (error) {
    console.error("Reject Call Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


export const rejectChat = async (req, res) => {
  try {
    const { callId } = req.body;

    if (!callId) {
      return res.status(400).json({ message: "callId is required" });
    }

    // 1. Get call details
    const [rows] = await db.query(
      `SELECT channel_name, astrologer_uid, status 
       FROM call_requests 
       WHERE id = ?`,
      [callId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Call not found" });
    }

    const call = rows[0];

    // 2. Force remove user (always attempt)
    

    // 3. Update status (only if not already rejected)
    if (call.status !== "rejected_by_user") {
      await db.query(
        `UPDATE call_requests 
         SET status = 'rejected_by_user', ended_at = NOW()
         WHERE id = ?`,
        [callId]
      );

      await db.query(
        `UPDATE call_timers
         SET status = 'rejected_by_user',
             expires_at = NOW(),
             max_duration_sec = CASE
               WHEN started_at IS NOT NULL
                 THEN TIMESTAMPDIFF(SECOND, started_at, NOW())
               ELSE 0
             END
         WHERE call_id = ?`,
        [callId]
      );
    }

    if (call.channel_name) {
      await archiveChatMessages({
        callId,
        channelName: call.channel_name,
      });
    }

    return res.json({
      success: true,
      message: "Call rejected successfully",
    });

  } catch (error) {
    console.error("Reject Call Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const endCallNoJoin = async (req, res) => {
  try {
    const { callId } = req.body;

    if (!callId) {
      return res.status(400).json({ message: "callId is required" });
    }

    // 1. Get call details. A timer row exists only after the user joins, so
    // accepted-but-unanswered calls must still be closed from call_requests.
    const [rows] = await db.query(
      `SELECT
         cr.id AS call_id,
         ct.astrologer_uid,
         ct.user_uid,
         ct.status AS timer_status,
         ct.started_at,
         cr.channel_name,
         cr.customer_id,
         cr.astrologer_id,
         cr.call_type,
         cr.status,
         u.fcmToken AS user_fcm_token,
         COALESCE(ap.dp_name, ap.full_name, 'Astrologer') AS astrologer_name
       FROM call_requests cr
       LEFT JOIN call_timers ct ON ct.call_id = cr.id
       LEFT JOIN users u ON u.id = cr.customer_id
       LEFT JOIN astrologer_profiles ap ON ap.astrologer_id = cr.astrologer_id
       WHERE cr.id = ?
       LIMIT 1`,
      [callId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Call not found" });
    }

    const call = rows[0];
    const closedStatuses = new Set([
      "callend",
      "completed",
      "timeout",
      "forced_end",
      "rejected_by_user",
      "rejected_by_astrologer",
      "no_answer",
      "accepted_by_other",
    ]);

    if (closedStatuses.has(String(call.status))) {
      return res.json({
        success: true,
        alreadyEnded: true,
        message: "Call already ended",
      });
    }

    if (call.started_at) {
      return res.json({
        success: true,
        alreadyStarted: true,
        message: "Call already started",
      });
    }

    // 2. Force remove BOTH users (safe cleanup)
     try {
      if (call.astrologer_uid) {
        await forceRemoveUser({
          channelName: call.call_id,
          uid: call.astrologer_uid,
        });
      }

      if (call.user_uid) {
        await forceRemoveUser({
          channelName: call.call_id,
          uid: call.user_uid,
        });
      }
    } catch (err) {
      console.warn("Agora cleanup failed:", err.message);
    }

    // 3. Update call as ended immediately
    await db.query(
      `UPDATE call_timers
       SET status = 'no_answer',
           max_duration_sec = 0,
           expires_at = COALESCE(started_at, NOW())
       WHERE call_id = ?`,
      [callId]
    );

    await db.query(
      `UPDATE call_requests
       SET status = 'timeout',
           ended_at = COALESCE(accepted_at, NOW()),
           max_duration_sec = 0,
           call_charge = 0,
           platform_fee = 0
       WHERE id = ?`,
      [callId]
    );

    try {
      await insertUnchangedWalletLog({
        callRequestId: call.call_id,
        customerId: call.customer_id,
        astrologerId: call.astrologer_id,
        callType: call.call_type,
        eventType: "timeout",
      });
    } catch (logError) {
      console.error("Failed to save timeout wallet log:", logError);
    }

    await sendMissedNotificationToUser(call, "unanswered_timeout");
    await publishChatEnded(call, "unanswered_timeout");

    return res.json({
      success: true,
      message: "Call ended (astrologer did not join)",
    });

  } catch (error) {
    console.error("End No Join Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
