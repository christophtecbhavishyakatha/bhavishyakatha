import db from "../config/db.js";

/* =========================================================
   GET ALL COMMENTS
   ========================================================= */

export const getAllComments = async (req, res) => {
  try {
    const {
      astrologerId = "",
      status = "all",
      search = "",
      sort = "newest",
      page = 1,
      limit = 20,
    } = req.query;

    const currentPage = Math.max(
      parseInt(page) || 1,
      1
    );

    const perPage = Math.min(
      Math.max(parseInt(limit) || 20, 1),
      100
    );

    const offset =
      (currentPage - 1) * perPage;

    /* =====================================================
       CONDITIONS
       ===================================================== */

    const conditions = [];
    const params = [];

    /* Astrologer filter */

    if (
      astrologerId &&
      astrologerId !== "all"
    ) {
      conditions.push(
        `fc.astrologer_id = ?`
      );

      params.push(astrologerId);
    }

    /* Reply status */

    if (status === "replied") {
      conditions.push(`
        fc.reply IS NOT NULL
        AND TRIM(fc.reply) != ''
      `);
    }

    if (status === "unreplied") {
      conditions.push(`
        (
          fc.reply IS NULL
          OR TRIM(fc.reply) = ''
        )
      `);
    }

    /* Search */

    if (search.trim()) {
      const searchValue =
        `%${search.trim()}%`;

      conditions.push(`
        (
          u.full_name LIKE ?
          OR ap.full_name LIKE ?
          OR ap.dp_name LIKE ?
          OR fc.comment LIKE ?
        )
      `);

      params.push(
        searchValue,
        searchValue,
        searchValue,
        searchValue
      );
    }

    const whereSQL =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    /* =====================================================
       SORTING
       ===================================================== */

    let orderSQL =
      "fc.created_at DESC";

    switch (sort) {
      case "oldest":
        orderSQL =
          "fc.created_at ASC";
        break;

      case "highest_rating":
        orderSQL =
          "a.rank DESC, fc.created_at DESC";
        break;

      case "lowest_rating":
        orderSQL =
          "a.rank ASC, fc.created_at DESC";
        break;

      case "newest":
      default:
        orderSQL =
          "fc.created_at DESC";
        break;
    }

    /* =====================================================
       TOTAL COUNT
       ===================================================== */

    const countQuery = `
      SELECT COUNT(*) AS total

      FROM feedback_comments fc

      LEFT JOIN users u
        ON u.id = fc.user_id

      LEFT JOIN astrologer_profiles ap
        ON ap.astrologer_id = fc.astrologer_id

      JOIN astrologers a
        ON a.id = fc.astrologer_id

      ${whereSQL}
    `;

    const [countRows] =
      await db.query(
        countQuery,
        params
      );

    const total = Number(
      countRows[0]?.total || 0
    );

    /* =====================================================
       FETCH COMMENTS
       ===================================================== */

    const commentsQuery = `
      SELECT

        fc.id,
        fc.user_id,
        fc.astrologer_id,

        fc.comment,
        fc.created_at,

        fc.reply,
        fc.reply_created_at,

        u.full_name
          AS commenter_name,

        a.rank
          AS rating,

        ap.full_name
          AS astrologer_name,

        ap.dp_name
          AS astrologer_dp_name,

        ap.profile_photo
          AS astrologer_photo

      FROM feedback_comments fc

      JOIN users u
        ON u.id = fc.user_id

      JOIN astrologers a
        ON a.id = fc.astrologer_id

      LEFT JOIN astrologer_profiles ap
        ON ap.astrologer_id =
           fc.astrologer_id

      ${whereSQL}

      ORDER BY ${orderSQL}

      LIMIT ? OFFSET ?
    `;

    const commentParams = [
      ...params,
      perPage,
      offset,
    ];

    const [comments] =
      await db.query(
        commentsQuery,
        commentParams
      );

    /* =====================================================
       RESPONSE
       ===================================================== */

    res.json({
      success: true,

      data: comments.map((c) => ({
        id: String(c.id),

        userId: c.user_id
          ? String(c.user_id)
          : null,

        userName:
          c.commenter_name ||
          "Unknown User",

        astrologerId:
          c.astrologer_id
            ? String(c.astrologer_id)
            : null,

        astrologerName:
          c.astrologer_dp_name ||
          c.astrologer_name ||
          "Unknown Astrologer",

        astrologerPhoto:
          c.astrologer_photo ||
          null,

        /* Rating comes from astrologers.rank */

        rating:
          Number(c.rating || 0),

        comment:
          c.comment || "",

        createdAt:
          c.created_at,

        reply:
          c.reply || null,

        replyCreatedAt:
          c.reply_created_at || null,

        isReplied:
          Boolean(
            c.reply &&
            String(c.reply).trim()
          ),
      })),

      pagination: {
        page: currentPage,
        limit: perPage,
        total,

        totalPages:
          Math.ceil(
            total / perPage
          ),

        hasNextPage:
          currentPage <
          Math.ceil(
            total / perPage
          ),

        hasPreviousPage:
          currentPage > 1,
      },
    });

  } catch (error) {
    console.error(
      "Get all comments error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch comments",
    });
  }
};


/* =========================================================
   GET SINGLE COMMENT
   ========================================================= */

export const getCommentById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT

        fc.id,
        fc.user_id,
        fc.astrologer_id,

        fc.comment,
        fc.created_at,

        fc.reply,
        fc.reply_created_at,

        a.rank AS rating,

        u.full_name AS user_name,

        ap.full_name
          AS astrologer_full_name,

        ap.dp_name
          AS astrologer_name,

        ap.profile_photo
          AS astrologer_photo

      FROM feedback_comments fc

      LEFT JOIN users u
        ON u.id = fc.user_id

      JOIN astrologers a
        ON a.id = fc.astrologer_id

      LEFT JOIN astrologer_profiles ap
        ON ap.astrologer_id =
           fc.astrologer_id

      WHERE fc.id = ?

      LIMIT 1
    `;

    const [rows] =
      await db.query(
        query,
        [id]
      );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message:
          "Comment not found",
      });
    }

    const c = rows[0];

    res.json({
      success: true,

      data: {
        id: String(c.id),

        userId:
          c.user_id
            ? String(c.user_id)
            : null,

        userName:
          c.user_name ||
          "Unknown User",

        astrologerId:
          c.astrologer_id
            ? String(c.astrologer_id)
            : null,

        astrologerName:
          c.astrologer_name ||
          c.astrologer_full_name ||
          "Unknown Astrologer",

        astrologerPhoto:
          c.astrologer_photo ||
          null,

        rating:
          Number(c.rating || 0),

        comment:
          c.comment || "",

        createdAt:
          c.created_at,

        reply:
          c.reply || null,

        replyCreatedAt:
          c.reply_created_at || null,

        isReplied:
          Boolean(
            c.reply &&
            String(c.reply).trim()
          ),
      },
    });

  } catch (error) {
    console.error(
      "Get comment error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch comment",
    });
  }
};


/* =========================================================
   GET ASTROLOGERS
   Used for Astrologer-wise filter
   ========================================================= */

export const getCommentAstrologers =
  async (req, res) => {
    try {

      const query = `
        SELECT DISTINCT

          a.id,

          COALESCE(
            ap.dp_name,
            ap.full_name,
            'Unknown Astrologer'
          ) AS name,

          ap.profile_photo AS photo

        FROM feedback_comments fc

        JOIN astrologers a
          ON a.id = fc.astrologer_id

        LEFT JOIN astrologer_profiles ap
          ON ap.astrologer_id =
             a.id

        WHERE
          a.is_admin_verified = 1
          AND a.blocked_by_admin = 0

        ORDER BY name ASC
      `;

      const [rows] =
        await db.query(query);

      res.json({
        success: true,

        data: rows.map((row) => ({
          id: String(row.id),

          name:
            row.name ||
            "Unknown Astrologer",

          photo:
            row.photo ||
            null,
        })),
      });

    } catch (error) {

      console.error(
        "Get comment astrologers error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to fetch astrologers",
      });
    }
  };


/* =========================================================
   ADD REPLY
   ========================================================= */

export const replyToComment =
  async (req, res) => {
    try {

      const { id } = req.params;

      const { reply } = req.body;

      if (
        !reply ||
        !String(reply).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Reply is required",
        });
      }

      const cleanReply =
        String(reply).trim();

      if (cleanReply.length > 1000) {
        return res.status(400).json({
          success: false,
          message:
            "Reply cannot exceed 1000 characters",
        });
      }

      /* Check comment */

      const [comments] =
        await db.query(
          `
            SELECT id
            FROM feedback_comments
            WHERE id = ?
            LIMIT 1
          `,
          [id]
        );

      if (!comments.length) {
        return res.status(404).json({
          success: false,
          message:
            "Comment not found",
        });
      }

      /* Check existing reply */

      const [existing] =
        await db.query(
          `
            SELECT reply
            FROM feedback_comments
            WHERE id = ?
            LIMIT 1
          `,
          [id]
        );

      if (
        existing[0]?.reply &&
        String(
          existing[0].reply
        ).trim()
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Comment already has a reply. Use edit instead.",
        });
      }

      /* Save reply */

      await db.query(
        `
          UPDATE feedback_comments

          SET
            reply = ?,
            reply_created_at = NOW()

          WHERE id = ?
        `,
        [
          cleanReply,
          id,
        ]
      );

      res.json({
        success: true,
        message:
          "Bhavishya Katha reply added successfully",

        data: {
          id: String(id),

          reply: cleanReply,

          replyCreatedAt:
            new Date(),
        },
      });

    } catch (error) {

      console.error(
        "Reply to comment error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to add reply",
      });
    }
  };


/* =========================================================
   EDIT REPLY
   ========================================================= */

export const editCommentReply =
  async (req, res) => {
    try {

      const { id } = req.params;

      const { reply } = req.body;

      if (
        !reply ||
        !String(reply).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Reply is required",
        });
      }

      const cleanReply =
        String(reply).trim();

      if (cleanReply.length > 1000) {
        return res.status(400).json({
          success: false,
          message:
            "Reply cannot exceed 1000 characters",
        });
      }

      const [rows] =
        await db.query(
          `
            SELECT id, reply
            FROM feedback_comments
            WHERE id = ?
            LIMIT 1
          `,
          [id]
        );

      if (!rows.length) {
        return res.status(404).json({
          success: false,
          message:
            "Comment not found",
        });
      }

      if (
        !rows[0].reply ||
        !String(
          rows[0].reply
        ).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No existing reply. Use add reply instead.",
        });
      }

      await db.query(
        `
          UPDATE feedback_comments

          SET
            reply = ?,
            reply_created_at = NOW()

          WHERE id = ?
        `,
        [
          cleanReply,
          id,
        ]
      );

      res.json({
        success: true,

        message:
          "Bhavishya Katha reply updated successfully",

        data: {
          id: String(id),

          reply: cleanReply,

          replyCreatedAt:
            new Date(),
        },
      });

    } catch (error) {

      console.error(
        "Edit comment reply error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to update reply",
      });
    }
  };


/* =========================================================
   DELETE REPLY
   ========================================================= */

export const deleteCommentReply =
  async (req, res) => {
    try {

      const { id } = req.params;

      const [rows] =
        await db.query(
          `
            SELECT id, reply
            FROM feedback_comments
            WHERE id = ?
            LIMIT 1
          `,
          [id]
        );

      if (!rows.length) {
        return res.status(404).json({
          success: false,
          message:
            "Comment not found",
        });
      }

      if (
        !rows[0].reply ||
        !String(
          rows[0].reply
        ).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No reply found",
        });
      }

      await db.query(
        `
          UPDATE feedback_comments

          SET
            reply = NULL,
            reply_created_at = NULL

          WHERE id = ?
        `,
        [id]
      );

      res.json({
        success: true,

        message:
          "Bhavishya Katha reply deleted successfully",
      });

    } catch (error) {

      console.error(
        "Delete comment reply error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to delete reply",
      });
    }
  };

/* =========================================================
   DELETE WHOLE COMMENT
   ========================================================= */

export const deleteWholeComment = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT id FROM feedback_comments WHERE id = ? LIMIT 1`,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    await db.query(`DELETE FROM feedback_comments WHERE id = ?`, [id]);

    return res.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Delete whole comment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete comment",
    });
  }
};
