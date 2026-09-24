import db from "../config/db.js";
import axios from "axios";

/**
 * SEND OTP
 */
export const sendOtp = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({
        status: false,
        message: "Mobile number is required",
      });
    }

    // ✅ Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // ✅ OTP expiry (5 minutes)
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Check if user exists
    const [rows] = await db.query(
      "SELECT id FROM users WHERE mobile = ?",
      [mobile]
    );

    if (rows.length > 0) {
      // ✅ User exists → update ONLY otp & expiry
      await db.query(
        `UPDATE users 
         SET otp = ?, otp_expires_at = ? 
         WHERE mobile = ?`,
        [otp, otpExpiresAt, mobile]
      );
    } else {
      // ✅ New user → insert mobile + otp + expiry
      await db.query(
        `INSERT INTO users (mobile, otp, otp_expires_at, created_at)
         VALUES (?, ?, ?, NOW())`,
        [mobile, otp, otpExpiresAt]
      );
    }

    // TODO: Send OTP via SMS provider
	await sendOtpSms(mobile, otp);


    return res.json({
      status: true,
      message: "OTP sent successfully",
     // otp, // ❌ remove in production
    });

  } catch (error) {
    console.error("Send OTP Error:", error);
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};


/**
 * VERIFY OTP
 */
export const verifyOtp = async (req, res) => {
  try {
    const { mobile, otp, token } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({
        status: false,
        message: "Mobile and OTP are required",
      });
    }

    // ? Demo login bypass
    if (mobile === "1234567890" && otp === "999999") {
      const [users] = await db.query(
        `SELECT * FROM users WHERE mobile = ?`,
        [mobile]
      );

      if (users.length === 0) {
        return res.status(404).json({
          status: false,
          message: "Demo user not found",
        });
      }

      const user = users[0];

      // Update FCM token
      await db.query(
        `UPDATE users SET fcmToken = ? WHERE id = ?`,
        [token || null, user.id]
      );

      return res.json({
        status: true,
        message: "Demo login successful",
        data: {
          user_id: user.id,
          profile_complete:
            !!user.full_name && !!user.profile_completed,
        },
      });
    }

    // Existing OTP verification logic below
    const [users] = await db.query(
      `SELECT * FROM users 
       WHERE mobile = ? AND otp = ?`,
      [mobile, otp]
    );

    if (users.length === 0) {
      return res.status(401).json({
        status: false,
        message: "Invalid OTP",
      });
    }

    const user = users[0];

    if (!user.otp_expires_at || new Date(user.otp_expires_at) < new Date()) {
      return res.status(401).json({
        status: false,
        message: "OTP expired",
      });
    }

    await db.query(
      `UPDATE users 
       SET otp = NULL, otp_expires_at = NULL, fcmToken = ?
       WHERE id = ?`,
      [token || null, user.id]
    );

    return res.json({
      status: true,
      message: "OTP verified successfully",
      data: {
        user_id: user.id,
        profile_complete:
          !!user.full_name && !!user.profile_completed,
      },
    });

  } catch (error) {
    console.error("Verify OTP Error:", error);

    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};
export const completeProfile = async (req, res) => {
  try {
    const { mobile, full_name, location, date_of_birth, time_of_birth, gender, acceptedTerms } = req.body;
console.log("Received profile data:", req.body);
    if (!mobile || !full_name || !location || !date_of_birth || !gender) {
      return res.status(400).json({
        status: false,
        message: "Mobile, full name, location, and date of birth and gender are required",
      });
    }

    // Check if user exists
    const [users] = await db.query(
      "SELECT id FROM users WHERE mobile = ?",
      [mobile]
    );

    if (users.length === 0) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const userId = users[0].id;

    // Update user profile
    await db.query(
      `UPDATE users SET 
         full_name = ?,
         location = ?,
         date_of_birth = ?,
         time_of_birth = ?,
         gender = ?,    
         profile_completed = 1,
         accepted_terms = ?
       WHERE id = ?`,
      [full_name, location, date_of_birth, time_of_birth || null, gender,acceptedTerms, userId]
    );
await giveWelcomeBonus(userId);
    return res.json({
      status: true,
      message: "Profile updated successfully",
      data: { user_id: userId, profile_complete: true },
    });

  } catch (error) {
    console.error("Complete Profile Error:", error);
    res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};

const sendOtpSms = async (mobile, otp) => {
  try {
    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "dlt",
        sender_id: "BHVSYA",          // Your approved Sender ID
        message: "219593",            // Your DLT Template ID
        variables_values: otp,        // OTP value
        numbers: mobile
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (err) {
    console.error(
      "Fast2SMS Error:",
      err.response?.data || err.message
    );
    throw err;
  }
};

/**
 * GET USER PROFILE BY ID
 * GET /api/users/:userId
 */
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const [rows] = await db.execute(
      `SELECT 
        id,
        mobile,
        full_name,
        gender,
        location,
        date_of_birth,
        time_of_birth,
        created_at,
        wallet_balance,
        profile_completed
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const giveWelcomeBonus = async (userId) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Lock user
    const [users] = await connection.query(
      `SELECT wallet_balance, welcome_bonus_received
       FROM users
       WHERE id = ?
       FOR UPDATE`,
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return false;
    }

    const user = users[0];

    // Already received bonus
    if (user.welcome_bonus_received == 1) {
      await connection.rollback();
      return false;
    }

    // Lock active bonus
    const [bonuses] = await connection.query(
      `SELECT *
       FROM welcome_bonus
       WHERE is_active = 1
       LIMIT 1
       FOR UPDATE`
    );

    if (bonuses.length === 0) {
      await connection.rollback();
      return false;
    }

    const bonus = bonuses[0];

    // Bonus finished
    if (bonus.total_given >= bonus.max_users) {
      await connection.rollback();
      return false;
    }

    const previousBalance = Number(user.wallet_balance);
    const bonusAmount = Number(bonus.bonus_amount);
    const afterBalance = previousBalance + bonusAmount;

    // Update wallet
    await connection.query(
      `UPDATE users
       SET wallet_balance = ?,
           welcome_bonus_received = 1
       WHERE id = ?`,
      [afterBalance, userId]
    );

    // Wallet history
    await connection.query(
      `INSERT INTO wallet_recharge_logs (
          user_id,
          customer_gstin,
          coupon_id,
          coupon_code,
          coupon_bonus_amount,
          credited_amount,
          event_type,
          status,
          currency,
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          recharge_amount,
          gst_amount,
          payable_amount,
          previous_balance,
          after_balance,
          payment_status,
          invoice_number
      ) VALUES (
          ?, NULL, NULL, NULL,
          ?, ?, 'WELCOME_BONUS',
          'SUCCESS',
          'INR',
          NULL, NULL, NULL,
          0, 0, 0,
          ?, ?,
          'SUCCESS',
          NULL
      )`,
      [
        userId,
        bonusAmount,
        bonusAmount,
        previousBalance,
        afterBalance,
      ]
    );

    // Increase distributed count
    await connection.query(
      `UPDATE welcome_bonus
       SET total_given = total_given + 1
       WHERE id = ?`,
      [bonus.id]
    );

    await connection.commit();

    return {
      success: true,
      amount: bonusAmount,
    };
  } catch (err) {
    await connection.rollback();
    console.error("Welcome Bonus Error:", err);
    return false;
  } finally {
    connection.release();
  }
};

export const UserVerifyFcmToken = async (req, res) => {

  try {
    const { user_id, fcmToken } = req.body;
console.log("user id",user_id,"fcm token", fcmToken)
    if (!user_id || !fcmToken) {
      return res.status(400).json({
        success: false,
        message: "user_id and fcmToken are required",
      });
    }

    const [rows] = await db.query(
      `SELECT fcmToken
       FROM users
       WHERE id = ?`,
      [user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const dbFcmToken = rows[0].fcmToken || "";

    if (dbFcmToken !== fcmToken) {
      return res.json({
        success: false,
        message: "Parallel login detected.",
      });
    }

    return res.json({
      success: true,
      message: "Verified",
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
