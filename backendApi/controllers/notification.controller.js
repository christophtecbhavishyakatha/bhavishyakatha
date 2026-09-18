import db from "../config/db.js";
import pool from "../config/db.js";
import { userApp, astrologerApp } from "../config/firebase.js";

export const sendNotification = async (req, res) => {
  try {
    const {
      recipientType,
      targetType,
      title,
      message,
    } = req.body;

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
      const allowed = [
        "all",
        "incomplete_profile",
      ];

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
        ...new Set(
          rows
            .map((row) => row.fcmToken)
            .filter(Boolean)
        ),
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

      const result = await sendFCMNotification(
        userApp,
        tokens,
        title,
        message,
        recipientType,
        targetType
      );

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
        ...new Set(
          rows
            .map((row) => row.fcmToken)
            .filter(Boolean)
        ),
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

      const result = await sendFCMNotification(
        astrologerApp,
        tokens,
        title,
        message,
        recipientType,
        targetType
      );

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


// =====================================================
// FCM HELPER
// =====================================================

const sendFCMNotification = async (
  firebaseApp,
  tokens,
  title,
  message,
  recipientType,
  targetType
) => {
  let successCount = 0;
  let failureCount = 0;

  const batchSize = 500;

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);

    const messaging = firebaseApp.messaging();

    // Send notification
    const response = await messaging.sendEachForMulticast({
      tokens: batch,

      notification: {
        title: title.trim(),
        body: message.trim(),
      },

      data: {
        notificationType: "admin_notification",
        recipientType: String(recipientType),
        targetType: String(targetType),
      },

      android: {
        priority: "high",

        notification: {
          sound: "default",
        },
      },
    });

    // Count
    successCount += response.successCount;
    failureCount += response.failureCount;

    // ---------------------------------------------
    // Print exact FCM errors
    // ---------------------------------------------

    response.responses.forEach((result, index) => {
      if (!result.success) {
        console.log("================================");
        console.log("FCM FAILED");
        console.log("Token:", batch[index]);
        console.log("Code:", result.error?.code);
        console.log("Message:", result.error?.message);
        console.log("================================");
      }
    });

    console.log(
      `FCM batch: ${response.successCount} success, ${response.failureCount} failed`
    );
  }

  return {
    successCount,
    failureCount,
  };
};