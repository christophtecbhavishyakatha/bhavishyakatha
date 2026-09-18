import db from "../config/db.js";

const ADMIN_REPLY_NAME = "Bhavishya Katha";
const POST_MAX_LENGTH = 5000;
const COMMENT_MAX_LENGTH = 500;
const DEFAULT_POST_PAGE_SIZE = 10;
const MAX_POST_PAGE_SIZE = 20;

let ensureSocialSchemaPromise = null;

const sanitizePostContent = (value) =>
  String(value ?? "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, POST_MAX_LENGTH);

const sanitizeSingleLineText = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, COMMENT_MAX_LENGTH);

const sanitizeBase64Image = (value) => {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return "";
  }

  return normalizedValue.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
};

const toMySqlDateTime = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const parsePublishAt = (value) => {
  if (!value) {
    return new Date();
  }

  const trimmed = String(value).trim();

  if (!trimmed) {
    return new Date();
  }

  let parsedDate = null;

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(trimmed)) {
    parsedDate = new Date(trimmed.replace(" ", "T") + ":00");
  } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    parsedDate = new Date(trimmed.replace(" ", "T"));
  } else {
    parsedDate = new Date(trimmed);
  }

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

const buildPostStatus = (post) => {
  if (!Number(post.is_active)) {
    return "inactive";
  }

  const publishTime = new Date(post.publish_at).getTime();

  if (!Number.isNaN(publishTime) && publishTime > Date.now()) {
    return "scheduled";
  }

  return "published";
};

const normalizePagination = (query) => {
  const limit = Math.min(
    Math.max(Number(query.limit) || DEFAULT_POST_PAGE_SIZE, 1),
    MAX_POST_PAGE_SIZE
  );
  const offset = Math.max(Number(query.offset) || 0, 0);

  return { limit, offset };
};

export const ensureSocialSchema = async () => {
  if (!ensureSocialSchemaPromise) {
    ensureSocialSchemaPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS social_posts (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          admin_id BIGINT UNSIGNED NOT NULL,
          content TEXT NOT NULL,
          image_base64 MEDIUMTEXT DEFAULT NULL,
          publish_at DATETIME NOT NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_social_posts_publish_at (publish_at),
          KEY idx_social_posts_active_publish (is_active, publish_at),
          KEY idx_social_posts_admin_id (admin_id)
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS social_post_comments (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          post_id BIGINT UNSIGNED NOT NULL,
          user_id BIGINT UNSIGNED NOT NULL,
          user_name VARCHAR(255) NOT NULL,
          comment TEXT NOT NULL,
          admin_reply TEXT DEFAULT NULL,
          admin_reply_at DATETIME DEFAULT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_social_comments_post_id (post_id),
          KEY idx_social_comments_user_id (user_id),
          KEY idx_social_comments_created_at (created_at)
        )
      `);

      const [imageColumns] = await db.query(
        `SHOW COLUMNS FROM social_posts LIKE 'image_base64'`
      );

      if (!imageColumns.length) {
        await db.query(
          `ALTER TABLE social_posts
           ADD COLUMN image_base64 MEDIUMTEXT DEFAULT NULL
           AFTER content`
        );
      }
    })().catch((error) => {
      ensureSocialSchemaPromise = null;
      throw error;
    });
  }

  await ensureSocialSchemaPromise;
};

const getAdminRecord = async (adminId) => {
  const normalizedAdminId = Number(adminId);

  if (!normalizedAdminId) {
    return null;
  }

  const [[admin]] = await db.query(
    `SELECT admin_id, name
     FROM admins
     WHERE admin_id = ?
     LIMIT 1`,
    [normalizedAdminId]
  );

  return admin || null;
};

const getVisiblePostById = async (postId) => {
  const normalizedPostId = Number(postId);

  if (!normalizedPostId) {
    return null;
  }

  const [[post]] = await db.query(
    `SELECT id, is_active, publish_at
     FROM social_posts
     WHERE id = ?
       AND is_active = 1
       AND publish_at <= NOW()
     LIMIT 1`,
    [normalizedPostId]
  );

  return post || null;
};

const mapCommentsByPost = async (postIds) => {
  if (!postIds.length) {
    return new Map();
  }

  const placeholders = postIds.map(() => "?").join(", ");
  const [comments] = await db.query(
    `SELECT id, post_id, user_id, user_name, comment, admin_reply, admin_reply_at, created_at
     FROM social_post_comments
     WHERE post_id IN (${placeholders})
     ORDER BY created_at ASC, id ASC`,
    postIds
  );

  const commentMap = new Map();

  for (const row of comments) {
    const postId = Number(row.post_id);
    const list = commentMap.get(postId) || [];
    list.push({
      id: Number(row.id),
      userId: Number(row.user_id),
      userName: row.user_name,
      comment: row.comment,
      createdAt: row.created_at,
      adminReply: row.admin_reply || "",
      adminReplyAt: row.admin_reply_at,
      adminReplyName: row.admin_reply ? ADMIN_REPLY_NAME : "",
    });
    commentMap.set(postId, list);
  }

  return commentMap;
};

const mapPostsResponse = async (posts) => {
  const postIds = posts.map((post) => Number(post.id));
  const commentMap = await mapCommentsByPost(postIds);

  return posts.map((post) => {
    const postId = Number(post.id);
    const comments = commentMap.get(postId) || [];

    return {
      id: postId,
      authorName: ADMIN_REPLY_NAME,
      content: post.content,
      imageBase64: post.image_base64 || "",
      publishAt: post.publish_at,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      isActive: Boolean(post.is_active),
      status: buildPostStatus(post),
      commentCount: comments.length,
      comments,
    };
  });
};

export const getPublicSocialPosts = async (req, res) => {
  try {
    await ensureSocialSchema();
    const { limit, offset } = normalizePagination(req.query);

    const [posts] = await db.query(
      `SELECT id, content, image_base64, publish_at, is_active, created_at, updated_at
       FROM social_posts
       WHERE is_active = 1
         AND publish_at <= NOW()
       ORDER BY publish_at DESC, id DESC`
       + ` LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [[countRow]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM social_posts
       WHERE is_active = 1
         AND publish_at <= NOW()`
    );

    const data = await mapPostsResponse(posts);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        limit,
        offset,
        total: Number(countRow?.total || 0),
        hasMore: offset + data.length < Number(countRow?.total || 0),
      },
    });
  } catch (error) {
    console.error("Get public social posts error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load posts",
    });
  }
};

export const addPublicSocialComment = async (req, res) => {
  try {
    await ensureSocialSchema();

    const postId = Number(req.params.postId);
    const userId = Number(req.body.userId);
    const comment = sanitizeSingleLineText(req.body.comment);

    if (!postId || !userId || !comment) {
      return res.status(400).json({
        success: false,
        message: "Valid postId, userId and comment are required",
      });
    }

    const post = await getVisiblePostById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found or not published yet",
      });
    }

    const [[user]] = await db.query(
      `SELECT id, full_name
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const commenterName = sanitizeSingleLineText(user.full_name || "User");

    await db.query(
      `INSERT INTO social_post_comments (post_id, user_id, user_name, comment)
       VALUES (?, ?, ?, ?)`,
      [postId, userId, commenterName, comment]
    );

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
    });
  } catch (error) {
    console.error("Add public social comment error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to add comment",
    });
  }
};

export const getAdminSocialPosts = async (req, res) => {
  try {
    await ensureSocialSchema();

    const [posts] = await db.query(
      `SELECT id, admin_id, content, image_base64, publish_at, is_active, created_at, updated_at
       FROM social_posts
       ORDER BY publish_at DESC, id DESC`
    );

    const data = await mapPostsResponse(posts);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get admin social posts error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load admin posts",
    });
  }
};

export const createAdminSocialPost = async (req, res) => {
  try {
    await ensureSocialSchema();

    const adminId = Number(req.body.adminId);
    const content = sanitizePostContent(req.body.content);
    const imageBase64 = sanitizeBase64Image(req.body.imageBase64);
    const publishDate = parsePublishAt(req.body.publishAt);

    if (!adminId || (!content && !imageBase64)) {
      return res.status(400).json({
        success: false,
        message: "Valid adminId and at least one of content or image are required",
      });
    }

    if (!publishDate) {
      return res.status(400).json({
        success: false,
        message: "publishAt is invalid",
      });
    }

    const admin = await getAdminRecord(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const publishAt = toMySqlDateTime(publishDate);

    const [result] = await db.query(
      `INSERT INTO social_posts (admin_id, content, image_base64, publish_at, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [adminId, content, imageBase64 || null, publishAt]
    );

    return res.status(201).json({
      success: true,
      message:
        publishDate.getTime() > Date.now()
          ? "Post scheduled successfully"
          : "Post published successfully",
      data: {
        id: Number(result.insertId || 0),
      },
    });
  } catch (error) {
    console.error("Create admin social post error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create post",
    });
  }
};

export const replyToSocialComment = async (req, res) => {
  try {
    await ensureSocialSchema();

    const commentId = Number(req.params.commentId);
    const adminId = Number(req.body.adminId);
    const reply = sanitizeSingleLineText(req.body.reply);

    if (!commentId || !adminId || !reply) {
      return res.status(400).json({
        success: false,
        message: "Valid commentId, adminId and reply are required",
      });
    }

    const admin = await getAdminRecord(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const [[comment]] = await db.query(
      `SELECT id, admin_reply
       FROM social_post_comments
       WHERE id = ?
       LIMIT 1`,
      [commentId]
    );

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    await db.query(
      `UPDATE social_post_comments
       SET admin_reply = ?, admin_reply_at = NOW()
       WHERE id = ?`,
      [reply, commentId]
    );

    return res.status(200).json({
      success: true,
      message: comment.admin_reply ? "Reply updated successfully" : "Reply added successfully",
    });
  } catch (error) {
    console.error("Reply to social comment error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to save reply",
    });
  }
};

export const deleteAdminSocialPost = async (req, res) => {
  try {
    await ensureSocialSchema();

    const postId = Number(req.params.postId);
    const adminId = Number(req.body.adminId || req.query.adminId);

    if (!postId || !adminId) {
      return res.status(400).json({
        success: false,
        message: "Valid postId and adminId are required",
      });
    }

    const admin = await getAdminRecord(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const [[post]] = await db.query(
      `SELECT id
       FROM social_posts
       WHERE id = ?
       LIMIT 1`,
      [postId]
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    await db.query(
      `DELETE FROM social_post_comments
       WHERE post_id = ?`,
      [postId]
    );

    await db.query(
      `DELETE FROM social_posts
       WHERE id = ?`,
      [postId]
    );

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Delete admin social post error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete post",
    });
  }
};

export const deleteAdminSocialComment = async (req, res) => {
  try {
    await ensureSocialSchema();

    const commentId = Number(req.params.commentId);
    const adminId = Number(req.body.adminId || req.query.adminId);

    if (!commentId || !adminId) {
      return res.status(400).json({
        success: false,
        message: "Valid commentId and adminId are required",
      });
    }

    const admin = await getAdminRecord(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const [[comment]] = await db.query(
      `SELECT id
       FROM social_post_comments
       WHERE id = ?
       LIMIT 1`,
      [commentId]
    );

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    await db.query(
      `DELETE FROM social_post_comments
       WHERE id = ?`,
      [commentId]
    );

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Delete admin social comment error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete comment",
    });
  }
};
