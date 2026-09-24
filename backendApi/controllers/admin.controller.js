import bcrypt from "bcrypt"; // ✅ ES module
import db from "../config/db.js"; // your DB connection
import { astrologerApp, userApp } from "../config/firebase.js";
import { sendFCMNotification } from "../services/pushNotification.service.js";

const notifyTicketOwner = async (ticket, notification) => {
  const isAstrologer = ticket.customer_type === "astrologer";
  const token = isAstrologer
    ? ticket.astrologer_fcm_token
    : ticket.user_fcm_token;

  if (!token) {
    return;
  }

  try {
    await sendFCMNotification(isAstrologer ? astrologerApp : userApp, [token], {
      title: notification.title,
      message: notification.message,
      data: {
        notificationType: notification.notificationType,
        ticketId: ticket.id,
        ...(notification.status ? { status: notification.status } : {}),
      },
    });
  } catch (error) {
    console.error("Ticket notification failed:", {
      code: error?.code,
      message: error?.message,
    });
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({
        status: false,
        message: "User ID and password are required",
      });
    }

    // 🔍 Find admin by user_id
    const [rows] = await db.query(
      "SELECT admin_id, password, name FROM admins WHERE user_id = ?",
      [userId],
    );

    if (rows.length === 0) {
      return res.status(401).json({
        status: false,
        message: "Invalid credentials",
      });
    }

    const admin = rows[0];

    // 🔐 Compare password
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({
        status: false,
        message: "Invalid credentials",
      });
    }

    // ✅ Success
    return res.json({
      status: true,
      message: "Login successful",
      admin_id: admin.admin_id, // 👈 SEND admin_id
      name: admin.name,
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};

export const getAdminProfile = async (req, res) => {
  try {
    const { adminId } = req.params;
    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID is required",
      });
    }
    const [rows] = await db.query(
      "SELECT admin_id, name FROM admins WHERE admin_id = ?",
      [adminId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get admin profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
export const getPendingAstrologers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        a.id AS astrologer_id,
        a.phone_number,
        a.profile_completed,
        p.full_name,
        p.dp_name,
        p.profile_photo,
        p.experience,
        p.languages,
        p.categories,
        p.specializations
      FROM astrologers a
      JOIN astrologer_profiles p ON a.id = p.astrologer_id
      WHERE a.profile_completed = 1
        AND a.is_admin_verified = 0
    `);

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

export const verifyAstrologer = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { astrologerId } = req.params;

    const {
      rank,
      dp_name,
      experience,

      audio_total_charge,
      audio_commission_percent,
      audio_platform_fee,
      audio_call_rate,

      video_total_charge,
      video_commission_percent,
      video_platform_fee,
      video_call_rate,

      chat_total_charge,
      chat_commission_percent,
      chat_platform_fee,
      chat_rate,
    } = req.body;

    if (!astrologerId) {
      return res.status(400).json({
        status: false,
        message: "Astrologer ID required",
      });
    }

    await conn.beginTransaction();

    /* ===================== 1?? INSERT / UPDATE FEES ===================== */

    await conn.query(
      `
  INSERT INTO astrologer_fees (
    astrologer_id,

    totalAudio,
    audio_call_platform_commission,
    audio_call_rate,
    audio_platform_fee,

    totalVideo,
    video_call_platform_commission,
    video_call_rate,
    video_platform_fee,

    totalChat,
    chat_platform_commission,
    chat_rate,
    chat_platform_fee
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE

    totalAudio = VALUES(totalAudio),
    audio_call_platform_commission = VALUES(audio_call_platform_commission),
    audio_call_rate = VALUES(audio_call_rate),
    audio_platform_fee = VALUES(audio_platform_fee),

    totalVideo = VALUES(totalVideo),
    video_call_platform_commission = VALUES(video_call_platform_commission),
    video_call_rate = VALUES(video_call_rate),
    video_platform_fee = VALUES(video_platform_fee),

    totalChat = VALUES(totalChat),
    chat_platform_commission = VALUES(chat_platform_commission),
    chat_rate = VALUES(chat_rate),
    chat_platform_fee = VALUES(chat_platform_fee)
  `,
      [
        astrologerId,

        audio_total_charge,
        audio_commission_percent,
        audio_call_rate,
        audio_platform_fee,

        video_total_charge,
        video_commission_percent,
        video_call_rate,
        video_platform_fee,

        chat_total_charge,
        chat_commission_percent,
        chat_rate,
        chat_platform_fee,
      ],
    );
    /* ===================== 2️⃣ ADMIN VERIFY + RANK ===================== */

    await conn.query(
      `
      UPDATE astrologers 
      SET 
        is_admin_verified = 1,
        rank = ?,
	category = 'verified'

      WHERE id = ?
      `,
      [rank, astrologerId],
    );

    /* ===================== 3️⃣ UPDATE PROFILE (DP NAME + EXP) ===================== */

    await conn.query(
      `
      UPDATE astrologer_profiles
      SET 
        dp_name = ?,
        experience = ?
      WHERE astrologer_id = ?
      `,
      [dp_name, experience, astrologerId],
    );

    await conn.commit();

    return res.json({
      status: true,
      message: "Astrologer verified successfully",
    });
  } catch (error) {
    await conn.rollback();
    console.error("Verify astrologer error:", error);

    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  } finally {
    conn.release();
  }
};

// controllers/admin.controller.js
export const getVerifiedAstrologers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT 
        a.id AS astrologer_id,
        a.phone_number,
        a.rank,
        a.blocked_by_admin,
	a.category,
	a.founding,
        p.dp_name,
        p.full_name,
        p.profile_photo,
        p.wallet_balance,
        p.experience,
        f.audio_call_rate,
        f.audio_platform_fee,
        f.video_call_rate,
        f.video_platform_fee,
        f.chat_rate,
        f.chat_platform_fee,
	f.totalAudio,
	f.totalVideo,
	f.totalChat,
	f.audio_call_platform_commission,
	f.video_call_platform_commission,
	f.chat_platform_commission

      FROM astrologers a
      LEFT JOIN astrologer_profiles p ON p.astrologer_id = a.id
      LEFT JOIN astrologer_fees f ON f.astrologer_id = a.id
      WHERE a.is_admin_verified = 1
      ORDER BY a.rank DESC
      `,
    );

    return res.json({
      status: true,
      data: rows,
    });
    console.log(data);
  } catch (error) {
    console.error("Get verified astrologers error:", error);
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};

export const updateVerifiedAstrologer = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { astrologerId } = req.params;

    const {
      rank,
      dp_name,
      experience,
      audio_call_rate,
      audio_platform_fee,
      video_call_rate,
      video_platform_fee,
      chat_rate,
      chat_platform_fee,
      is_blocked,
      totalAudio,
      totalVideo,
      totalChat,
      audioCommission,
      videoCommission,
      chatCommission,
    } = req.body;

    if (!astrologerId) {
      return res.status(400).json({
        status: false,
        message: "Astrologer ID required",
      });
    }

    await conn.beginTransaction();

    /* ===== 1️⃣ UPDATE ASTROLOGER MAIN ===== */

    await conn.query(
      `
      UPDATE astrologers
      SET 
        rank = ?,
        blocked_by_admin = ?
      WHERE id = ?
      `,
      [rank, is_blocked ? 1 : 0, astrologerId],
    );

    /* ===== 2️⃣ UPDATE PROFILE ===== */

    await conn.query(
      `
      UPDATE astrologer_profiles
      SET 
        dp_name = ?,
        experience = ?
      WHERE astrologer_id = ?
      `,
      [dp_name, experience, astrologerId],
    );

    /* ===== 3️⃣ UPSERT FEES ===== */

    await conn.query(
      `
  UPDATE astrologer_fees
  SET
    audio_call_rate = ?,
    audio_platform_fee = ?,
    audio_call_platform_commission = ?,
    totalAudio = ?,

    video_call_rate = ?,
    video_platform_fee = ?,
    video_call_platform_commission = ?,
    totalVideo = ?,

    chat_rate = ?,
    chat_platform_fee = ?,
    chat_platform_commission = ?,
    totalChat = ?

  WHERE astrologer_id = ?
  `,
      [
        audio_call_rate,
        audio_platform_fee,
        audioCommission,
        totalAudio,

        video_call_rate,
        video_platform_fee,
        videoCommission,
        totalVideo,

        chat_rate,
        chat_platform_fee,
        chatCommission,
        totalChat,

        astrologerId,
      ],
    );
    await conn.commit();

    return res.json({
      status: true,
      message: "Astrologer updated successfully",
    });
  } catch (error) {
    await conn.rollback();
    console.error("Update verified astrologer error:", error);

    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  } finally {
    conn.release();
  }
};

// controllers/admin.controller.js

export const blockAstrologer = async (req, res) => {
  try {
    const { astrologerId } = req.params;

    if (!astrologerId) {
      return res.status(400).json({
        status: false,
        message: "Astrologer ID required",
      });
    }

    await db.query(
      `
      UPDATE astrologers
      SET blocked_by_admin = 1
      WHERE id = ?
      `,
      [astrologerId],
    );

    return res.json({
      status: true,
      message: "Astrologer blocked successfully",
    });
  } catch (error) {
    console.error("Block astrologer error:", error);
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};

export const unblockAstrologer = async (req, res) => {
  try {
    const { astrologerId } = req.params;

    if (!astrologerId) {
      return res.status(400).json({
        status: false,
        message: "Astrologer ID required",
      });
    }

    await db.query(
      `
      UPDATE astrologers
      SET blocked_by_admin = 0
      WHERE id = ?
      `,
      [astrologerId],
    );

    return res.json({
      status: true,
      message: "Astrologer unblocked successfully",
    });
  } catch (error) {
    console.error("Unblock astrologer error:", error);
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};

export const getAllTickets = async (req, res) => {
  try {
    const { limit = 200, from, to } = req.query;

    const isDateRange = from && to;

    // Build the WHERE clause and params dynamically
    let whereClause = "";
    const params = [];

    if (isDateRange) {
      whereClause =
        "WHERE st.created_at >= ? AND st.created_at < DATE_ADD(?, INTERVAL 1 DAY)";
      params.push(from, to);
    }

    const limitClause = isDateRange
      ? ""
      : `LIMIT ${Math.min(parseInt(limit) || 200, 1000)}`;

    const [tickets] = await db.query(
      `
      SELECT
        st.id,
        st.astrologer_id,
        st.issue_type,
        st.details,
        st.screenshot,
        st.status,
        st.response,
        st.customer_type,
        st.created_at,
        st.resolved_at,
 
        -- Display name:
        --   astrologer → dp_name (fallback to full_name)
        --   user       → full_name
        CASE
          WHEN st.customer_type = 'astrologer'
          THEN COALESCE(ap.dp_name, ap.full_name)
          ELSE u.full_name
        END AS full_name,
 
        CASE
          WHEN st.customer_type = 'astrologer'
          THEN a.phone_number
          ELSE u.mobile
        END AS contact_number
 
      FROM support_tickets st
 
      LEFT JOIN astrologers a
        ON st.astrologer_id = a.id
        AND st.customer_type = 'astrologer'
 
      LEFT JOIN astrologer_profiles ap
        ON ap.astrologer_id = a.id
 
      LEFT JOIN users u
        ON st.astrologer_id = u.id
        AND st.customer_type = 'user'
 
      ${whereClause}
 
      ORDER BY st.created_at DESC
      ${limitClause}
      `,
      params,
    );

    return res.json({ success: true, data: tickets });
  } catch (error) {
    console.error("getAllTickets error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch tickets" });
  }
};

export const getPendingTicketCount = async (_req, res) => {
  try {
    const [[result]] = await db.query(
      `SELECT COUNT(*) AS count
       FROM support_tickets
       WHERE status IN ('open', 'in-progress')`,
    );

    return res.json({
      success: true,
      count: Number(result?.count || 0),
    });
  } catch (error) {
    console.error("Get pending ticket count error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending ticket count",
    });
  }
};

/**
 * GET /api/admin/tickets/:ticketId
 */
export const getTicketWithComments = async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Ticket
    const [[ticket]] = await db.query(
      `SELECT * FROM support_tickets WHERE id = ?`,
      [ticketId],
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Comments
    const [comments] = await db.query(
      `
      SELECT 
        id,
        ticket_id,
        user_id,
        user_type,
        comment,
        created_at
      FROM support_ticket_comments
      WHERE ticket_id = ?
      ORDER BY created_at ASC
      `,
      [ticketId],
    );

    return res.json({
      success: true,
      data: {
        ticket,
        comments,
      },
    });
  } catch (error) {
    console.error("Ticket details error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch ticket details",
    });
  }
};

/**
 * POST /api/admin/tickets/comment
 */
export const addTicketComment = async (req, res) => {
  try {
    const { ticket_id, user_id, user_type, comment } = req.body;

    if (!ticket_id || !user_id || !user_type || !comment) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const [[ticket]] = await db.query(
      `SELECT st.id, st.customer_type, st.astrologer_id, st.status,
              u.fcmToken AS user_fcm_token,
              a.fcmToken AS astrologer_fcm_token
       FROM support_tickets st
       LEFT JOIN users u ON u.id = st.astrologer_id AND st.customer_type = 'user'
       LEFT JOIN astrologers a ON a.id = st.astrologer_id AND st.customer_type = 'astrologer'
       WHERE st.id = ?
       LIMIT 1`,
      [ticket_id],
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    await db.query(
      `
      INSERT INTO support_ticket_comments 
      (ticket_id, user_id, user_type, comment)
      VALUES (?, ?, ?, ?)
      `,
      [ticket_id, user_id, user_type, comment],
    );

    await notifyTicketOwner(ticket, {
      notificationType: "ticket_comment",
      title: "New support ticket reply",
      message: String(comment).trim(),
    });

    return res.json({
      success: true,
      message: "Comment added successfully",
    });
  } catch (error) {
    console.error("Add comment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add comment",
    });
  }
};

/**
 * PUT /api/admin/tickets/:ticketId
 */
export const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, response } = req.body;

    const [[ticket]] = await db.query(
      `SELECT st.id, st.customer_type, st.astrologer_id,
              u.fcmToken AS user_fcm_token,
              a.fcmToken AS astrologer_fcm_token
       FROM support_tickets st
       LEFT JOIN users u ON u.id = st.astrologer_id AND st.customer_type = 'user'
       LEFT JOIN astrologers a ON a.id = st.astrologer_id AND st.customer_type = 'astrologer'
       WHERE st.id = ?
       LIMIT 1`,
      [ticketId],
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    await db.query(
      `
      UPDATE support_tickets
      SET status = ?, response = ?, resolved_at = IF(? = 'resolved', NOW(), resolved_at)
      WHERE id = ?
      `,
      [status, response || null, status, ticketId],
    );

    await notifyTicketOwner(ticket, {
      notificationType: "ticket_status_changed",
      title: "Support ticket status updated",
      message: `Your ticket status is now ${String(status).replace("-", " ")}.`,
      status,
    });

    return res.json({
      success: true,
      message: "Ticket updated successfully",
    });
  } catch (error) {
    console.error("Update ticket error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update ticket",
    });
  }
};
export const getRechargeLogs = async (req, res) => {
  try {
    const { start_date, end_date, user_id } = req.query;

    let where = "";
    let params = [];

    // 🔹 user filter
    if (user_id) {
      where = "WHERE w.user_id = ?";
      params.push(user_id);
    }

    // 🔹 date filter
    if (start_date && end_date) {
      where += where ? " AND" : " WHERE";
      where += " DATE(w.created_at) BETWEEN ? AND ?";
      params.push(start_date, end_date);
    }

    const [rows] = await db.query(
      `
      SELECT 
        w.id,
        u.full_name AS user_name,
        u.mobile AS phone_number,
        w.coupon_code,
        w.coupon_bonus_amount,
        w.recharge_amount,
        w.gst_amount,
        w.payable_amount,
        w.previous_balance,
        w.after_balance,
        w.payment_status,
        w.razorpay_payment_id,
        w.created_at
      FROM wallet_recharge_logs w
      JOIN users u ON u.id = w.user_id
      ${where}
      ORDER BY w.id DESC
      `,
      params,
    );

    res.json(rows || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
export const getCallLogs = async (req, res) => {
  try {
    const { start_date, end_date, user_id } = req.query;

    let where = "";
    let params = [];

    // 🔹 user filter
    if (user_id) {
      where = "WHERE c.customer_id = ?";
      params.push(user_id);
    }

    // 🔹 date filter
    if (start_date && end_date) {
      where += where ? " AND" : " WHERE";
      where += " DATE(c.created_at) BETWEEN ? AND ?";
      params.push(start_date, end_date);
    }

    const [rows] = await db.query(
      `
      SELECT 
        c.id,
        ap.full_name AS astrologer_name,
        a.phone_number AS astrologer_mobile,

        u.full_name AS user_name,
        u.mobile AS user_mobile,

        c.call_type,
        c.duration,
        c.call_charge,
        c.platform_fee,
        c.status,
        c.started_at,
        c.ended_at,
        c.created_at

      FROM call_requests c
      JOIN astrologers a ON a.id = c.astrologer_id
      JOIN astrologer_profiles ap ON ap.astrologer_id = a.id
      JOIN users u ON u.id = c.customer_id

      ${where}
      ORDER BY c.id DESC
      `,
      params,
    );

    res.json(rows || []);
  } catch (err) {
    console.error("CALL LOG ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
export const getUsers = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 30;
    const offset = (page - 1) * limit;

    const search = req.query.search || "";
    const profile_completed = req.query.profile_completed; // 👈 NEW

    let where = "";
    let params = [];

    // 🔹 Search filter
    if (search) {
      where += where ? " AND" : " WHERE";
      where += " mobile LIKE ?";
      params.push(`%${search}%`);
    }

    // 🔹 Profile filter
    if (profile_completed !== undefined) {
      where += where ? " AND" : " WHERE";
      where += " profile_completed = ?";
      params.push(Number(profile_completed));
    }

    const [rows] = await db.query(
      `
      SELECT 
        id,
        mobile,
        full_name,
        gender,
        location,
        date_of_birth,
        time_of_birth,
        wallet_balance,
        profile_completed,
        created_at
      FROM users
      ${where}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset],
    );

    res.json(rows || []);
  } catch (err) {
    console.error("USER FETCH ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
export const getAstrologers = async (req, res) => {
  try {
    const search = req.query.search || "";

    let where = "";
    let params = [];

    if (search) {
      where = `
        WHERE ap.full_name LIKE ? 
        OR a.phone_number LIKE ?
      `;
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await db.query(
      `
      SELECT 
        a.id,
        ap.full_name,
        a.phone_number,
        ap.wallet_balance
      FROM astrologers a
      JOIN astrologer_profiles ap ON ap.astrologer_id = a.id
      ${where}
      ORDER BY a.id DESC
      `,
      params,
    );

    res.json(rows || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
export const getAstrologerCalls = async (req, res) => {
  try {
    const { astrologer_id } = req.params;
    const before_id = req.query.before_id
      ? parseInt(req.query.before_id)
      : null;

    const params = [astrologer_id];
    let whereClause = "WHERE c.astrologer_id = ?";

    if (before_id) {
      whereClause += " AND c.id < ?";
      params.push(before_id);
    }

    params.push(50); // LIMIT

    const [rows] = await db.query(
      `
      SELECT 
        c.id,
        u.full_name AS user_name,
        u.mobile AS user_mobile,
        c.call_type,
        c.duration,
        c.call_charge,
        c.platform_fee,
        c.status,
        c.created_at
      FROM call_requests c
      JOIN users u ON u.id = c.customer_id
      ${whereClause}
      ORDER BY c.id DESC
      LIMIT ?
      `,
      params,
    );

    res.json(rows || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching calls" });
  }
};

export const getAstrologerWalletLogs = async (req, res) => {
  try {
    const { astrologer_id } = req.params;
    const before_id = req.query.before_id
      ? parseInt(req.query.before_id)
      : null;

    const params = [astrologer_id];
    let whereClause = "WHERE astrologer_id = ?";

    if (before_id) {
      whereClause += " AND id < ?";
      params.push(before_id);
    }

    params.push(50); // LIMIT

    const [rows] = await db.query(
      `
      SELECT 
        id,
        type,
        amount,
        source,
        old_balance,
        new_balance,
        created_at
      FROM wallet_transactions
      ${whereClause}
      ORDER BY id DESC
      LIMIT ?
      `,
      params,
    );

    res.json(rows || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching wallet logs" });
  }
};
