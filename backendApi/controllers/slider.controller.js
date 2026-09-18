import db from "../config/db.js"; // mysql2 / pool

// GET /api/slider
export const getSliders = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, image, title, link 
       FROM sliders 
       WHERE is_active = TRUE 
       ORDER BY created_at DESC`
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Slider fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sliders",
    });
  }
};