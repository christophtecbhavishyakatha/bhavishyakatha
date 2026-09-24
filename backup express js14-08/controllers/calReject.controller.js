// controllers/callController.js

import db from "../config/db.js";
import { forceRemoveUser } from "../services/agoraForceRemove.js";
import { archiveChatMessages } from "../services/chatArchive.service.js";

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

    // 1. Get call timer details
    const [rows] = await db.query(
      `SELECT
         ct.call_id,
         ct.astrologer_uid,
         ct.user_uid,
         ct.status,
         ct.started_at,
         cr.channel_name,
         cr.customer_id,
         cr.astrologer_id,
         cr.call_type
       FROM call_timers ct
       JOIN call_requests cr ON cr.id = ct.call_id
       WHERE ct.call_id = ?`,
      [callId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Call timer not found" });
    }

    const call = rows[0];

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
    if (call.status !== "ended") {
      await db.query(
        `UPDATE call_timers
         SET status = 'no_answer',max_duration_sec = 0,
             expires_at = started_at
         WHERE call_id = ?`,
        [callId]
      );

       await db.query(
        `UPDATE call_requests
         SET status = 'timeout',
             ended_at = accepted_at,max_duration_sec = 0,call_charge = 0,platform_fee = 0
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
    }

    if (call.call_type === "chat" && call.channel_name) {
      await archiveChatMessages({
        callId,
        channelName: call.channel_name,
      });
    }

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
