import fs from "fs";
import path from "path";
import db from "../config/db.js";
import redisClient from "../config/redis.js";
import {
  loadChatHistoryPage,
  saveLiveChatMessage,
} from "../services/chatArchive.service.js";
import sharp from "sharp";

const CHAT_EVENTS_CHANNEL = "chat_events";
const CHAT_IMAGE_DIR = path.join(process.cwd(), "image", "chatImage");
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const MAX_CHAT_IMAGE_BYTES = 4 * 1024 * 1024;

const compressImage = async (buffer, mime) => {
  let quality = 80;
  let compressedBuffer;

  do {
    let image = sharp(buffer);

    // Resize huge photos
    image = image.resize({
      width: 1920,
      height: 1920,
      fit: "inside",
      withoutEnlargement: true,
    });

    if (mime.includes("png")) {
      compressedBuffer = await image
        .png({
          compressionLevel: 9,
          palette: true,
        })
        .toBuffer();

    } else if (mime.includes("webp")) {
      compressedBuffer = await image
        .webp({ quality })
        .toBuffer();

    } else {
      compressedBuffer = await image
        .jpeg({ quality })
        .toBuffer();
    }

    quality -= 10;

  } while (
    compressedBuffer.length > MAX_CHAT_IMAGE_BYTES &&
    quality >= 10
  );

  return compressedBuffer;
};
const CLOSED_CHAT_STATUSES = new Set([
  "callend",
  "completed",
  "timeout",
  "forced_end",
  "rejected_by_user",
  "rejected_by_astrologer",
  "no_answer",
]);

const isClosedChatStatus = (status) =>
  CLOSED_CHAT_STATUSES.has(String(status || "").toLowerCase());

const serializeDate = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalizePhone = (value, fallback) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits || String(fallback ?? "");
};

const publishChatEvent = async (event, room, payload) => {
  console.log(
    `[CHAT REDIS PUBLISH] topic=${CHAT_EVENTS_CHANNEL} room=${room} event=${event} callId=${
      payload?.callId || ""
    }`
  );
  await redisClient.publish(
    CHAT_EVENTS_CHANNEL,
    JSON.stringify({ event, room, payload })
  );
};

const sanitizeBase64Image = (value) =>
  String(value || "").replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");

const getImageMime = (req) => {
  const declaredMime = String(req.body.imageMime || "").toLowerCase();
  if (ALLOWED_IMAGE_TYPES.has(declaredMime)) {
    return declaredMime;
  }

  const dataUriMatch = String(req.body.imageBase64 || "").match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,/
  );
  const dataUriMime = String(dataUriMatch?.[1] || "").toLowerCase();
  return ALLOWED_IMAGE_TYPES.has(dataUriMime) ? dataUriMime : "";
};

const saveChatImage = async (req) => {
  const rawImage = String(req.body.imageBase64 || "");

  if (!rawImage) return "";

  const mime = getImageMime(req);

  if (!mime) {
    const error = new Error(
      "Only JPG, PNG and WEBP images are supported"
    );
    error.statusCode = 400;
    throw error;
  }

  let buffer = Buffer.from(
    sanitizeBase64Image(rawImage),
    "base64"
  );

  if (!buffer.length) {
    const error = new Error("Invalid image");
    error.statusCode = 400;
    throw error;
  }
console.log(
  `[IMAGE] Original size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`
);
  // Compress only if >3MB
  if (buffer.length > MAX_CHAT_IMAGE_BYTES) {
buffer = await compressImage(buffer, mime);  }

  // Still too large after compression
  if (buffer.length > MAX_CHAT_IMAGE_BYTES) {
console.log('can not process image')
    const error = new Error(
      "Unable to reduce image below 3 MB"
    );
    error.statusCode = 400;
    throw error;
  }
console.log(
    `[IMAGE] Compressed size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`
  );
  await fs.promises.mkdir(CHAT_IMAGE_DIR, {
    recursive: true,
  });
const extension = ALLOWED_IMAGE_TYPES.get(mime);

const fileName = `chat_${Date.now()}_${Math.random()
  .toString(36)
  .slice(2, 10)}.${extension}`;

  const filePath = path.join(
    CHAT_IMAGE_DIR,
    fileName
  );

  await fs.promises.writeFile(filePath, buffer);

  return `${req.protocol}://${req.get(
    "host"
  )}/express/image/chatImage/${fileName}`;
};
const getChatCall = async (callId) => {
  const [rows] = await db.query(
    `SELECT
       cr.id,
       cr.status,
       cr.call_type,
       cr.channel_name,
       cr.max_duration_sec,
       cr.accepted_at,
       cr.started_at,
       cr.astrologer_id,
       cr.customer_id,
       u.mobile AS user_mobile,
       u.full_name AS user_name,
       u.fcmToken AS user_fcm_token,
       a.phone_number AS astrologer_mobile,
       ct.started_at AS timer_started_at,
       ct.expires_at AS timer_expires_at,
       ct.status AS timer_status,
       COALESCE(ap.dp_name, ap.full_name, 'Astrologer') AS astrologer_name
     FROM call_requests cr
     JOIN users u ON u.id = cr.customer_id
     JOIN astrologers a ON a.id = cr.astrologer_id
     LEFT JOIN astrologer_profiles ap ON ap.astrologer_id = cr.astrologer_id
     LEFT JOIN call_timers ct ON ct.call_id = cr.id
     WHERE cr.id = ?
       AND cr.call_type = 'chat'
     LIMIT 1`,
    [callId]
  );

  return rows[0] || null;
};

const buildChannelName = (call) => {
  const astrologerMobile = normalizePhone(call.astrologer_mobile, call.astrologer_id);
  const userMobile = normalizePhone(call.user_mobile, call.customer_id);
  return `${astrologerMobile}${userMobile}`;
};

const getHistoryOptions = (source = {}) => ({
  limit: source.limit,
  beforeHistoryId:
    source.beforeHistoryId ??
    source.before_history_id ??
    source.historyId ??
    source.history_id,
  beforeSentAt: source.beforeSentAt ?? source.before_sent_at,
});

const ensureTimerRowForUserJoin = async (call) => {
  const startedAt = new Date();
  const expiresAt = new Date(
    startedAt.getTime() + Number(call.max_duration_sec || 0) * 1000
  );

  const [existingRows] = await db.query(
    `SELECT id, status, started_at, expires_at
     FROM call_timers
     WHERE call_id = ?
     LIMIT 1`,
    [call.id]
  );

  if (!existingRows.length) {
    await db.query(
      `UPDATE call_requests
       SET started_at = COALESCE(started_at, ?),
           status = CASE
             WHEN status IN ('rejected_by_user', 'rejected_by_astrologer', 'completed', 'timeout', 'callend')
               THEN status
             ELSE 'ongoing'
           END
       WHERE id = ?`,
      [startedAt, call.id]
    );

    await db.query(
      `INSERT INTO call_timers (
         call_id,
         astrologer_id,
         customer_id,
         call_type,
         started_at,
         max_duration_sec,
         expires_at,
         status,
         astrologer_uid,
         user_uid
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ongoing', 0, 0)`,
      [
        call.id,
        call.astrologer_id,
        call.customer_id,
        call.call_type,
        startedAt,
        call.max_duration_sec,
        expiresAt,
      ]
    );

    return {
      startedAt,
      expiresAt,
    };
  }

  const existingRow = existingRows[0];
  const effectiveStartedAt = existingRow.started_at
    ? new Date(existingRow.started_at)
    : startedAt;
  const effectiveExpiresAt = existingRow.expires_at
    ? new Date(existingRow.expires_at)
    : expiresAt;

  await db.query(
    `UPDATE call_requests
     SET started_at = COALESCE(started_at, ?),
         status = CASE
           WHEN status IN ('rejected_by_user', 'rejected_by_astrologer', 'completed', 'timeout', 'callend')
             THEN status
           ELSE 'ongoing'
         END
     WHERE id = ?`,
    [startedAt, call.id]
  );

  await db.query(
    `UPDATE call_timers
     SET started_at = COALESCE(started_at, ?),
         expires_at = COALESCE(expires_at, ?),
         max_duration_sec = ?,
         status = CASE
           WHEN status IN ('forced_end', 'completed', 'timeout', 'rejected_by_user', 'rejected_by_astrologer', 'no_answer')
             THEN status
           ELSE 'ongoing'
         END
     WHERE call_id = ?`,
    [startedAt, expiresAt, call.max_duration_sec, call.id]
  );

  return {
    startedAt: effectiveStartedAt,
    expiresAt: effectiveExpiresAt,
  };
};

export const initChatSession = async (req, res) => {
  try {
    const callId = Number(req.body.callId);
    const participantType = String(req.body.participantType || "").toLowerCase();
    const participantId = req.body.participantId
      ? Number(req.body.participantId)
      : null;

    if (!callId || !["astrologer", "user"].includes(participantType)) {
      return res.status(400).json({
        success: false,
        message: "callId and valid participantType are required",
      });
    }

    const call = await getChatCall(callId);

    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Chat call not found",
      });
    }

    if (isClosedChatStatus(call.status) || isClosedChatStatus(call.timer_status)) {
      return res.status(410).json({
        success: false,
        ended: true,
        message: "Chat already ended",
      });
    }

    if (
      participantType === "astrologer" &&
      participantId &&
      participantId !== Number(call.astrologer_id)
    ) {
      return res.status(403).json({
        success: false,
        message: "This astrologer is not assigned to the chat",
      });
    }

    if (
      participantType === "user" &&
      participantId &&
      participantId !== Number(call.customer_id)
    ) {
      return res.status(403).json({
        success: false,
        message: "This user is not assigned to the chat",
      });
    }

    const channelName = call.channel_name || buildChannelName(call);
    console.log(
      `[CHAT INIT] callId=${call.id} participantType=${participantType} room=${channelName}`
    );

    await db.query(
      `UPDATE call_requests
       SET channel_name = ?,
           accepted_at = IFNULL(accepted_at, NOW()),
           status = CASE
             WHEN status = 'pending' THEN 'accepted'
             WHEN status = 'rejected_by_user' THEN status
             ELSE status
           END
       WHERE id = ?`,
      [channelName, call.id]
    );

    let timerWindow = null;

    if (participantType === "user" && call.status !== "rejected_by_user") {
      timerWindow = await ensureTimerRowForUserJoin({
        ...call,
        channel_name: channelName,
      });

      await publishChatEvent("chat:started", channelName, {
        callId: String(call.id),
        startedAt: serializeDate(timerWindow?.startedAt),
        expiresAt: serializeDate(timerWindow?.expiresAt),
        maxDurationSec: Number(call.max_duration_sec || 0),
      });
    }

    const historyPage = await loadChatHistoryPage({
      callId: call.id,
      roomId: channelName,
      ...getHistoryOptions(req.body),
    });
    const startedAt =
      serializeDate(timerWindow?.startedAt) ||
      serializeDate(call.timer_started_at) ||
      serializeDate(call.started_at);
    const expiresAt =
      serializeDate(timerWindow?.expiresAt) || serializeDate(call.timer_expires_at);

    return res.json({
      success: true,
      callId: String(call.id),
      channelName,
      messages: historyPage.messages,
      pagination: historyPage.pagination,
      participantType,
      callerName: call.astrologer_name || "Astrologer",
      customerName: call.user_name || "User",
      startedAt,
      expiresAt,
      maxDurationSec: Number(call.max_duration_sec || 0),
    });
  } catch (error) {
    console.error("Init chat session error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to initialize chat session",
    });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const callId = Number(req.query.callId);

    if (!callId) {
      return res.status(400).json({
        success: false,
        message: "callId is required",
      });
    }

    const call = await getChatCall(callId);

    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Chat call not found",
      });
    }

    const channelName = call.channel_name || buildChannelName(call);
    const historyPage = await loadChatHistoryPage({
      callId,
      roomId: channelName,
      ...getHistoryOptions(req.query),
    });

    console.log(
      `[CHAT HISTORY LOAD] room=${channelName || ""} callId=${callId || ""} messages=${historyPage.messages.length}`
    );

    return res.json({
      success: true,
      channelName,
      messages: historyPage.messages,
      pagination: historyPage.pagination,
      ended:
        isClosedChatStatus(call.status) || isClosedChatStatus(call.timer_status),
    });
  } catch (error) {
    console.error("Get chat messages error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch chat messages",
    });
  }
};

export const sendChatMessage = async (req, res) => {
  try {
    const callId = Number(req.body.callId);
    const senderType = String(req.body.senderType || "").toLowerCase();
    const text = String(req.body.text || "").trim();
    const hasImage = Boolean(req.body.imageBase64);

    if (!callId || !["astrologer", "user"].includes(senderType) || (!text && !hasImage)) {
      return res.status(400).json({
        success: false,
        message: "callId, senderType and text or image are required",
      });
    }

    const call = await getChatCall(callId);

    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Chat call not found",
      });
    }

    if (isClosedChatStatus(call.status) || isClosedChatStatus(call.timer_status)) {
      return res.status(409).json({
        success: false,
        ended: true,
        message: "Chat already ended",
      });
    }

    const channelName = call.channel_name || buildChannelName(call);
    const senderId =
      senderType === "astrologer"
        ? String(call.astrologer_id)
        : String(call.customer_id);
    console.log(
      `[CHAT MESSAGE] callId=${call.id} senderType=${senderType} room=${channelName}`
    );

    const imageUrl = hasImage ? await saveChatImage(req) : "";
    const message = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      callId: String(call.id),
      channelName,
      sender: senderType,
      senderId,
      text,
      messageType: imageUrl ? "image" : "text",
      imageUrl,
      sentAt: new Date().toISOString(),
    };

    await saveLiveChatMessage(call.id, channelName, message);
    await publishChatEvent("chat:message", channelName, message);

    return res.json({ 
      success: true,
      message,
    });
  } catch (error) {
    console.error("Send chat message error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to send chat message",
    });
  }
};
