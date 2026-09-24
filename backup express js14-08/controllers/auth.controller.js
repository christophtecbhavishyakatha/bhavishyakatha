import db from "../config/db.js";
import axios from "axios";


/* SEND OTP */
export const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "Phone required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const [rows] = await db.query(
      "SELECT id FROM astrologers WHERE phone_number=?",
      [phone]
    );

    if (rows.length === 0) {
      await db.query(
        `INSERT INTO astrologers (phone_number, otp, otp_expires_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
        [phone, otp]
      );
    } else {
      await db.query(
        `UPDATE astrologers
         SET otp=?, otp_expires_at=DATE_ADD(NOW(), INTERVAL 5 MINUTE)
         WHERE phone_number=?`,
        [otp, phone]
      );
    }
// Send SMS
	await sendOtpSms(phone, otp);

    console.log("OTP:", otp); // replace with SMS gateway

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const sendOtpSms = async (phone, otp) => {
  try {
    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "dlt",
        sender_id: "BHVSYA",          // Your approved Sender ID
        message: "219593",            // Your DLT Template ID
        variables_values: otp,        // OTP value
        numbers: phone
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
/* VERIFY OTP */
export const verifyOtp = async (req, res) => {
  try {
    const { phone, otp, fcmToken } = req.body;

    let rows = [];

    // Demo login: fixed OTP for specific number
    if (phone === "1234567890") {
      if (otp !== "999999") {
        return res.status(400).json({ message: "Invalid OTP" });
      }

      // Fetch user only by phone for demo account
      const [demoRows] = await db.query(
        `SELECT * FROM astrologers WHERE phone_number=?`,
        [phone]
      );

      rows = demoRows;
    } else {
      // Existing OTP verification logic for normal users
      const [normalRows] = await db.query(
        `SELECT * FROM astrologers
         WHERE phone_number=? 
         AND otp=? 
         AND otp_expires_at > NOW()`,
        [phone, otp]
      );

      rows = normalRows;
    }

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const user = rows[0];

    await db.query(
      `UPDATE astrologers
       SET is_phone_verified=1, fcmToken=?
       WHERE id=?`,
      [fcmToken, user.id]
    );

    res.json({
      astrologer_id: user.id,
      is_admin_verified: user.is_admin_verified,
      profile_completed: user.profile_completed,
      fcmToken:user.fcmToken,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};
/* CREATE / UPDATE PROFILE */
export const saveProfile = async (req, res) => {
  try {
    const {
      astrologer_id,
      full_name,
      profile_photo,
      languages,
      categories,
      specializations,
      experience,
      acceptedTerms
    } = req.body;

    // 1. Insert or Update profile
    const [rows] = await db.query(
      "SELECT id FROM astrologer_profiles WHERE astrologer_id=?",
      [astrologer_id]
    );

    if (rows.length === 0) {
      await db.query(
        `INSERT INTO astrologer_profiles
         (astrologer_id, full_name, profile_photo, experience, languages, categories, specializations, accepted_terms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          astrologer_id,
          full_name,
          profile_photo,
          experience,
          JSON.stringify(languages),
          JSON.stringify(categories),
          JSON.stringify(specializations),
          acceptedTerms ? 1 : 0
        ]
      );
    } else {

      let query = `
        UPDATE astrologer_profiles SET
        full_name=?,
        profile_photo=?,
        experience=?,
        languages=?,
        categories=?,
        specializations=?
      `;

      const values = [
        full_name,
        profile_photo,
        experience,
        JSON.stringify(languages),
        JSON.stringify(categories),
        JSON.stringify(specializations),
      ];

      // Only update accepted_terms if value comes from frontend
      if (acceptedTerms !== undefined) {
        query += `, accepted_terms=?`;
        values.push(acceptedTerms ? 1 : 0);
      }

      query += ` WHERE astrologer_id=?`;
      values.push(astrologer_id);

      await db.query(query, values);
    }

    

    // 2. Generate coupon code
    const couponCode = generateCouponCode(full_name);

    // 3. Update astrologers table
    await db.query(
      `UPDATE astrologers 
       SET profile_completed=1, coupon_code=? 
       WHERE id=?`,
      [couponCode, astrologer_id]
    );
   // 4. Get is_admin_verified status
    const [adminRows] = await db.query(
      "SELECT is_admin_verified FROM astrologers WHERE id=?",
      [astrologer_id]
    );
    const is_admin_verified = adminRows[0]?.is_admin_verified || 0;

    
    if (is_admin_verified === 1) {
  // 1️⃣ Fetch previous profile data
  const [oldProfileRows] = await db.query(
    "SELECT full_name, profile_photo, experience, languages, categories, specializations FROM astrologer_profiles WHERE astrologer_id=?",
    [astrologer_id]
  );

  const oldData = oldProfileRows.length
    ? {
        full_name: oldProfileRows[0].full_name,
        profile_photo: oldProfileRows[0].profile_photo,
        experience: oldProfileRows[0].experience,
        languages: JSON.parse(oldProfileRows[0].languages || "[]"),
        categories: JSON.parse(oldProfileRows[0].categories || "[]"),
        specializations: JSON.parse(oldProfileRows[0].specializations || "[]"),
      }
    : null;

  // 2️⃣ New updated data
  const newData = {
    full_name,
    profile_photo,
    experience,
    languages,
    categories,
    specializations,
  };

  // 3️⃣ Insert history record
  await db.query(
    `INSERT INTO astrologer_profile_history 
     (astrologer_id, old_data, new_data) 
     VALUES (?, ?, ?)`,
    [
      astrologer_id,
      JSON.stringify(oldData),
      JSON.stringify(newData),
    ]
  );
}

    res.json({
      success: true,
      coupon_code: couponCode,
      is_admin_verified,  // ✅ added this

    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const generateCouponCode = (fullName) => {
  if (!fullName) return null;

  const name = fullName.replace(/\s+/g, '').toUpperCase(); // remove spaces
  const firstTwoLetters = name.slice(0, 2);

  const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4 digits

  return `${firstTwoLetters}${randomDigits}`;
};

export const verifyFcmToken = async (req, res) => {

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
       FROM astrologers
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
