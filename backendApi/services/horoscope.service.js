import db from "../config/db.js";

import { run } from "@openai/agents";

import { horoscopeCoreAgent } from "../src/agents/horoscopeCore.agent.js";
import { horoscopeLanguageAgent } from "../src/agents/horoscopeLanguage.agent.js";
import { horoscopeQualityAgent } from "../src/agents/horoscopeQuality.agent.js";

const SIGNS = [
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

function getIndiaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}


/**
 * ---------------------------------------------------------
 * SAVE HOROSCOPE
 * ---------------------------------------------------------
 */
async function saveHoroscope(h) {
  const { english, hindi, bengali } = h;

  const sql = `
    INSERT INTO daily_horoscopes (
      sign,
      horoscope_date,

      summary,
      summary_hi,
      summary_bn,

      focus_areas,
      focus_areas_hi,
      focus_areas_bn,

      lucky_color,
      lucky_color_hex,
      mood,
      ratings,

      cautions,
      cautions_hi,
      cautions_bn,

      disclaimer,
      disclaimer_hi,
      disclaimer_bn,

      interpretation_summary,
      interpretation_summary_hi,
      interpretation_summary_bn,

      lucky_number,
      best_time
    )
    VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?
    )

    ON DUPLICATE KEY UPDATE
      summary = VALUES(summary),
      summary_hi = VALUES(summary_hi),
      summary_bn = VALUES(summary_bn),

      focus_areas = VALUES(focus_areas),
      focus_areas_hi = VALUES(focus_areas_hi),
      focus_areas_bn = VALUES(focus_areas_bn),

      lucky_color = VALUES(lucky_color),
      lucky_color_hex = VALUES(lucky_color_hex),
      mood = VALUES(mood),
      ratings = VALUES(ratings),

      cautions = VALUES(cautions),
      cautions_hi = VALUES(cautions_hi),
      cautions_bn = VALUES(cautions_bn),

      disclaimer = VALUES(disclaimer),
      disclaimer_hi = VALUES(disclaimer_hi),
      disclaimer_bn = VALUES(disclaimer_bn),

      interpretation_summary =
        VALUES(interpretation_summary),

      interpretation_summary_hi =
        VALUES(interpretation_summary_hi),

      interpretation_summary_bn =
        VALUES(interpretation_summary_bn),

      lucky_number = VALUES(lucky_number),
      best_time = VALUES(best_time),

      horoscope_date = VALUES(horoscope_date),

      updated_at = CURRENT_TIMESTAMP
  `;

  await db.execute(sql, [
    h.sign,
    h.date,

    // English
    JSON.stringify(english.summary),

    // Hindi
    JSON.stringify(hindi.summary),

    // Bengali
    JSON.stringify(bengali.summary),

    // Focus areas
    JSON.stringify(english.focus_areas),
    JSON.stringify(hindi.focus_areas),
    JSON.stringify(bengali.focus_areas),

    h.lucky_color,
    h.lucky_color_hex,
    h.mood,
    JSON.stringify(h.ratings),

    // Cautions
    JSON.stringify(english.cautions),
    JSON.stringify(hindi.cautions),
    JSON.stringify(bengali.cautions),

    // Disclaimer
    english.disclaimer,
    hindi.disclaimer,
    bengali.disclaimer,

    // Interpretation
    english.interpretation_summary,
    hindi.interpretation_summary,
    bengali.interpretation_summary,

    // Lucky number / time
    h.lucky_number,
    h.best_time,
  ]);
}


/**
 * ---------------------------------------------------------
 * AGENT 1
 * Generate core horoscope
 * ---------------------------------------------------------
 */
async function generateCoreHoroscope(sign, date) {
  console.log(`[Agent 1] Generating core horoscope for ${sign}...`);

  const result = await run(
    horoscopeCoreAgent,
    `
Generate the daily horoscope core for:

Zodiac Sign: ${sign}
Date: ${date}

The exact horoscope date is ${date}.
`,
    {
      maxTurns: 1,
    }
  );

  if (!result.finalOutput) {
    throw new Error(
      `Agent 1 returned empty output for ${sign}`
    );
  }

  return result.finalOutput;
}


/**
 * ---------------------------------------------------------
 * AGENT 2
 * Generate English / Hindi / Bengali
 * ---------------------------------------------------------
 */
async function generateLanguages(core) {
  console.log(
    `[Agent 2] Generating English, Hindi and Bengali for ${core.sign}...`
  );

  const result = await run(
    horoscopeLanguageAgent,
    `
Write the multilingual horoscope using the following
underlying horoscope interpretation.

IMPORTANT:
Do not change the underlying meaning.

CORE HOROSCOPE:

${JSON.stringify(core, null, 2)}
`,
    {
      maxTurns: 1,
    }
  );

  if (!result.finalOutput) {
    throw new Error(
      `Agent 2 returned empty output for ${core.sign}`
    );
  }

  return result.finalOutput;
}


/**
 * ---------------------------------------------------------
 * AGENT 3
 * Quality control
 * ---------------------------------------------------------
 */
async function qualityControl(core, languages) {
  console.log(
    `[Agent 3] Running Hindi/Bengali quality control for ${core.sign}...`
  );

  const result = await run(
    horoscopeQualityAgent,
    `
Perform final quality control on the following horoscope.

ORIGINAL CORE HOROSCOPE:

${JSON.stringify(core, null, 2)}

GENERATED LANGUAGES:

${JSON.stringify(languages, null, 2)}

Review Hindi and Bengali carefully.

Return the corrected final Hindi and Bengali content.
`,
    {
      maxTurns: 1,
    }
  );

  if (!result.finalOutput) {
    throw new Error(
      `Agent 3 returned empty output for ${core.sign}`
    );
  }

  return result.finalOutput;
}


/**
 * ---------------------------------------------------------
 * PROCESS ONE SIGN
 * ---------------------------------------------------------
 */
async function processSign(sign, date) {
  console.log("");
  console.log("==========================================");
  console.log(`Processing ${sign}`);
  console.log("==========================================");

  /**
   * AGENT 1
   */
  const core = await generateCoreHoroscope(
    sign,
    date
  );

  console.log(
    `[Agent 1] ${sign} lucky number:`,
    core.lucky_number
  );

  console.log(
    `[Agent 1] ${sign} best time:`,
    core.best_time
  );


  /**
   * AGENT 2
   */
  const languages = await generateLanguages(
    core
  );


  /**
   * AGENT 3
   */
  const quality = await qualityControl(
    core,
    languages
  );

  console.log(
    `[Agent 3] ${sign} quality score:`,
    quality.quality_score
  );

  console.log(
    `[Agent 3] Bengali OK:`,
    quality.bengali_ok
  );

  console.log(
    `[Agent 3] Hindi OK:`,
    quality.hindi_ok
  );


  /**
   * -------------------------------------------------------
   * BUILD FINAL HOROSCOPE
   * -------------------------------------------------------
   *
   * English comes directly from Agent 2.
   *
   * Hindi and Bengali come from Agent 3 after QC.
   */
  const horoscope = {
    sign: core.sign,
    date: core.date,

    lucky_number: core.lucky_number,
    best_time: core.best_time,
    lucky_color: core.lucky_color,
    lucky_color_hex: core.lucky_color_hex,
    mood: core.mood,
    ratings: core.ratings,

    english: languages.english,

    hindi: quality.hindi_final,

    bengali: quality.bengali_final,
  };


  /**
   * -------------------------------------------------------
   * SAVE TO DATABASE
   * -------------------------------------------------------
   */
  await saveHoroscope(horoscope);

  console.log(
    `? ${sign} saved successfully`
  );

  console.log(
    `${sign} date: ${horoscope.date}`
  );

  return sign;
}


/**
 * ---------------------------------------------------------
 * GENERATE ALL DAILY HOROSCOPES
 * ---------------------------------------------------------
 */
export async function fetchAllDailyHoroscopes() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is missing"
    );
  }

  const date = getIndiaDate();

  console.log("");
  console.log("==========================================");
  console.log(
    `Starting horoscope generation for ${date}`
  );
  console.log("==========================================");


  /**
   * Run all 12 signs concurrently.
   *
   * Each sign internally runs:
   *
   * Agent 1
   *   ?
   * Agent 2
   *   ?
   * Agent 3
   *   ?
   * Database
   */
  const results = await Promise.allSettled(
    SIGNS.map((sign) =>
      processSign(sign, date)
    )
  );


  const successful = [];
  const failed = [];


  for (const result of results) {
    if (result.status === "fulfilled") {
      successful.push(result.value);
    } else {
      failed.push(
        result.reason?.message ||
        "Unknown error"
      );
    }
  }


  console.log("");
  console.log("==========================================");
  console.log("Horoscope job completed");
  console.log(
    `Success: ${successful.length}`
  );
  console.log(
    `Failed: ${failed.length}`
  );
  console.log("==========================================");


  if (failed.length) {
    console.error(
      "Failed horoscopes:",
      failed
    );
  }


  return {
    date,
    success: successful.length,
    failed: failed.length,
  };
}
