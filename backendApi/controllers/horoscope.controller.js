import db from "../config/db.js";

const VALID_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

// =====================================================
// INDIA DATE
// =====================================================

function getIndiaDate() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

// =====================================================
// GET DAILY HOROSCOPE
// =====================================================

export const getDailyHoroscope = async (req, res) => {
  try {
    const { sign } = req.params;

    // =================================================
    // VALIDATE SIGN
    // =================================================

    if (!sign) {
      return res.status(400).json({
        success: false,
        message: "Sign is required",
      });
    }

    // Match sign case-insensitively
    const matchedSign = VALID_SIGNS.find(
      (item) => item.toLowerCase() === sign.toLowerCase()
    );

    if (!matchedSign) {
      return res.status(400).json({
        success: false,
        message: "Invalid zodiac sign",
        validSigns: VALID_SIGNS,
      });
    }

    // =================================================
    // TODAY'S DATE IN INDIA
    // =================================================

    const today = getIndiaDate();

    // =================================================
    // FETCH TODAY'S HOROSCOPE
    // =================================================

    const [rows] = await db.execute(
      `
      SELECT
        id,
        sign,
        horoscope_date,
        language,
        weekday,

        -- English
        summary,
        focus_areas,
        cautions,
        disclaimer,
        interpretation_summary,

        -- Hindi
        summary_hi,
        focus_areas_hi,
        cautions_hi,
        disclaimer_hi,
        interpretation_summary_hi,

        -- Bengali
        summary_bn,
        focus_areas_bn,
        cautions_bn,
        disclaimer_bn,
        interpretation_summary_bn,

        -- Common
        lucky_number,
        best_time,
        lucky_color,
        lucky_color_hex,
        mood,
        ratings,

        created_at,
        updated_at

      FROM daily_horoscopes

      WHERE sign = ?
        AND horoscope_date = ?

      LIMIT 1
      `,
      [matchedSign, today]
    );

    // =================================================
    // NOT FOUND
    // =================================================

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Today's horoscope not found for ${matchedSign}`,
        date: today,
      });
    }

    const horoscope = rows[0];

    // =================================================
    // PARSE JSON COLUMNS
    // =================================================

    const summaryFields = [
      "summary",
      "summary_hi",
      "summary_bn",
    ];

    for (const field of summaryFields) {
      if (typeof horoscope[field] === "string") {
        try {
          horoscope[field] = JSON.parse(horoscope[field]);
        } catch {
          // Keep older plain-text summaries usable by the frontend.
          horoscope[field] = {
            header: "",
            body: horoscope[field],
          };
        }
      }

      if (
        !horoscope[field] ||
        typeof horoscope[field] !== "object" ||
        Array.isArray(horoscope[field])
      ) {
        horoscope[field] = {
          header: "",
          body: "",
        };
      }
    }

    const arrayJsonFields = [
      "cautions",
      "cautions_hi",
      "cautions_bn",
    ];

    const objectJsonFields = [
      "focus_areas",
      "focus_areas_hi",
      "focus_areas_bn",
    ];

    for (const field of arrayJsonFields) {
      if (typeof horoscope[field] === "string") {
        try {
          horoscope[field] = JSON.parse(horoscope[field]);
        } catch (error) {
          console.error(
            `Failed to parse ${field}:`,
            error
          );

          horoscope[field] = [];
        }
      }

      // Safety fallback
      if (!Array.isArray(horoscope[field])) {
        horoscope[field] = [];
      }
    }

    for (const field of objectJsonFields) {
      if (typeof horoscope[field] === "string") {
        try {
          horoscope[field] = JSON.parse(horoscope[field]);
        } catch (error) {
          console.error(`Failed to parse ${field}:`, error);
          horoscope[field] = {};
        }
      }

      if (
        !horoscope[field] ||
        typeof horoscope[field] !== "object" ||
        Array.isArray(horoscope[field])
      ) {
        horoscope[field] = {};
      }
    }

    if (typeof horoscope.ratings === "string") {
      try {
        horoscope.ratings = JSON.parse(horoscope.ratings);
      } catch (error) {
        console.error("Failed to parse ratings:", error);
        horoscope.ratings = {};
      }
    }

    if (!horoscope.ratings || typeof horoscope.ratings !== "object" || Array.isArray(horoscope.ratings)) {
      horoscope.ratings = {};
    }

    if (horoscope.ratings && typeof horoscope.ratings === "object") {
      horoscope.rating_stars = Object.fromEntries(
        Object.entries(horoscope.ratings).map(([area, score]) => [
          area,
          `${"\u2605".repeat(Math.max(0, Math.min(5, Number(score))))}${"\u2606".repeat(Math.max(0, 5 - Number(score)))}`,
        ])
      );
    }

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,
      data: horoscope,
    });

  } catch (error) {
    console.error(
      "? Get horoscope error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch horoscope",
    });
  }
};
