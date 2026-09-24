import { default as db, default as pool } from "../config/db.js";
import { astrologerApp, userApp } from "../config/firebase.js";
import { sendFCMNotification } from "../services/pushNotification.service.js";

export const sendNotification = async (req, res) => {
  try {
    const { recipientType, targetType, title, message } = req.body;

    // ---------------------------------------------
    // Validation
    // ---------------------------------------------

    if (!recipientType) {
      return res.status(400).json({
        success: false,
        message: "recipientType is required",
      });
    }

    if (!targetType) {
      return res.status(400).json({
        success: false,
        message: "targetType is required",
      });
    }

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notification title is required",
      });
    }

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notification message is required",
      });
    }

    // ---------------------------------------------
    // Validate target
    // ---------------------------------------------

    if (recipientType === "user") {
      const allowed = [
        "low_balance",
        "previous_consultation",
        "no_consultation",
        "all",
      ];

      if (!allowed.includes(targetType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user targetType",
        });
      }
    }

    if (recipientType === "astrologer") {
      const allowed = ["all", "incomplete_profile"];

      if (!allowed.includes(targetType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid astrologer targetType",
        });
      }
    }

    // ---------------------------------------------
    // USER
    // ---------------------------------------------

    if (recipientType === "user") {
      let rows = [];

      // -------------------------------------------
      // LOW BALANCE
      // -------------------------------------------

      if (targetType === "low_balance") {
        const [result] = await db.execute(`
          SELECT id, fcmToken
          FROM users
          WHERE fcmToken IS NOT NULL
            AND fcmToken != ''
            AND wallet_balance <= 20
        `);

        rows = result;
      }

      // -------------------------------------------
      // PREVIOUS CONSULTATION
      // -------------------------------------------
      else if (targetType === "previous_consultation") {
        const [result] = await db.execute(`
          SELECT DISTINCT
            u.id,
            u.fcmToken
          FROM users u
          INNER JOIN call_requests cr
            ON cr.customer_id = u.id
          WHERE u.fcmToken IS NOT NULL
            AND u.fcmToken != ''
            AND cr.status = 'completed'
        `);

        rows = result;
      }

      // -------------------------------------------
      // NO CONSULTATION YET
      // -------------------------------------------
      else if (targetType === "no_consultation") {
        const [result] = await db.execute(`
          SELECT
            u.id,
            u.fcmToken
          FROM users u
          WHERE u.fcmToken IS NOT NULL
            AND u.fcmToken != ''
            AND NOT EXISTS (
              SELECT 1
              FROM call_requests cr
              WHERE cr.customer_id = u.id
                AND cr.status = 'completed'
            )
        `);

        rows = result;
      }

      // -------------------------------------------
      // ALL USERS
      // -------------------------------------------
      else if (targetType === "all") {
        const [result] = await db.execute(`
          SELECT id, fcmToken
          FROM users
          WHERE fcmToken IS NOT NULL
            AND fcmToken != ''
        `);

        rows = result;
      }

      // -------------------------------------------
      // Extract tokens
      // -------------------------------------------

      const tokens = [
        ...new Set(rows.map((row) => row.fcmToken).filter(Boolean)),
      ];

      if (tokens.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No users found for this notification",
          totalRecipients: 0,
          successCount: 0,
          failureCount: 0,
        });
      }

      // -------------------------------------------
      // Send using USER Firebase app
      // -------------------------------------------

      const result = await sendFCMNotification(userApp, tokens, {
        title,
        message,
        data: {
          notificationType: "admin_notification",
          recipientType,
          targetType,
        },
      });

      return res.status(200).json({
        success: true,
        message: "User notification sent",
        recipientType,
        targetType,
        totalRecipients: tokens.length,
        ...result,
      });
    }

    // ---------------------------------------------
    // ASTROLOGER
    // ---------------------------------------------

    if (recipientType === "astrologer") {
      let rows = [];

      // -------------------------------------------
      // ALL ASTROLOGERS
      // -------------------------------------------

      if (targetType === "all") {
        const [result] = await pool.execute(`
          SELECT id, fcmToken
          FROM astrologers
          WHERE fcmToken IS NOT NULL
            AND fcmToken != ''
        `);

        rows = result;
      }

      // -------------------------------------------
      // INCOMPLETE PROFILE
      // -------------------------------------------
      else if (targetType === "incomplete_profile") {
        const [result] = await pool.execute(`
          SELECT id, fcmToken
          FROM astrologers
          WHERE fcmToken IS NOT NULL
            AND fcmToken != ''
            AND (
              profile_completed IS NULL
              OR profile_completed != 1
            )
        `);

        rows = result;
      }

      // -------------------------------------------
      // Extract tokens
      // -------------------------------------------

      const tokens = [
        ...new Set(rows.map((row) => row.fcmToken).filter(Boolean)),
      ];

      if (tokens.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No astrologers found for this notification",
          totalRecipients: 0,
          successCount: 0,
          failureCount: 0,
        });
      }

      // -------------------------------------------
      // Send using ASTROLOGER Firebase app
      // -------------------------------------------

      const result = await sendFCMNotification(astrologerApp, tokens, {
        title,
        message,
        data: {
          notificationType: "admin_notification",
          recipientType,
          targetType,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Astrologer notification sent",
        recipientType,
        targetType,
        totalRecipients: tokens.length,
        ...result,
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid recipientType",
    });
  } catch (error) {
    console.error("sendNotification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send notification",
      error: error.message,
    });
  }
};
