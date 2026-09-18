// services/astrologerStatus.service.js
import db from "../config/db.js";

export const upsertStatus = async ({
  astrologer_id,
  status,
  audio,
  video,
  chat,
}) => {
  const validStatuses = ["online", "offline", "busy"];
  if (!validStatuses.includes(status)) {
    throw new Error("Invalid status");
  }

  const [[existing]] = await db.query(
    `SELECT id FROM astrologer_status WHERE astrologer_id = ?`,
    [astrologer_id]
  );

  if (existing) {
    await db.query(
      `UPDATE astrologer_status
       SET status = ?,
           audio_call = ?,
           video_call = ?,
           chat = ?,
           updated_at = NOW(),
           last_seen = NOW()
       WHERE astrologer_id = ?`,
      [
        status,
        audio ? 1 : 0,
        video ? 1 : 0,
        chat ? 1 : 0,
        astrologer_id,
      ]
    );
  } else {
    await db.query(
      `INSERT INTO astrologer_status
       (astrologer_id, status, audio_call, video_call, chat, last_seen)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        astrologer_id,
        status,
        audio ? 1 : 0,
        video ? 1 : 0,
        chat ? 1 : 0,
      ]
    );
  }
};

export const getStatusWithProfile = async (astrologer_id) => {
    touchLastSeen(astrologer_id);
  const [[row]] = await db.query(
    `SELECT 
       s.status,
       s.audio_call,
       s.video_call,
       s.chat,
       s.last_seen,
       p.full_name,
       p.dp_name,
       p.wallet_balance
     FROM astrologer_status s
     LEFT JOIN astrologer_profiles p
       ON p.astrologer_id = s.astrologer_id
     WHERE s.astrologer_id = ?`,
    [astrologer_id]
  );

  return row || null;
};

export const touchLastSeen = async (astrologer_id) => {
  await db.query(
    `UPDATE astrologer_status
     SET last_seen = NOW()
     WHERE astrologer_id = ?`,
    [astrologer_id]
  );
};