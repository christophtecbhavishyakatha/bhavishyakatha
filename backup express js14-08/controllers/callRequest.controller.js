import pool from "../config/db.js";
import { astrologerApp } from "../config/firebase.js";

const getAstrologerWalletBalance = async (astrologerId) => {
  const [[row]] = await pool.query(
    `SELECT COALESCE(wallet_balance, 0) AS wallet_balance
     FROM astrologer_profiles
     WHERE astrologer_id = ?`,
    [astrologerId]
  );

  return Number(row?.wallet_balance || 0);
};

const insertCallWalletLog = async ({
  requestId,
  userId,
  astrologerId,
  callType,
  eventType,
  userWalletBefore = null,
  astrologerWalletBefore = null,
  userWalletAfter = null,
  astrologerWalletAfter = null,
  ratePerMinute = null,
  platformFeePerMinute = null,
  callCharge = null,
  platformFee = null,
  totalCustomerCharge = null,
}) => {
  await pool.query(
    `INSERT INTO call_wallet_logs
     (call_request_id, customer_id, astrologer_id, call_type, event_type,
      user_wallet_before, astrologer_wallet_before, user_wallet_after, astrologer_wallet_after,
      rate_per_minute, platform_fee_per_minute, call_charge, platform_fee, total_customer_charge)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      requestId,
      userId,
      astrologerId,
      callType,
      eventType,
      userWalletBefore,
      astrologerWalletBefore,
      userWalletAfter,
      astrologerWalletAfter,
      ratePerMinute,
      platformFeePerMinute,
      callCharge,
      platformFee,
      totalCustomerCharge,
    ]
  );
};

export const createAudioCallRequest = async (req, res) => {
  try {
    console.log("createAudioCallRequest API HIT");

    const { astrologerId, userId } = req.body;
    console.log("call details", astrologerId, userId);

    if (!astrologerId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
      });
    }
/*
    const [pendingRows] = await pool.query(
      `SELECT id FROM call_requests
       WHERE customer_id = ?
         AND status = 'pending'`,
      [userId]
    );

    if (pendingRows.length > 0) {
      return res.json({
        success: false,
        code: "PREVIOUS_REQUEST_PENDING",
        message: "Previous request is still pending",
      });
    }
*/
    const [userRows] = await pool.query(
      `SELECT wallet_balance FROM users WHERE id = ?`,
      [userId]
    );

    if (!userRows.length) {
      return res.json({ success: false, message: "User not found" });
    }

    const walletBalance = Number(userRows[0].wallet_balance);
    const astrologerWalletBalance = await getAstrologerWalletBalance(astrologerId);

    const [feeRows] = await pool.query(
      `SELECT audio_call_rate, audio_platform_fee
       FROM astrologer_fees
       WHERE astrologer_id = ?`,
      [astrologerId]
    );

    if (!feeRows.length) {
      return res.json({ success: false, message: "Astrologer fees not set" });
    }

    const audioRate = Number(feeRows[0].audio_call_rate);
    const platformFee = Number(feeRows[0].audio_platform_fee);
    const perMinuteCost = audioRate + platformFee;

    if (walletBalance < perMinuteCost) {
      return res.json({
        success: false,
        code: "INSUFFICIENT_BALANCE",
        message: "Insufficient balance",
        requiredAmount: perMinuteCost,
        currentBalance: walletBalance,
      });
    }

    const maxMinutes = Math.floor(walletBalance / perMinuteCost);
    const maxDurationSec = maxMinutes * 60;

    const [result] = await pool.query(
      `INSERT INTO call_requests
       (astrologer_id, customer_id, call_type, max_duration_sec, call_charge, platform_fee, status)
       VALUES (?, ?, 'audio', ?, ?, ?, 'pending')`,
      [astrologerId, userId, maxDurationSec, audioRate, platformFee]
    );

    const requestId = result.insertId;
    console.log("Call Request Created:", requestId);

    try {
      await insertCallWalletLog({
        requestId,
        userId,
        astrologerId,
        callType: "audio",
        eventType: "request_created",
        userWalletBefore: walletBalance,
        astrologerWalletBefore: astrologerWalletBalance,
        ratePerMinute: audioRate,
        platformFeePerMinute: platformFee,
      });
    } catch (logError) {
      console.error("Failed to save call wallet log:", logError);
    }

    const [astroRows] = await pool.query(
      `SELECT fcmToken FROM astrologers WHERE id = ?`,
      [astrologerId]
    );

    console.log("Astrologer DB Result:", astroRows);

    if (!astroRows.length) {
      console.log("No astrologer found");
    } else if (!astroRows[0].fcmToken) {
      console.log("Astrologer has no FCM token saved");
    } else {
      const fcmToken = astroRows[0].fcmToken;
      console.log("Sending FCM to:", fcmToken);

      const message = {
        token: fcmToken,
        data: {
          screen: "/(tabs)",
          requestId: String(requestId),
          callType: "audio",
          title: "Incoming Audio Call",
          body: "Customer is waiting for an audio call.",
        },
        android: {
          priority: "high",
        },
      };

      try {
        const response = await astrologerApp.messaging().send(message);
        console.log("Audio call FCM sent successfully:", response);
      } catch (error) {
        console.log("Error sending audio call FCM:", error);
      }
    }

    return res.json({
      success: true,
      requestId,
      maxDurationSec,
    });
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const createVideoCallRequest = async (req, res) => {
  try {
    const { astrologerId, userId } = req.body;

    if (!astrologerId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
      });
    }
/*
    const [pendingRows] = await pool.query(
      `SELECT id FROM call_requests
       WHERE customer_id = ?
         AND status = 'pending'`,
      [userId]
    );

    if (pendingRows.length > 0) {
      return res.json({
        success: false,
        code: "PREVIOUS_REQUEST_PENDING",
        message: "Previous request is still pending",
      });
    }
*/
    const [userRows] = await pool.query(
      `SELECT wallet_balance FROM users WHERE id = ?`,
      [userId]
    );

    if (!userRows.length) {
      return res.json({ success: false, message: "User not found" });
    }

    const walletBalance = Number(userRows[0].wallet_balance);
    const astrologerWalletBalance = await getAstrologerWalletBalance(astrologerId);

    const [feeRows] = await pool.query(
      `SELECT video_call_rate, video_platform_fee
       FROM astrologer_fees
       WHERE astrologer_id = ?`,
      [astrologerId]
    );

    if (!feeRows.length) {
      return res.json({ success: false, message: "Astrologer fees not set" });
    }

    const videoRate = Number(feeRows[0].video_call_rate);
    const platformFee = Number(feeRows[0].video_platform_fee);
    const perMinuteCost = videoRate + platformFee;

    if (walletBalance < perMinuteCost) {
      return res.json({
        success: false,
        code: "INSUFFICIENT_BALANCE",
        message: "Insufficient balance",
        requiredAmount: perMinuteCost,
        currentBalance: walletBalance,
      });
    }

    const maxMinutes = Math.floor(walletBalance / perMinuteCost);
    const maxDurationSec = maxMinutes * 60;

    const [result] = await pool.query(
      `INSERT INTO call_requests
       (astrologer_id, customer_id, call_type, max_duration_sec, call_charge, platform_fee, status)
       VALUES (?, ?, 'video', ?, ?, ?, 'pending')`,
      [astrologerId, userId, maxDurationSec, videoRate, platformFee]
    );

    const requestId = result.insertId;

    try {
      await insertCallWalletLog({
        requestId,
        userId,
        astrologerId,
        callType: "video",
        eventType: "request_created",
        userWalletBefore: walletBalance,
        astrologerWalletBefore: astrologerWalletBalance,
        ratePerMinute: videoRate,
        platformFeePerMinute: platformFee,
      });
    } catch (logError) {
      console.error("Failed to save call wallet log:", logError);
    }

    const [astroRows] = await pool.query(
      `SELECT fcmToken FROM astrologers WHERE id = ?`,
      [astrologerId]
    );

    if (astroRows.length > 0 && astroRows[0].fcmToken) {
      const fcmToken = astroRows[0].fcmToken;
      const message = {
        token: fcmToken,
        data: {
          screen: "/(tabs)",
          requestId: String(requestId),
          callType: "video",
          title: "Incoming Video Call",
          body: "Customer is waiting for a video call.",
        },
        android: {
          priority: "high",
        },
      };

      try {
        const response = await astrologerApp.messaging().send(message);
        console.log("Video call FCM sent successfully:", response);
      } catch (error) {
        console.log("Error sending video call FCM:", error);
      }
    }

    return res.json({
      success: true,
      requestId,
      maxDurationSec,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createChatRequest = async (req, res) => {
  try {
    const { astrologerId, userId } = req.body;

    if (!astrologerId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
      });
    }
/*
    const [pendingRows] = await pool.query(
      `SELECT id FROM call_requests
       WHERE customer_id = ?
         AND status = 'pending'`,
      [userId]
    );

    if (pendingRows.length > 0) {
      return res.json({
        success: false,
        code: "PREVIOUS_REQUEST_PENDING",
        message: "Previous request is still pending",
      });
    }
*/
    const [userRows] = await pool.query(
      `SELECT wallet_balance FROM users WHERE id = ?`,
      [userId]
    );

    if (!userRows.length) {
      return res.json({ success: false, message: "User not found" });
    }

    const walletBalance = Number(userRows[0].wallet_balance);
    const astrologerWalletBalance = await getAstrologerWalletBalance(astrologerId);

    const [feeRows] = await pool.query(
      `SELECT chat_rate, chat_platform_fee
       FROM astrologer_fees
       WHERE astrologer_id = ?`,
      [astrologerId]
    );

    if (!feeRows.length) {
      return res.json({ success: false, message: "Astrologer fees not set" });
    }

    const chatRate = Number(feeRows[0].chat_rate);
    const platformFee = Number(feeRows[0].chat_platform_fee);
    const perMinuteCost = chatRate + platformFee;

    if (walletBalance < perMinuteCost) {
      return res.json({
        success: false,
        code: "INSUFFICIENT_BALANCE",
        message: "Insufficient balance",
        requiredAmount: perMinuteCost,
        currentBalance: walletBalance,
      });
    }

    const maxMinutes = Math.floor(walletBalance / perMinuteCost);
    const maxDurationSec = maxMinutes * 60;

    const [result] = await pool.query(
      `INSERT INTO call_requests
       (astrologer_id, customer_id, call_type, max_duration_sec, call_charge, platform_fee, status)
       VALUES (?, ?, 'chat', ?, ?, ?, 'pending')`,
      [astrologerId, userId, maxDurationSec, chatRate, platformFee]
    );

    const requestId = result.insertId;

    try {
      await insertCallWalletLog({
        requestId,
        userId,
        astrologerId,
        callType: "chat",
        eventType: "request_created",
        userWalletBefore: walletBalance,
        astrologerWalletBefore: astrologerWalletBalance,
        ratePerMinute: chatRate,
        platformFeePerMinute: platformFee,
      });
    } catch (logError) {
      console.error("Failed to save call wallet log:", logError);
    }

    const [astroRows] = await pool.query(
      `SELECT fcmToken FROM astrologers WHERE id = ?`,
      [astrologerId]
    );

    if (astroRows.length > 0 && astroRows[0].fcmToken) {
      const fcmToken = astroRows[0].fcmToken;
      const message = {
        token: fcmToken,
        data: {
          screen: "/(tabs)",
          requestId: String(requestId),
          callType: "chat",
          title: "Incoming Chat Request",
          body: "Customer is waiting for a chat.",
        },
        android: {
          priority: "high",
        },
      };

      try {
        const response = await astrologerApp.messaging().send(message);
        console.log("Chat request FCM sent successfully:", response);
      } catch (error) {
        console.log("Error sending chat request FCM:", error);
      }
    }

    return res.json({
      success: true,
      requestId,
      maxDurationSec,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
