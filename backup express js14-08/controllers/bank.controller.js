// controllers/bank.controller.js
import db from "../config/db.js";

export const saveBankDetails = async (req, res) => {
  try {
    const {
      astrologer_id,
      beneficiaryName,
      accountNumber,
      ifsc,
      bankName,
      branch,
      panNumber,
      panImage,
    } = req.body;

    // ✅ Validation
    if (
      !astrologer_id ||
      !beneficiaryName ||
      !accountNumber ||
      !ifsc ||
      !bankName ||
      !panNumber
    ) {
      return res.status(400).json({
        status: false,
        message: "All required fields must be filled",
      });
    }

    // ✅ Additional format validation (optional but recommended)
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    if (!ifscRegex.test(ifsc)) {
      return res.status(400).json({
        status: false,
        message: "Invalid IFSC code format",
      });
    }

    if (!panRegex.test(panNumber)) {
      return res.status(400).json({
        status: false,
        message: "Invalid PAN number format",
      });
    }

    // Check if bank details already exist
    const [rows] = await db.query(
      "SELECT id FROM astrologer_bank_details WHERE astrologer_id = ?",
      [astrologer_id]
    );

    if (rows.length > 0) {
      // ✅ Update existing record
      await db.query(
        `UPDATE astrologer_bank_details SET
          beneficiary_name = ?,
          account_number = ?,
          ifsc_code = ?,
          bank_name = ?,
          branch_name = ?,
          pan_number = ?,
          pan_image_base64 = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE astrologer_id = ?`,
        [
          beneficiaryName,
          accountNumber,
          ifsc,
          bankName,
          branch || null,  // ✅ Use null instead of empty string
          panNumber,
          panImage || null,  // ✅ Use null instead of empty string
          astrologer_id,
        ]
      );

      return res.json({
        status: true,
        message: "Bank details updated successfully",
      });
    }

    // ✅ Insert new record
    await db.query(
      `INSERT INTO astrologer_bank_details
       (astrologer_id, beneficiary_name, account_number, ifsc_code,
        bank_name, branch_name, pan_number, pan_image_base64)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        astrologer_id,
        beneficiaryName,
        accountNumber,
        ifsc,
        bankName,
        branch || null,  // ✅ Use null instead of empty string
        panNumber,
        panImage || null,  // ✅ Use null instead of empty string
      ]
    );

    res.json({
      status: true,
      message: "Bank details saved successfully",
    });
  } catch (error) {
    console.error("saveBankDetails error:", error);
    
    // ✅ Better error handling
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        status: false,
        message: "Bank details already exist for this astrologer",
      });
    }
    
    res.status(500).json({
      status: false,
      message: "Server error. Please try again later.",
    });
  }
};

export const getBankDetails = async (req, res) => {
  try {
    const { astrologer_id } = req.body; // ✅ READ JSON BODY

    if (!astrologer_id) {
      return res.status(400).json({
        status: false,
        message: "Astrologer ID required",
      });
    }

    const [rows] = await db.query(
      "SELECT * FROM astrologer_bank_details WHERE astrologer_id = ?",
      [astrologer_id]
    );

    if (rows.length === 0) {
      return res.json({
        status: false,
        message: "No bank details found",
        data: null,
      });
    }

    const data = rows[0];

    res.json({
      status: true,
      data: {
        bankName: data.bank_name,
        beneficiaryName: data.beneficiary_name,
        ifsc: data.ifsc_code,
        branch: data.branch_name || '',  // ✅ Handle null values
        accountNumber: data.account_number,
        panNumber: data.pan_number,
        panImage: data.pan_image_base64 || '',  // ✅ Handle null values
      },
    });
  } catch (error) {
    console.error("getBankDetails error:", error);
    res.status(500).json({
      status: false,
      message: "Server error. Please try again later.",
    });
  }
};