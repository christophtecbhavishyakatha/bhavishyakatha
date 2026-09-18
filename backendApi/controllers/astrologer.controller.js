// controllers/astrologer.controller.js
import db from "../config/db.js";
import {userApp} from "../config/firebase.js";
import {
  upsertStatus,
  getStatusWithProfile,
} from "../services/astrologerStatus.service.js";
import redisClient from "../config/redis.js";
import {
  archiveChatMessages,
  ensureChatArchiveTable,
} from "../services/chatArchive.service.js";

const normalizePhone = (value, fallback) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits || String(fallback ?? "");
};

const buildChatChannelName = ({ astrologerPhone, astrologerId, userMobile, customerId }) => {
  const astrologerMobile = normalizePhone(astrologerPhone, astrologerId);
  const customerMobile = normalizePhone(userMobile, customerId);
  return `${astrologerMobile}${customerMobile}`;
};

const CALL_CANCELLED_TIMEOUT_MS = 40 * 1000;
const callCancelledTimers = new Map();

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

const sendCallCancelledNotification = async (call, reason = "cancelled") => {
  if (!call?.fcmToken) {
    return;
  }

  const callType = String(call.call_type || call.callType || "audio").toLowerCase();
  const callerName = call.astrologer_name || "Astrologer";
  const title = getMissedCallTitle(callType);
  const body = getMissedCallBody(callType);

  const message = {
    token: call.fcmToken,
    data: {
      type: "CALL_CANCELLED",
      call_cancelled: "true",
      call_canelled: "true",
      reason,
      callId: String(call.id),
      callType,
      callerName,
      title,
      body,
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
  };

  try {
    await userApp.messaging().send(message);
  } catch (error) {
    console.log("Call cancelled FCM error:", error);
  }
};

const getCallCancellationPayload = async (callId) => {
  const [rows] = await db.execute(
    `SELECT
       cr.id,
       cr.status,
       cr.call_type,
       cr.channel_name,
       cr.started_at,
       cr.customer_id,
       u.fcmToken,
       COALESCE(ap.dp_name, ap.full_name, 'Astrologer') AS astrologer_name,
       ct.id AS timer_id
     FROM call_requests cr
     JOIN users u ON u.id = cr.customer_id
     LEFT JOIN astrologer_profiles ap ON ap.astrologer_id = cr.astrologer_id
     LEFT JOIN call_timers ct ON ct.call_id = cr.id
     WHERE cr.id = ?
     LIMIT 1`,
    [callId]
  );

  return rows[0] || null;
};

const clearCallCancelledTimer = (callId) => {
  const key = String(callId);
  const existingTimer = callCancelledTimers.get(key);

  if (existingTimer) {
    clearTimeout(existingTimer);
    callCancelledTimers.delete(key);
  }
};

const publishChatEndedIfNeeded = async (call) => {
  if (String(call?.call_type || "").toLowerCase() !== "chat" || !call.channel_name) {
    return;
  }

  await archiveChatMessages({
    callId: call.id,
    channelName: call.channel_name,
  });

  await redisClient.publish(
    "chat_events",
    JSON.stringify({
      event: "chat:ended",
      room: call.channel_name,
      payload: {
        callId: String(call.id),
      },
    })
  );
};

const cancelUnansweredAcceptedCall = async (callId, reason = "unanswered_timeout") => {
  const [result] = await db.execute(
    `UPDATE call_requests cr
     SET cr.status = 'timeout',
         cr.ended_at = NOW(),
         cr.max_duration_sec = 0,
         cr.call_charge = 0,
         cr.platform_fee = 0,
         cr.updated_at = NOW()
     WHERE cr.id = ?
       AND cr.status = 'accepted'
       AND cr.started_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM call_timers ct WHERE ct.call_id = cr.id
       )`,
    [callId]
  );

  if (!result.affectedRows) {
    return false;
  }

  const call = await getCallCancellationPayload(callId);

  if (call) {
    await sendCallCancelledNotification(call, reason);
    await publishChatEndedIfNeeded(call);
  }

  return true;
};

const scheduleCallCancelledTimeout = (callId) => {
  clearCallCancelledTimer(callId);

  const key = String(callId);
  const timer = setTimeout(async () => {
    callCancelledTimers.delete(key);

    try {
      await cancelUnansweredAcceptedCall(callId);
    } catch (error) {
      console.error("Call cancelled timeout error:", error);
    }
  }, CALL_CANCELLED_TIMEOUT_MS);

  callCancelledTimers.set(key, timer);
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

/* ---------- PROFILE ---------- */
export const getProfile = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT 
         p.full_name, 
         a.phone_number, 
         p.profile_photo, 
         p.languages, 
         p.categories, 
         p.specializations,
         p.experience,
         a.is_admin_verified
       FROM astrologer_profiles p
       JOIN astrologers a ON a.id = p.astrologer_id
       WHERE p.astrologer_id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    const r = rows[0];

    res.json({
      success: true,
      data: {
        full_name: r.full_name,
        phone: r.phone_number,
        profile_photo: r.profile_photo,
        languages: JSON.parse(r.languages || "[]"),
        categories: JSON.parse(r.categories || "[]"),
        specializations: JSON.parse(r.specializations || "[]"),
        experience: r.experience,
        is_admin_verified: r.is_admin_verified,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ---------- HOME DATA ---------- */
export const getHomeData = async (req, res) => {
  const { id } = req.params;

  try {
    const [[user]] = await db.query(
      `SELECT 
         p.full_name,
         p.dp_name,
         p.wallet_balance,
         a.is_admin_verified,
         a.profile_completed,
         a.coupon_code,
	 a.rank,
	 a.category,
	 a.founding
       FROM astrologers a
       LEFT JOIN astrologer_profiles p ON p.astrologer_id = a.id
       WHERE a.id = ?`,
      [id]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const status = await getStatusWithProfile(id);

    res.json({
      success: true,
      data: {
        ...user,
        status: status?.status || "offline",
        audio_call: !!status?.audio_call,
        video_call: !!status?.video_call,
        chat: !!status?.chat,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ---------- UPDATE STATUS ---------- */
export const updateStatus = async (req, res) => {
  const { user_id, status, audio, video, chat } = req.body;

  if (!user_id) {
    return res.status(400).json({ success: false, message: "user_id required" });
  }

  try {
    await upsertStatus({
      astrologer_id: user_id,
      status,
      audio,
      video,
      chat,
    });

    // 2️⃣ Publish to Redis channel
    const payload = JSON.stringify({
      astrologer_id: user_id,
      status,
      audio,
      video,
      chat,
      updated_at: new Date().toISOString(),
    });

    await redisClient.publish("astrologer_status", payload);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

/* ---------- STATUS POLLING ---------- */
export const getStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const data = await getStatusWithProfile(id);

    if (!data) {
      return res.status(404).json({ success: false });
    }

    res.json({
      success: true,
      data: {
        status: data.status,
        audio: !!data.audio_call,
        video: !!data.video_call,
        chat: !!data.chat,
        wallet_balance: data.wallet_balance,
        full_name: data.full_name,
        dp_name: data.dp_name,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};


// Get call requests with customer details for a specific astrologer
export const getCallRequestsWithCustomer = async (req, res) => {
  const userId = req.body.user_id;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "user_id is required",
    });
  }

  const query = `
   SELECT 
   cr.id,
  cr.call_type,
  cr.customer_id,
  cr.created_at AS call_created_at,
  u.full_name,
  u.gender,
  u.date_of_birth,
  u.time_of_birth,
  u.location
FROM call_requests cr
JOIN users u ON u.id = cr.customer_id
WHERE cr.astrologer_id = ?
  AND cr.status = 'pending'
ORDER BY cr.created_at DESC;
  `;

  try {
    const [results] = await db.query(query, [userId]); // ✅ Use await instead of callback
    
    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("DB Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch call requests",
    });
  }
};


export const rejectCallRequest = async (req, res) => {
  try {
    const { astrologer_id, customer_id, id } = req.body;

    if (!astrologer_id || !customer_id || !id) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
      });
    }

    // 1️⃣ Check if call exists & is still pending
    const [rows] = await db.query(
      `SELECT status, call_type
       FROM call_requests
       WHERE id = ?
         AND astrologer_id = ?
         AND customer_id = ?`,
      [id, astrologer_id, customer_id]
    );

    if (!rows.length) {
      return res.json({
        success: false,
        message: "Call request not found",
      });
    }

    if (rows[0].status !== "pending") {
      return res.json({
        success: false,
        message: "Call request is no longer pending",
      });
    }

    // 2️⃣ Update status to rejected_by_astrologer
    await db.query(
      `UPDATE call_requests
       SET status = 'rejected_by_astrologer',
           updated_at = NOW()
       WHERE id = ?`,
      [id]
    );

    try {
      await insertUnchangedWalletLog({
        callRequestId: id,
        customerId: customer_id,
        astrologerId: astrologer_id,
        callType: rows[0].call_type,
        eventType: "rejected_by_astrologer",
      });
    } catch (logError) {
      console.error("Failed to save rejected wallet log:", logError);
    }

    return res.json({
      success: true,
      message: "Call request rejected successfully",
    });

  } catch (err) {
    console.error("Reject call error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};



export const acceptCall = async (req, res) => {
  let connection;

  try {
    const { id, call_type } = req.body;

    if (!id || !call_type) {
      return res.status(400).json({
        message: "Missing id or call_type",
      });
    }

    connection = await db.getConnection();

    // =========================================================
    // START TRANSACTION
    // =========================================================
    await connection.beginTransaction();

    // =========================================================
    // 1. Read the request to identify the customer. The customer row is
    // locked before the request so this order matches all customer-side
    // request operations and prevents transaction deadlocks.
    // =========================================================
    const [callRows] = await connection.execute(
      `SELECT *
       FROM call_requests
       WHERE id = ?`,
      [id]
    );

    if (!callRows.length) {
      await connection.rollback();

      return res.status(404).json({
        message: "Call not found",
      });
    }

    let call = callRows[0];

    // =========================================================
    // 2. GET CUSTOMER
    // =========================================================
    const [userRows] = await connection.execute(
      `SELECT id, full_name, mobile, fcmToken
       FROM users
       WHERE id = ?
       FOR UPDATE`,
      [call.customer_id]
    );

    if (!userRows.length) {
      await connection.rollback();

      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const customer = userRows[0];

    // Lock and re-read the request after locking the customer. Every flow
    // that creates or accepts requests must use this same lock order.
    const [lockedCallRows] = await connection.execute(
      `SELECT *
       FROM call_requests
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );

    if (!lockedCallRows.length) {
      await connection.rollback();

      return res.status(404).json({
        message: "Call not found",
      });
    }

    call = lockedCallRows[0];

    // Another astrologer may have accepted it already
    if (call.status !== "pending") {
      await connection.rollback();

      return res.status(400).json({
        message: "Call already accepted or ended",
      });
    }

    // =========================================================
    // 3. GET ASTROLOGER
    // =========================================================
    const [astrologerRows] = await connection.execute(
      `SELECT
         a.phone_number,
         COALESCE(
           ap.dp_name,
           ap.full_name,
           'Astrologer'
         ) AS astrologer_name
       FROM astrologers a
       LEFT JOIN astrologer_profiles ap
         ON ap.astrologer_id = a.id
       WHERE a.id = ?
       LIMIT 1`,
      [call.astrologer_id]
    );

    const astrologer = astrologerRows[0] || {};

    // =========================================================
    // 4. BUILD CHAT CHANNEL
    // =========================================================
    const chatChannelName =
      call_type === "chat"
        ? call.channel_name ||
          buildChatChannelName({
            astrologerPhone: astrologer.phone_number,
            astrologerId: call.astrologer_id,
            userMobile: customer.mobile,
            customerId: call.customer_id,
          })
        : null;

    // =========================================================
    // 5. ACCEPT THIS REQUEST
    // =========================================================
    let updateResult;

    if (call_type === "chat") {
      [updateResult] = await connection.execute(
        `UPDATE call_requests
         SET status = 'accepted',
             accepted_at = IFNULL(accepted_at, NOW()),
             channel_name = COALESCE(channel_name, ?),
             updated_at = NOW()
         WHERE id = ?
           AND status = 'pending'`,
        [chatChannelName, id]
      );
    } else {
      [updateResult] = await connection.execute(
        `UPDATE call_requests
         SET status = 'accepted',
             accepted_at = IFNULL(accepted_at, NOW()),
             updated_at = NOW()
         WHERE id = ?
           AND status = 'pending'`,
        [id]
      );
    }

    // Another request won the race
    if (updateResult.affectedRows !== 1) {
      await connection.rollback();

      return res.status(409).json({
        message: "Call was already accepted by another astrologer",
      });
    }

    // =========================================================
    // 6. CLOSE ALL OTHER PENDING REQUESTS
    // =========================================================
    await connection.execute(
      `UPDATE call_requests
       SET status = 'accepted_by_other',
           ended_at = NOW(),
           updated_at = NOW()
       WHERE customer_id = ?
         AND id != ?
         AND status = 'pending'`,
      [call.customer_id, id]
    );

    // =========================================================
    // 7. COMMIT
    // =========================================================
    await connection.commit();

    // =========================================================
    // IMPORTANT:
    // From this point DB changes are permanent.
    // FCM failure must NOT rollback the accepted call.
    // =========================================================

    // =========================================================
    // 8. SEND FCM
    // =========================================================
    if (customer.fcmToken) {
      const messageData = {
        type: "INCOMING_CALL",
        callId: String(call.id),
        callType: call_type,
        callerName: astrologer.astrologer_name || "Astrologer",
        astrologerId: String(call.astrologer_id),
      };

      if (chatChannelName) {
        messageData.channelName = chatChannelName;
      }

      console.log("📲 FCM messageData:", messageData);

      const message = {
        token: customer.fcmToken,
        data: messageData,
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
      };

      try {
        const response = await userApp.messaging().send(message);

        console.log("✅ Firebase Success Response:");
        console.log(response);
      } catch (fcmError) {
        console.error("❌ Firebase Error Response:");
        console.error(fcmError);
      }
    }

    // =========================================================
    // 9. SCHEDULE CANCELLATION TIMEOUT
    // =========================================================
    try {
      scheduleCallCancelledTimeout(call.id);
    } catch (timeoutError) {
      console.error(
        "❌ Failed to schedule call cancellation timeout:",
        timeoutError
      );
    }

    // =========================================================
    // 10. RESPONSE
    // =========================================================
    return res.json({
      success: true,
      message: "Call accepted",
      callId: call.id,
    });
  } catch (err) {
    console.error("❌ acceptCall error:", err);

    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};





export const endCall = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { call_id } = req.body;

    if (!call_id) {
      return res.status(400).json({
        success: false,
        message: "call_id is required",
      });
    }

    const [existingCalls] = await db.execute(
      `SELECT id, status, call_type, channel_name, started_at
       FROM call_requests
       WHERE id = ?
       LIMIT 1`,
      [call_id]
    );

    if (!existingCalls.length) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    const existingCall = existingCalls[0];
    const closedStatuses = new Set([
      "callend",
      "completed",
      "timeout",
      "rejected_by_user",
      "rejected_by_astrologer",
      "no_answer",
	"accepted_by_other"
    ]);

    if (closedStatuses.has(String(existingCall.status))) {
      return res.json({
        success: true,
        alreadyEnded: true,
        message: "Call already ended",
      });
    }

    await connection.beginTransaction();

    /* 🔹 Fetch call */
    const [calls] = await connection.execute(
      `SELECT id, status, call_type, channel_name
       FROM call_requests 
       WHERE id = ? 
       LIMIT 1`,
      [call_id]
    );

    if (calls.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    /* 🔹 Update call_requests */
    await connection.execute(
      `UPDATE call_requests
       SET status = 'callend',
           ended_at = NOW()
       WHERE id = ?`,
      [call_id]
    );

/* 🔹 Update call_timers */
await connection.execute(
  `UPDATE call_timers
   SET status = 'ongoing',
       expires_at = NOW(),
       max_duration_sec = TIMESTAMPDIFF(SECOND, started_at, NOW())
   WHERE call_id = ? 
     AND status = 'ongoing'`,
  [call_id]
);

    await connection.commit();

    clearCallCancelledTimer(call_id);

    if (existingCall.status === "accepted" && !existingCall.started_at) {
      const cancelledCall = await getCallCancellationPayload(call_id);
      if (cancelledCall && !cancelledCall.timer_id) {
        await sendCallCancelledNotification(cancelledCall, "astrologer_ended");
      }
    }

    await publishChatEndedIfNeeded({
      id: call_id,
      call_type: existingCall.call_type,
      channel_name: existingCall.channel_name,
    });

    return res.json({
      success: true,
      message: "Call ended successfully",
    });
  } catch (err) {
    await connection.rollback();
    console.error("End call error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to end call",
    });
  } finally {
    connection.release();
  }
};
// controllers/transactionController.js

export const getTransactions = async (req, res) => {
  try {
    const { astrologer_id, start_date, end_date } = req.body;

    // 🔴 Validation
    if (!astrologer_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "astrologer_id, start_date, end_date are required",
      });
    }

    const query = `
      SELECT 
        cr.id,
        cr.customer_id,
        u.full_name,
        cr.call_type,
        cr.duration,
        cr.call_charge,
        cr.platform_fee,
        cr.started_at,
        cr.ended_at,
        cr.created_at
      FROM call_requests cr
      LEFT JOIN users u ON u.id = cr.customer_id
      WHERE 
        cr.astrologer_id = ?
        AND cr.status = 'completed'
        AND DATE(cr.created_at) BETWEEN ? AND ?
      ORDER BY cr.created_at DESC
    `;

    const [rows] = await db.execute(query, [
      astrologer_id,
      start_date,
      end_date,
    ]);

    let total = 0;

    const data = rows.map((row) => {
      const charge = Number(row.call_charge) || 0;
      const fee = Number(row.platform_fee) || 0;
      const earning = charge - fee;

      total += earning;

      return {
        ...row,
        earning,
      };
    });

    return res.status(200).json({
      success: true,
      total,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Transaction Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
export const getAstrologerBio = async (req, res) => {
  try {
    const { astrologer_id } = req.params;

    const [rows] = await db.query(
      `SELECT bio FROM astrologer_profiles WHERE astrologer_id = ?`,
      [astrologer_id]
    );

    res.json({ bio: rows[0]?.bio || "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching bio" });
  }
};
export const updateAstrologerBio = async (req, res) => {
  try {
    const { astrologer_id, bio } = req.body;

    await db.query(
      `UPDATE astrologer_profiles SET bio = ? WHERE astrologer_id = ?`,
      [bio, astrologer_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
};

export const getChatList = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
          cmh.room_id,
          cmh.message_text,
          cmh.sent_at,
          cmh.sender_type,
          cmh.sender_id,

          CASE 
              WHEN cmh.sender_type = 'user' THEN u.name
              ELSE a.name
          END AS sender_name

      FROM chat_message_history cmh

      LEFT JOIN users u 
          ON cmh.sender_type = 'user' AND cmh.sender_id = u.id

      LEFT JOIN astrologers a 
          ON cmh.sender_type = 'astrologer' AND cmh.sender_id = a.id

      INNER JOIN (
          SELECT room_id, MAX(sent_at) as last_sent
          FROM chat_message_history
          GROUP BY room_id
      ) latest 
      ON cmh.room_id = latest.room_id 
      AND cmh.sent_at = latest.last_sent

      ORDER BY cmh.sent_at DESC
    `);

    res.json({ success: true, data: result[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
export const getChatListByUser = async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({
      success: false,
      message: "user_id is required",
    });
  }

  try {
    const [result] = await db.query(`
      SELECT cmh.room_id,
             cmh.message_text,
             cmh.sent_at,
             cmh.sender_id,
             cmh.sender_type,
             cr.customer_id,
             COALESCE(u.full_name, 'User') AS user_name,
             COALESCE(ap.dp_name, ap.full_name, 'Astrologer') AS astrologer_name

      FROM chat_message_history cmh

      INNER JOIN (
          SELECT room_id, MAX(sent_at) AS last_sent
          FROM chat_message_history
          WHERE room_id COLLATE utf8mb4_unicode_ci IN (
              SELECT DISTINCT channel_name COLLATE utf8mb4_unicode_ci
              FROM call_requests
              WHERE astrologer_id = ?
                AND call_type = 'chat'
                AND channel_name IS NOT NULL
          )
          GROUP BY room_id
      ) latest
      ON cmh.room_id COLLATE utf8mb4_unicode_ci = latest.room_id COLLATE utf8mb4_unicode_ci
      AND cmh.sent_at = latest.last_sent

      LEFT JOIN (
          SELECT MAX(id) AS id, channel_name
          FROM call_requests
          WHERE astrologer_id = ?
            AND call_type = 'chat'
            AND channel_name IS NOT NULL
          GROUP BY channel_name
      ) latest_call
      ON latest_call.channel_name COLLATE utf8mb4_unicode_ci = cmh.room_id COLLATE utf8mb4_unicode_ci

      LEFT JOIN call_requests cr
      ON cr.id = latest_call.id

      LEFT JOIN users u
      ON u.id = cr.customer_id

      LEFT JOIN astrologer_profiles ap
      ON ap.astrologer_id = cr.astrologer_id

      ORDER BY cmh.sent_at DESC
    `, [user_id, user_id]);

    res.json({ success: true, data: result });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


export const getChatMessages = async (req, res) => {
  const { room_id } = req.params;
  const { last_id } = req.query; // pagination cursor

  try {
    await ensureChatArchiveTable();

    let query = `
      SELECT 
        cmh.id,
        cmh.room_id,
        cmh.sender_id,
        cmh.sender_type,
        cmh.message_text,
        cmh.message_type,
        cmh.image_url,
        cmh.sent_at
      FROM chat_message_history cmh
      WHERE cmh.room_id COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci
    `;

    const values = [room_id];

    // 🔥 Pagination (load older messages)
    if (last_id) {
      query += ` AND cmh.id < ?`;
      values.push(last_id);
    }

    query += `
      ORDER BY cmh.id DESC
      LIMIT 20
    `;

    const [messages] = await db.query(query, values);
    const [conversationRows] = await db.query(
      `
        SELECT
          cr.customer_id,
          cr.astrologer_id,
          COALESCE(u.full_name, 'User') AS user_name,
          COALESCE(ap.dp_name, ap.full_name, 'Astrologer') AS astrologer_name
        FROM call_requests cr
        LEFT JOIN users u
        ON u.id = cr.customer_id
        LEFT JOIN astrologer_profiles ap
        ON ap.astrologer_id = cr.astrologer_id
        WHERE cr.channel_name COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci
          AND cr.call_type = 'chat'
        ORDER BY cr.id DESC
        LIMIT 1
      `,
      [room_id]
    );

    res.json({
      success: true,
      data: messages,
      hasMore: messages.length === 20, // useful for frontend
      conversation: conversationRows[0] || null,
    });

  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ error: err.message });
  }
};


export const selfanalysis = async (req, res) => {
  try {
    const { astrologer_id } = req.params;

    if (!astrologer_id) {
      return res.status(400).json({
        success: false,
        message: "astrologer_id is required",
      });
    }

    // ==========================================
    // 1. GET ASTROLOGER
    // ==========================================
    const [astrologers] = await db.query(
      `
      SELECT
        id,
        phone_number,
        rank,
        rank_display,
        category,
        founding,
        profile_completed,
        is_phone_verified,
        is_admin_verified
      FROM astrologers
      WHERE id = ?
      LIMIT 1
      `,
      [astrologer_id]
    );

    if (astrologers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Astrologer not found",
      });
    }

    const astrologer = astrologers[0];

    // ==========================================
    // 2. RATING DISTRIBUTION
    // ==========================================
    const [ratingRows] = await db.query(
      `
      SELECT
        r.rating,
        COUNT(fr.id) AS rating_count
      FROM (
        SELECT 1 AS rating
        UNION ALL SELECT 2
        UNION ALL SELECT 3
        UNION ALL SELECT 4
        UNION ALL SELECT 5
      ) r
      LEFT JOIN feedback_rating fr
        ON fr.rating = r.rating
        AND fr.astrologer_id = ?
      GROUP BY r.rating
      ORDER BY r.rating DESC
      `,
      [astrologer_id]
    );

    // ==========================================
    // 3. TOTAL RATINGS
    // ==========================================
    const [ratingSummary] = await db.query(
      `
      SELECT
        COUNT(*) AS total_rating_count,
        COALESCE(AVG(rating), 0) AS average_rating
      FROM feedback_rating
      WHERE astrologer_id = ?
      `,
      [astrologer_id]
    );

    // ==========================================
    // 4. COMMENTS + USER NAME + REPLY
    // ==========================================
    const [comments] = await db.query(
      `
      SELECT
        fc.id,
        fc.astrologer_id,
        fc.user_id,
        u.full_name AS user_name,
        fc.comment,
        fc.created_at,
        fc.reply,
        fc.reply_created_at
      FROM feedback_comments fc
      LEFT JOIN users u
        ON u.id = fc.user_id
      WHERE fc.astrologer_id = ?
      ORDER BY fc.created_at DESC
      `,
      [astrologer_id]
    );

    // ==========================================
    // 5. FORMAT RATING DISTRIBUTION
    // ==========================================
    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    ratingRows.forEach((row) => {
      ratingDistribution[row.rating] = Number(row.rating_count);
    });

    // ==========================================
    // 6. FINAL RESPONSE
    // ==========================================
    return res.status(200).json({
      success: true,

      astrologer: {
        id: astrologer.id,
        phone_number: astrologer.phone_number,
        rank: astrologer.rank,
        rank_display: astrologer.rank_display,
        category: astrologer.category,
        founding: astrologer.founding,
        profile_completed: astrologer.profile_completed,
        is_phone_verified: astrologer.is_phone_verified,
        is_admin_verified: astrologer.is_admin_verified,
      },

      rating: {
        average: Number(
          Number(ratingSummary[0].average_rating || 0).toFixed(1)
        ),

        total: Number(ratingSummary[0].total_rating_count || 0),

        distribution: {
          5: ratingDistribution[5],
          4: ratingDistribution[4],
          3: ratingDistribution[3],
          2: ratingDistribution[2],
          1: ratingDistribution[1],
        },
      },

      comments: comments.map((item) => ({
        id: item.id,
        user_id: item.user_id,
        user_name: item.user_name || "User",
        comment: item.comment,
        created_at: item.created_at,
        reply: item.reply,
        reply_created_at: item.reply_created_at,
      })),
    });

  } catch (error) {
    console.error("Self analysis error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch self analysis",
      error: error.message,
    });
  }
};
