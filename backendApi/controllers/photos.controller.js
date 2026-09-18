import db from "../config/db.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const UPLOAD_DIR = "image/astrologerPhotos";
const MAX_SIZE = 100 * 1024; // 100KB

// =============================
// ✅ GET PHOTOS
// =============================
export const getAstrologerPhotos = async (req, res) => {
  try {
    const { astrologer_id } = req.params;

    const [rows] = await db.query(
      `SELECT * FROM astrologer_photos WHERE astrologer_id = ? ORDER BY id DESC`,
      [astrologer_id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

// =============================
// ✅ UPLOAD + RESIZE + COMPRESS
// =============================
export const uploadPhoto = async (req, res) => {
  try {
    const { astrologer_id } = req.query;

    if (!astrologer_id) {
      return res.status(400).json({ success: false, message: "Missing ID" });
    }

    const fileName = `photo-${Date.now()}.jpg`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));

    req.on("end", async () => {
      try {
        const buffer = Buffer.concat(chunks);

        // 🔥 Resize + compress loop
        let quality = 80;
        let outputBuffer;

        do {
          outputBuffer = await sharp(buffer)
            .resize({ width: 800 }) // max width
            .jpeg({ quality })
            .toBuffer();

          quality -= 10;
        } while (outputBuffer.length > MAX_SIZE && quality > 20);

        // save file
        fs.writeFileSync(filePath, outputBuffer);

        const imageUrl = `https://bhavishyakatha.in/express/${filePath}`;

        await db.query(
          `INSERT INTO astrologer_photos 
          (astrologer_id, image_path, image_url, original_name, file_size)
          VALUES (?, ?, ?, ?, ?)`,
          [
            astrologer_id,
            filePath,
            imageUrl,
            fileName,
            outputBuffer.length,
          ]
        );

        res.json({ success: true });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Processing failed" });
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

// =============================
// ✅ DELETE (DB + FILE)
// =============================
export const deletePhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const { astrologer_id } = req.query;

    const [rows] = await db.query(
      `SELECT * FROM astrologer_photos WHERE id = ? AND astrologer_id = ?`,
      [id, astrologer_id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false });
    }

    const photo = rows[0];

    // 🔥 DELETE FILE FROM DISK
    if (photo.image_path && fs.existsSync(photo.image_path)) {
      fs.unlinkSync(photo.image_path);
    }

    // 🔥 DELETE FROM DB
    await db.query(`DELETE FROM astrologer_photos WHERE id = ?`, [id]);

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};