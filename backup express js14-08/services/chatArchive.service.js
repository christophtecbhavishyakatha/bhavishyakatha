import db from "../config/db.js";
import redisClient from "../config/redis.js";

const CHAT_HISTORY_TTL_SECONDS = 60 * 60 * 24;
const DEFAULT_HISTORY_LIMIT = 40;
const MAX_HISTORY_LIMIT = 100;

let ensureChatArchiveTablePromise = null;

const serializeDate = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const clampHistoryLimit = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return DEFAULT_HISTORY_LIMIT;
  }

  return Math.min(Math.trunc(numericValue), MAX_HISTORY_LIMIT);
};

const parseStoredMessages = (rawMessages) =>
  rawMessages
    .map((item) => {
      try {
        return JSON.parse(item);
      } catch (error) {
        console.warn("Invalid chat message payload:", error.message);
        return null;
      }
    })
    .filter(Boolean);

const sortMessages = (messages) =>
  [...messages].sort((a, b) => {
    const left = new Date(a?.sentAt || 0).getTime();
    const right = new Date(b?.sentAt || 0).getTime();

    if (Number.isNaN(left) && Number.isNaN(right)) {
      return 0;
    }

    if (Number.isNaN(left)) {
      return 1;
    }

    if (Number.isNaN(right)) {
      return -1;
    }

    return left - right;
  });

const mergeMessages = (...groups) => {
  const seen = new Set();
  const merged = [];

  for (const group of groups) {
    for (const message of group) {
      const key = String(message?.id || "");
      if (!key || seen.has(key)) {
        continue;
      }

      seen.add(key);
      merged.push(message);
    }
  }

  return sortMessages(merged);
};

export const getChatHistoryKeyByCallId = (callId) => `chat:messages:${callId}`;

export const getChatHistoryKeyByChannel = (channelName) =>
  `chat:messages:channel:${channelName}`;

const loadMessagesFromKey = async (key) => {
  if (!key) {
    return [];
  }

  const rawMessages = await redisClient.lRange(key, 0, -1);
  return parseStoredMessages(rawMessages);
};

const saveMessagesToKey = async (key, messages) => {
  if (!key) {
    return;
  }

  await redisClient.del(key);

  if (!messages.length) {
    return;
  }

  await redisClient.rPush(key, messages.map((message) => JSON.stringify(message)));
  await redisClient.expire(key, CHAT_HISTORY_TTL_SECONDS);
};

const getRelatedChatCallIds = async (channelName) => {
  if (!channelName) {
    return [];
  }

  const [rows] = await db.query(
    `SELECT id
     FROM call_requests
     WHERE call_type = 'chat'
       AND channel_name = ?
     ORDER BY id ASC`,
    [channelName]
  );

  return rows.map((row) => Number(row.id)).filter(Boolean);
};

export const loadLiveChatMessages = async (callId, channelName) => {
  const normalizedCallId = Number(callId);
  const relatedCallIds = channelName
    ? await getRelatedChatCallIds(channelName)
    : normalizedCallId
      ? [normalizedCallId]
      : [];

  if (normalizedCallId && !relatedCallIds.includes(normalizedCallId)) {
    relatedCallIds.push(normalizedCallId);
  }

  const uniqueCallIds = [...new Set(relatedCallIds.filter(Boolean))];
  const channelHistoryKey = channelName
    ? getChatHistoryKeyByChannel(channelName)
    : "";

  const [channelMessages, callHistoryGroups] = await Promise.all([
    loadMessagesFromKey(channelHistoryKey),
    Promise.all(
      uniqueCallIds.map((relatedCallId) =>
        loadMessagesFromKey(getChatHistoryKeyByCallId(relatedCallId))
      )
    ),
  ]);

  const mergedMessages = mergeMessages(channelMessages, ...callHistoryGroups);

  if (channelHistoryKey && mergedMessages.length > channelMessages.length) {
    await saveMessagesToKey(channelHistoryKey, mergedMessages);
  }

  return mergedMessages;
};

export const saveLiveChatMessage = async (callId, channelName, message) => {
  const serialized = JSON.stringify(message);
  const callHistoryKey = getChatHistoryKeyByCallId(callId);

  await redisClient.rPush(callHistoryKey, serialized);
  await redisClient.expire(callHistoryKey, CHAT_HISTORY_TTL_SECONDS);

  if (channelName) {
    const channelHistoryKey = getChatHistoryKeyByChannel(channelName);
    await redisClient.rPush(channelHistoryKey, serialized);
    await redisClient.expire(channelHistoryKey, CHAT_HISTORY_TTL_SECONDS);
  }
};

export const ensureChatArchiveTable = async () => {
  if (!ensureChatArchiveTablePromise) {
    ensureChatArchiveTablePromise = db.query(`
      CREATE TABLE IF NOT EXISTS chat_message_history (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        room_id VARCHAR(255) NOT NULL,
        call_id BIGINT UNSIGNED NOT NULL,
        message_id VARCHAR(120) NOT NULL,
        sender_type ENUM('user', 'astrologer') NOT NULL,
        sender_id VARCHAR(120) DEFAULT NULL,
        message_text TEXT NOT NULL,
        message_type ENUM('text', 'image') NOT NULL DEFAULT 'text',
        image_url VARCHAR(500) DEFAULT NULL,
        sent_at DATETIME(3) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_room_message (room_id, message_id),
        KEY idx_room_sent (room_id, sent_at DESC, id DESC),
        KEY idx_call_sent (call_id, sent_at DESC, id DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch((error) => {
      ensureChatArchiveTablePromise = null;
      throw error;
    });
  }

  await ensureChatArchiveTablePromise;

  const [messageTypeColumns] = await db.query(
    `SHOW COLUMNS FROM chat_message_history LIKE 'message_type'`
  );
  if (!messageTypeColumns.length) {
    await db.query(`
      ALTER TABLE chat_message_history
      ADD COLUMN message_type ENUM('text', 'image') NOT NULL DEFAULT 'text'
      AFTER message_text
    `);
  }

  const [imageUrlColumns] = await db.query(
    `SHOW COLUMNS FROM chat_message_history LIKE 'image_url'`
  );
  if (!imageUrlColumns.length) {
    await db.query(`
      ALTER TABLE chat_message_history
      ADD COLUMN image_url VARCHAR(500) DEFAULT NULL
      AFTER message_type
    `);
  }
};

const buildHistoryMessage = (row) => ({
  historyId: Number(row.id),
  id: String(row.message_id),
  callId: String(row.call_id),
  channelName: String(row.room_id || ""),
  text: String(row.message_text || ""),
  sender: row.sender_type === "astrologer" ? "astrologer" : "user",
  senderId: row.sender_id != null ? String(row.sender_id) : "",
  sentAt: serializeDate(row.sent_at) || new Date(0).toISOString(),
  messageType:
    row.message_type === "image" || row.image_url ? "image" : "text",
  imageUrl: row.image_url ? String(row.image_url) : "",
});

const buildPaginationCursor = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    sentAt: serializeDate(row.sent_at),
  };
};

export const loadArchivedChatPage = async ({
  roomId,
  limit,
  beforeHistoryId,
  beforeSentAt,
}) => {
  await ensureChatArchiveTable();

  const normalizedRoomId = String(roomId || "").trim();

  if (!normalizedRoomId) {
    return {
      messages: [],
      pagination: {
        hasMore: false,
        nextCursor: null,
        limit: clampHistoryLimit(limit),
      },
    };
  }

  const pageSize = clampHistoryLimit(limit);
  const beforeIdValue = Number(beforeHistoryId);
  const normalizedBeforeSentAt = serializeDate(beforeSentAt);
  const hasCursor =
    Number.isFinite(beforeIdValue) &&
    beforeIdValue > 0 &&
    normalizedBeforeSentAt;
  const params = [normalizedRoomId];

  let sql = `
    SELECT
      id,
      room_id,
      call_id,
      message_id,
      sender_type,
      sender_id,
      message_text,
      message_type,
      image_url,
      sent_at
    FROM chat_message_history
    WHERE room_id = ?
  `;

  if (hasCursor) {
    sql += `
      AND (
        sent_at < ?
        OR (sent_at = ? AND id < ?)
      )
    `;
    params.push(new Date(normalizedBeforeSentAt), new Date(normalizedBeforeSentAt), beforeIdValue);
  }

  sql += `
    ORDER BY sent_at DESC, id DESC
    LIMIT ?
  `;
  params.push(pageSize + 1);

  const [rows] = await db.query(sql, params);
  const pageRows = rows.slice(0, pageSize);
  const hasMore = rows.length > pageSize;
  const oldestRow = pageRows[pageRows.length - 1] || null;

  return {
    messages: pageRows.reverse().map(buildHistoryMessage),
    pagination: {
      hasMore,
      nextCursor: hasMore ? buildPaginationCursor(oldestRow) : null,
      limit: pageSize,
    },
  };
};

export const loadChatHistoryPage = async ({
  callId,
  roomId,
  limit,
  beforeHistoryId,
  beforeSentAt,
}) => {
  const historyPage = await loadArchivedChatPage({
    roomId,
    limit,
    beforeHistoryId,
    beforeSentAt,
  });
  const shouldLoadLiveMessages = !beforeHistoryId && !beforeSentAt;
  const liveMessages = shouldLoadLiveMessages
    ? await loadLiveChatMessages(callId, roomId)
    : [];

  return {
    messages: mergeMessages(historyPage.messages, liveMessages),
    pagination: historyPage.pagination,
  };
};

export const archiveChatMessages = async ({ callId, channelName }) => {
  const normalizedRoomId = String(channelName || "").trim();
  const normalizedCallId = Number(callId);

  if (!normalizedRoomId || !normalizedCallId) {
    return {
      archivedCount: 0,
      clearedKeys: 0,
    };
  }

  await ensureChatArchiveTable();

  const relatedCallIds = await getRelatedChatCallIds(normalizedRoomId);
  const messages = await loadLiveChatMessages(normalizedCallId, normalizedRoomId);

  if (messages.length) {
    const values = [];
    const placeholders = messages.map((message) => {
      const sentAtIso = serializeDate(message?.sentAt) || new Date().toISOString();

      values.push(
        normalizedRoomId,
        Number(message?.callId || normalizedCallId) || normalizedCallId,
        String(message?.id || ""),
        message?.sender === "astrologer" ? "astrologer" : "user",
        message?.senderId ? String(message.senderId) : "",
        String(message?.text || ""),
        message?.messageType === "image" || message?.imageUrl ? "image" : "text",
        message?.imageUrl ? String(message.imageUrl) : null,
        new Date(sentAtIso)
      );

      return "(?, ?, ?, ?, ?, ?, ?, ?, ?)";
    });

    await db.query(
      `
        INSERT INTO chat_message_history (
          room_id,
          call_id,
          message_id,
          sender_type,
          sender_id,
          message_text,
          message_type,
          image_url,
          sent_at
        )
        VALUES ${placeholders.join(", ")}
        ON DUPLICATE KEY UPDATE
          call_id = VALUES(call_id),
          sender_type = VALUES(sender_type),
          sender_id = VALUES(sender_id),
          message_text = VALUES(message_text),
          message_type = VALUES(message_type),
          image_url = VALUES(image_url),
          sent_at = VALUES(sent_at),
          updated_at = CURRENT_TIMESTAMP
      `,
      values
    );
  }

  const keysToDelete = new Set([
    getChatHistoryKeyByChannel(normalizedRoomId),
    getChatHistoryKeyByCallId(normalizedCallId),
    ...relatedCallIds.map((relatedCallId) => getChatHistoryKeyByCallId(relatedCallId)),
  ]);

  await Promise.all(
    [...keysToDelete]
      .filter(Boolean)
      .map((key) => redisClient.del(key))
  );

  return {
    archivedCount: messages.length,
    clearedKeys: keysToDelete.size,
  };
};
