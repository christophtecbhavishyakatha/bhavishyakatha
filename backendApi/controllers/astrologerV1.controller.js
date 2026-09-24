import db from "../config/db.js";

// Test-only copy of the production pending-call request controller.
export const getCallRequestsWithCustomerV1 = async (req, res) => {
  const userId = req.body.user_id;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "user_id is required",
    });
  }

  const query = `
    SELECT
      cr.id,
      cr.astrologer_id,
      cr.customer_id,
      cr.channel_name,
      cr.call_type,
      cr.max_duration_sec,
      cr.duration,
      cr.call_charge,
      cr.platform_fee,
      cr.status,
      cr.accepted_at,
      cr.started_at,
      cr.ended_at,
      cr.created_at,
      cr.updated_at,
      cr.astrologer_uid,
      cr.user_uid,
      cr.location,
      cr.latitude,
      cr.longitude,
      cr.full_name,
      DATE_FORMAT(cr.date_of_birth, '%Y-%m-%d') AS date_of_birth,
      TIME_FORMAT(cr.time_of_birth, '%H:%i:%s') AS time_of_birth
    FROM call_requests cr
    WHERE cr.astrologer_id = ?
      AND cr.status = 'pending'
    ORDER BY cr.created_at DESC;
  `;

  try {
    const [results] = await db.query(query, [userId]);

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("V1 pending call request error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch call requests",
    });
  }
};
