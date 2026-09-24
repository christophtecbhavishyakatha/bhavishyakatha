import  db  from "../config/db.js";
import { generateAgoraToken } from "../services/agoraToken.js";

export const getAgoraToken = async (req, res) => {
  try {
const baseUid = Number(req.query.uid);
    const callId = Number(req.query.id);
    const customerId = Number(req.query.customer_id);

    if (!baseUid || !callId || !customerId) {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid parameters",
      });
    }
// ✅ generate unique agora uid
const uid = Number(
  `${baseUid}${Date.now().toString().slice(-4)}`
);
    // ✅ CALL-BASED channel name
    const channelName = `audio_${baseUid}_${customerId}`;

    // 🔐 Generate Agora token for THIS user
    const token = generateAgoraToken({
      channelName,
      uid,
    });

    // ✅ Persist channel name in DB (idempotent update)
    await db.execute(
      `
      UPDATE call_requests
      SET channel_name = ?, astrologer_uid = ?
      WHERE id = ?
      `,
      [channelName, uid, callId]
    );

    return res.status(200).json({
      success: true,
      appId: process.env.AGORA_APP_ID,
      channelName,
      token,
      uid,
    });
  } catch (err) {
    console.error("Agora token error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate Agora token",
    });
  }
};




export const getUserAgoraToken = async (req, res) => {
  try {
const id = Number(req.query.id);
const baseUid = Number(req.query.uid);

    if (!id || !baseUid) {
      return res.status(400).json({
        success: false,
        message: "Missing id or uid",
      });
    }

    const uid = Number(baseUid);
    if (isNaN(uid)) {
      return res.status(400).json({
        success: false,
        message: "Invalid uid",
      });
    }
// ✅ generate unique agora uid
const numericUid = Number(
  `${uid}${Date.now().toString().slice(-4)}`
);
console.log("Generated numeric Agora user UID:", numericUid);
    /* 🔹 Fetch call data */
    const [rows] = await db.execute(
      `SELECT 
          id,
          channel_name,
          astrologer_id,
          customer_id,
          call_type,
          max_duration_sec,
          astrologer_uid
       FROM call_requests
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (rows.length === 0 || !rows[0].channel_name) {
      return res.status(404).json({
        success: false,
        message: "Channel not found for this call",
      });
    }

    const {
      channel_name,
      astrologer_id,
      customer_id,
      call_type,
      max_duration_sec,
      astrologer_uid
    } = rows[0];

    /* 🔹 Check if timer already exists (VERY IMPORTANT) */
    const [existingTimer] = await db.execute(
      `SELECT id FROM call_timers WHERE call_id = ? LIMIT 1`,
      [id]
    );

    if (existingTimer.length === 0) {
      const startedAt = new Date();
      const expiresAt = new Date(
        startedAt.getTime() + max_duration_sec * 1000
      );

      /* Update call_requests.started_at */
      await db.execute(
        `UPDATE call_requests 
         SET started_at = ?, status = 'ongoing', user_uid = ?
         WHERE id = ?`,
        [startedAt, numericUid, id]
      );
      await db.execute(
        `INSERT INTO call_timers (
          call_id,
          astrologer_id,
          customer_id,
          call_type,
          started_at,
          max_duration_sec,
          expires_at,
          astrologer_uid,
          user_uid
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          astrologer_id,
          customer_id,
          call_type,
          startedAt,
          max_duration_sec,
          expiresAt,
            astrologer_uid,
            numericUid
        ]
      );
    }

    /* 🔹 Generate Agora token */
    const token = generateAgoraToken({
      channelName: channel_name,
      uid: numericUid,
    });

    return res.json({
      success: true,
      appId: process.env.AGORA_APP_ID,
      channelName: channel_name,
      token,
      uid: numericUid,
    });
  } catch (err) {
    console.error("Agora token error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate Agora token",
    });
  }
};
