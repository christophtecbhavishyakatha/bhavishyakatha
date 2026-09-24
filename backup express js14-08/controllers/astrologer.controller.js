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
  try {
    const { id, call_type } = req.body;

    if (!id || !call_type) {
      return res.status(400).json({ message: "Missing id or call_type" });
    }

    // 1️⃣ Get call details
    const [callRows] = await db.execute(
      `SELECT * FROM call_requests WHERE id = ?`,
      [id]
    );

    if (!callRows.length) {
      return res.status(404).json({ message: "Call not found" });
    }

    const call = callRows[0];

    if (call.status !== "pending") {
      return res.status(400).json({ message: "Call already accepted or ended" });
    }
// Close other pending requests of the same customer
await db.execute(
  `UPDATE call_requests
   SET status = 'accepted_by_other',
       ended_at = NOW(),
       updated_at = NOW()
   WHERE customer_id = ?
     AND id != ?
     AND status = 'pending'`,
  [call.customer_id, id]
);
    // 2️⃣ Get customer
    const [userRows] = await db.execute(
      `SELECT id, full_name, mobile, fcmToken FROM users WHERE id = ?`,
      [call.customer_id]
    );

    if (!userRows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const customer = userRows[0];
    const [astrologerRows] = await db.execute(
      `SELECT
         a.phone_number,
         COALESCE(ap.dp_name, ap.full_name, 'Astrologer') AS astrologer_name
       FROM astrologers a
       LEFT JOIN astrologer_profiles ap ON ap.astrologer_id = a.id
       WHERE a.id = ?
       LIMIT 1`,
      [call.astrologer_id]
    );

    const astrologer = astrologerRows[0] || {};
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

    // 3️⃣ Update call
    if (call_type === "chat") {
      await db.execute(
        `UPDATE call_requests 
         SET status = 'accepted',
             accepted_at = IFNULL(accepted_at, NOW()),
             channel_name = COALESCE(channel_name, ?)
         WHERE id = ?`,
        [chatChannelName, id]
      );
    } else {
      await db.execute(
        `UPDATE call_requests 
         SET status = 'accepted',
             accepted_at = IFNULL(accepted_at, NOW())
         WHERE id = ?`,
        [id]
      );
    }

    // 4️⃣ Send FCM
    if (customer.fcmToken) {
      const messageData = {
        type: "INCOMING_CALL",
        callId: String(call.id),
        callType: call_type,
        callerName: astrologer.astrologer_name || "Astrologer",
      };

      if (chatChannelName) {
        messageData.channelName = chatChannelName;
      }

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
        console.log(response); // This is the message ID

      } catch (fcmError) {
        console.log("❌ Firebase Error Response:");
        console.log(fcmError);
      }
    }

    return res.json({
      success: true,
      message: "Call accepted",
    });

  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ message: "Internal server error" });
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
      `SELECT id, status, call_type, channel_name
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

    if (existingCall.call_type === "chat" && existingCall.channel_name) {
      await archiveChatMessages({
        callId: call_id,
        channelName: existingCall.channel_name,
      });

      await redisClient.publish(
        "chat_events",
        JSON.stringify({
          event: "chat:ended",
          room: existingCall.channel_name,
          payload: {
            callId: String(call_id),
          },
        })
      );
    }

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
