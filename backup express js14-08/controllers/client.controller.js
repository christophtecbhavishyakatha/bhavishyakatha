import db from "../config/db.js";

/**
 * GET all verified astrologers
 */
export const getAllAstrologers = async (req, res) => {
  try {
    const query = `
      SELECT 
        a.id,
        a.rank,
	a.rank_display,
	a.founding,
        ap.full_name,
        ap.dp_name,
        ap.profile_photo,
        ap.experience,
        ap.languages,
        ap.categories,
        ap.specializations,
        ap.wallet_balance,
        ast.status,
        ast.audio_call AS is_audio_available,
        ast.video_call AS is_video_available,
        ast.chat AS is_chat_available,
        ast.last_seen,
        af.audio_call_rate,
        af.audio_platform_fee,
        af.video_call_rate,
        af.video_platform_fee,
        af.chat_rate,
        af.chat_platform_fee
      FROM astrologers a
      LEFT JOIN astrologer_profiles ap ON a.id = ap.astrologer_id
      LEFT JOIN astrologer_status ast ON a.id = ast.astrologer_id
      LEFT JOIN astrologer_fees af ON a.id = af.astrologer_id
      WHERE a.is_admin_verified = 1
        AND a.blocked_by_admin = 0
      ORDER BY ast.last_seen DESC
    `;

    const [rows] = await db.query(query);

    const astrologers = rows.map(row => ({
      id: String(row.id),
      name: row.full_name ?? "Unknown",
      displayName: row.dp_name ?? row.full_name,
      specialty: row.categories ?? "Astrology",
      specializations: row.specializations
        ? row.specializations.split(",").map(s => s.trim())
        : [],
      image: row.profile_photo || "https://via.placeholder.com/100",
      rating: row.rank || 4.5,
      callRate: parseFloat(row.audio_call_rate) || 0,
      chatRate: parseFloat(row.chat_rate) || 0,
      videoRate: parseFloat(row.video_call_rate) || 0,
      audioPlatformFee: parseFloat(row.audio_platform_fee) || 0,
      videoPlatformFee: parseFloat(row.video_platform_fee) || 0,
      chatPlatformFee: parseFloat(row.chat_platform_fee) || 0,
      experience: row.experience || "0 Years",
      languages: row.languages
        ? row.languages.split(",").map(l => l.trim())
        : ["English"],
      isOnline: row.status === "online",
      status: row.status || "offline",
      lastSeen: row.last_seen,
      isAudioAvailable: row.is_audio_available === 1,
      isVideoAvailable: row.is_video_available === 1,
      isChatAvailable: row.is_chat_available === 1,
      walletBalance: parseFloat(row.wallet_balance) || 0,
      rank: row.rank || 999,
      rankDisplay:row.rank_display,	
      founding: row.founding || 0,
    }));

    res.json({
      success: true,
      count: astrologers.length,
      data: astrologers,
    });
  } catch (error) {
    console.error("DB Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch astrologers",
    });
  }
};

/**
 * GET single astrologer by ID
 */
export const getAstrologerById = async (req, res) => {
  try {
    const { id } = req.params;

    /* ---------------- ASTROLOGER DETAILS ---------------- */
    const astrologerQuery = `
      SELECT 
        a.id,
        a.rank,
	a.rank_display,
	a.founding,
        ap.full_name,
        ap.dp_name,
        ap.profile_photo,
        ap.bio,
        ap.experience,
        ap.languages,
        ap.categories,
        ap.specializations,
        ap.wallet_balance,
        ast.status,
        ast.audio_call AS is_audio_available,
        ast.video_call AS is_video_available,
        ast.chat AS is_chat_available,
        ast.last_seen,
        af.audio_call_rate,
        af.audio_platform_fee,
        af.video_call_rate,
        af.video_platform_fee,
        af.chat_rate,
        af.chat_platform_fee
      FROM astrologers a
      LEFT JOIN astrologer_profiles ap ON a.id = ap.astrologer_id
      LEFT JOIN astrologer_status ast ON a.id = ast.astrologer_id
      LEFT JOIN astrologer_fees af ON a.id = af.astrologer_id
      WHERE a.id = ?
        AND a.is_admin_verified = 1
        AND a.blocked_by_admin = 0
      LIMIT 1
    `;

    const [rows] = await db.query(astrologerQuery, [id]);

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Astrologer not found",
      });
    }

    const row = rows[0];

    /* ---------------- COMMENTS + USER NAME ---------------- */
    const commentsQuery = `
      SELECT 
        fc.comment,
        fc.created_at,
        u.full_name AS commenter_name
      FROM feedback_comments fc
      JOIN users u ON u.id = fc.user_id
      WHERE fc.astrologer_id = ?
      ORDER BY fc.created_at DESC
    `;

    const [comments] = await db.query(commentsQuery, [id]);

    /* ---------------- RESPONSE ---------------- */
    res.json({
      success: true,
      data: {
        id: String(row.id),
        name: row.full_name ?? "Unknown",
        displayName: row.dp_name ?? row.full_name,
        specialty: row.categories ?? "Astrology",
        specializations: row.specializations
          ? row.specializations.split(",").map(s => s.trim())
          : [],
        image: row.profile_photo || "https://via.placeholder.com/100",
        rating: row.rank || 4.5,
        rank_display: row.rank_display,
        callRate: parseFloat(row.audio_call_rate) || 0,
        chatRate: parseFloat(row.chat_rate) || 0,
        videoRate: parseFloat(row.video_call_rate) || 0,
        audioPlatformFee: parseFloat(row.audio_platform_fee) || 0,
        videoPlatformFee: parseFloat(row.video_platform_fee) || 0,
        chatPlatformFee: parseFloat(row.chat_platform_fee) || 0,
        experience: row.experience || "0 Years",
        languages: row.languages
          ? row.languages.split(",").map(l => l.trim())
          : ["English"],
        isOnline: row.status === "online",
        status: row.status || "offline",
        lastSeen: row.last_seen,
        isAudioAvailable: row.is_audio_available === 1,
        isVideoAvailable: row.is_video_available === 1,
        isChatAvailable: row.is_chat_available === 1,
        walletBalance: parseFloat(row.wallet_balance) || 0,
        bio: row.bio || "",
	founding: row.founding,

        /* 🔥 COMMENTS ONLY */
        comments: comments.map(c => ({
          name: c.commenter_name,
          comment: c.comment,
          createdAt: c.created_at,
        })),
      },
    });
  } catch (error) {
    console.error("DB Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch astrologer",
    });
  }
};

// controllers/feedback.controller.js

export const submitFeedback = async (req, res) => {
  try {
    const { astrologerId, userId, rating, comment } = req.body;

    if (!astrologerId || !userId) {
      return res.json({
        success: false,
        message: "Missing required fields",
      });
    }

    // 🧼 Sanitize comment (max 500 chars)
    const sanitizedComment = comment
      ? comment.toString().replace(/\s+/g, " ").trim().slice(0, 500)
      : null;

    // ⭐ Insert or update rating (allowed)
    if (rating && rating >= 1 && rating <= 5) {
      await db.query(
        `
        INSERT INTO feedback_rating (astrologer_id, user_id, rating)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE rating = VALUES(rating)
        `,
        [astrologerId, userId, rating]
      );
    }

    // 💬 Insert comment (append-only)
    if (sanitizedComment) {
      await db.query(
        `
        INSERT INTO feedback_comments (astrologer_id, user_id, comment)
        VALUES (?, ?, ?)
        `,
        [astrologerId, userId, sanitizedComment]
      );
    }

    return res.json({
      success: true,
      message: "Feedback saved successfully",
    });
  } catch (error) {
    console.error("Feedback Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Fetch initial rating for logged-in user
export const getUserRating = async (req, res) => {
  try {
    const { astrologerId, userId } = req.query;

    if (!astrologerId || !userId) {
      return res.json({
        success: true,
        rating: 0,
      });
    }

    const [rows] = await db.query(
      `
      SELECT rating
      FROM feedback_rating
      WHERE astrologer_id = ? AND user_id = ?
      LIMIT 1
      `,
      [astrologerId, userId]
    );

    return res.json({
      success: true,
      rating: rows.length ? rows[0].rating : 0,
    });
  } catch (error) {
    console.error("Get User Rating Error:", error);
    return res.status(500).json({
      success: false,
      rating: 0,
    });
  }
};

export const getTransactionHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Number(req.query.limit || 0);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const params = [userId];
    let limitClause = "";

    if (limit > 0) {
      limitClause = " LIMIT ?";
      params.push(limit);
    }

    const [rows] = await db.query(
      `
      SELECT
        CONCAT('recharge_', wrl.id) AS id,
        wrl.id AS recharge_log_id,
        'credit' AS type,
        COALESCE(wrl.credited_amount, wrl.recharge_amount, 0) AS amount,
        wrl.event_type AS description,
        wrl.event_type AS event_type,
        wrl.status AS status,
        wrl.currency AS currency,
        wrl.razorpay_order_id AS razorpay_order_id,
        wrl.razorpay_payment_id AS razorpay_payment_id,
        wrl.razorpay_signature AS razorpay_signature,
        COALESCE(wrl.recharge_amount, 0) AS recharge_amount,
        COALESCE(wrl.gst_amount, 0) AS gst_amount,
        COALESCE(wrl.payable_amount, 0) AS payable_amount,
        wrl.customer_gstin AS customer_gstin,
        wrl.coupon_code AS coupon_code,
        COALESCE(wrl.coupon_bonus_amount, 0) AS coupon_bonus_amount,
        COALESCE(wrl.credited_amount, wrl.recharge_amount, 0) AS credited_amount,
        COALESCE(wrl.previous_balance, 0) AS previous_balance,
        COALESCE(wrl.after_balance, 0) AS after_balance,
        wrl.payment_status AS payment_status,
        wrl.created_at AS created_at,
        wrl.updated_at AS updated_at
      FROM wallet_recharge_logs wrl
      WHERE wrl.user_id = ?
      ORDER BY wrl.created_at DESC${limitClause}
      `,
      params
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Transaction history error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch transaction history",
    });
  }
};

export const getCallHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Number(req.query.limit || 0);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const params = [userId];
    let limitClause = "";

    if (limit > 0) {
      limitClause = " LIMIT ?";
      params.push(limit);
    }

   const [rows] = await db.query(
  `
  SELECT
    cr.id,
    cr.astrologer_id,
    cr.customer_id,
    cr.call_type,
    cr.status,
    cr.channel_name,
    cr.max_duration_sec,
    cr.call_charge,
    cr.platform_fee,
    cr.accepted_at,
    cr.started_at,
    cr.ended_at,
    cr.created_at,
    cr.updated_at,
    cr.astrologer_uid,
    cr.user_uid,
    COALESCE(ap.dp_name, 'Astrologer') AS astrologer_name,
    TIMESTAMPDIFF(SECOND, cr.started_at, cr.ended_at) AS duration_sec,
    COALESCE(cr.call_charge, 0) + COALESCE(cr.platform_fee, 0) AS amount
  FROM call_requests cr
  LEFT JOIN astrologer_profiles ap ON ap.astrologer_id = cr.astrologer_id
  WHERE cr.customer_id = ?
    AND cr.status = 'completed'
  ORDER BY cr.created_at DESC${limitClause}
  `,
  params
);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Call history error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch call history",
    });
  }
};

export const getChatHistoryList = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const [rows] = await db.query(
      `
      SELECT
        cmh.room_id,
        cmh.message_text,
        cmh.sent_at,
        cmh.sender_id,
        cmh.sender_type,
        cr.astrologer_id,
        cr.customer_id,
        COALESCE(ap.dp_name, ap.full_name, 'Astrologer') AS astrologer_name,
        COALESCE(u.full_name, 'User') AS user_name
      FROM chat_message_history cmh
      INNER JOIN (
          SELECT room_id, MAX(sent_at) AS last_sent
          FROM chat_message_history
          WHERE room_id COLLATE utf8mb4_unicode_ci IN (
              SELECT DISTINCT channel_name COLLATE utf8mb4_unicode_ci
              FROM call_requests
              WHERE customer_id = ?
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
          WHERE customer_id = ?
            AND call_type = 'chat'
            AND channel_name IS NOT NULL
          GROUP BY channel_name
      ) latest_call
      ON latest_call.channel_name COLLATE utf8mb4_unicode_ci = cmh.room_id COLLATE utf8mb4_unicode_ci
      LEFT JOIN call_requests cr
      ON cr.id = latest_call.id
      LEFT JOIN astrologer_profiles ap
      ON ap.astrologer_id = cr.astrologer_id
      LEFT JOIN users u
      ON u.id = cr.customer_id
      ORDER BY cmh.sent_at DESC
      `,
      [userId, userId]
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Chat history list error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch chat history",
    });
  }
};

export const getChatHistoryMessages = async (req, res) => {
  try {
    const { room_id } = req.params;
    const { userId, last_id } = req.query;

    if (!room_id || !userId) {
      return res.status(400).json({
        success: false,
        message: "room_id and userId are required",
      });
    }

    let query = `
      SELECT
        cmh.id,
        cmh.room_id,
        cmh.sender_id,
        cmh.sender_type,
        cmh.message_text,
        cmh.image_url,
        cmh.sent_at
      FROM chat_message_history cmh
      WHERE cmh.room_id COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci
    `;

    const params = [room_id];

    if (last_id) {
      query += ` AND cmh.id < ?`;
      params.push(last_id);
    }

    query += `
      ORDER BY cmh.id DESC
      LIMIT 20
    `;

    const [messages] = await db.query(query, params);
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
        AND cr.customer_id = ?
        AND cr.call_type = 'chat'
      ORDER BY cr.id DESC
      LIMIT 1
      `,
      [room_id, userId]
    );

    return res.status(200).json({
      success: true,
      data: messages,
      hasMore: messages.length === 20,
      conversation: conversationRows[0] || null,
    });
  } catch (error) {
    console.error("Chat history messages error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch chat messages",
    });
  }
};
