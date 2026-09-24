import db from "../config/db.js";

// ✅ 1. Get all astrologers
export const getAllAstrologers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        a.id,
        ap.full_name,
        ap.dp_name,
        ap.wallet_balance,
        a.phone_number AS mobile
      FROM astrologer_profiles ap
      JOIN astrologers a ON a.id = ap.astrologer_id
      ORDER BY ap.id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ 2. Transfer to Bank (UPDATED WITH BALANCE TRACKING)
export const transferToBank = async (req, res) => {
  const { astrologer_id, amount } = req.body;
  const admin_id = 1;

  if (!astrologer_id || !amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid input" });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    console.log("Transfer Start:", { astrologer_id, amount });

    // 🔒 Lock wallet row
    const [astro] = await conn.query(
      "SELECT wallet_balance FROM astrologer_profiles WHERE astrologer_id = ? FOR UPDATE",
      [astrologer_id]
    );

    if (!astro.length) throw new Error("Astrologer not found");

    const old_balance = Number(astro[0].wallet_balance);

    if (old_balance < amount) {
      throw new Error("Insufficient balance");
    }

    // ✅ Calculate new balance
    const new_balance = old_balance - amount;

    // 🏦 Get bank
    const [bank] = await conn.query(
      "SELECT * FROM astrologer_bank_details WHERE astrologer_id = ?",
      [astrologer_id]
    );

    if (!bank.length) {
      throw new Error("Bank not found");
    }

    // 💾 Insert payout
    const [payout] = await conn.query(
      `INSERT INTO payout_transactions 
      (astrologer_id, amount, transfer_method, processed_by, status,
       account_number, ifsc_code, beneficiary_name)
      VALUES (?, ?, 'bank', ?, 'success', ?, ?, ?)`,
      [
        astrologer_id,
        amount,
        admin_id,
        bank[0].account_number,
        bank[0].ifsc_code,
        bank[0].beneficiary_name,
      ]
    );

    const payoutId = payout.insertId;

    // 💸 Update wallet balance
    await conn.query(
      "UPDATE astrologer_profiles SET wallet_balance = ? WHERE astrologer_id = ?",
      [new_balance, astrologer_id]
    );

    // 🧾 Insert wallet transaction (WITH BALANCE TRACKING)
    await conn.query(
      `INSERT INTO wallet_transactions 
      (astrologer_id, type, amount, source, reference_id, description, old_balance, new_balance)
      VALUES (?, 'debit', ?, 'payout', ?, 'Bank transfer', ?, ?)`,
      [astrologer_id, amount, payoutId, old_balance, new_balance]
    );

    await conn.commit();

    res.json({
      success: true,
      message: "Transfer successful",
      old_balance,
      new_balance,
    });

  } catch (err) {
    await conn.rollback();
    console.error("TRANSFER ERROR:", err);
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

// ✅ 3. Get payout history
export const getPayoutHistory = async (req, res) => {
  try {
    const astrologer_id = Number(req.params.astrologer_id);

    if (!astrologer_id) {
      return res.status(400).json({ message: "Invalid astrologer_id" });
    }

    const [rows] = await db.query(
      `SELECT id, amount, status, reference_no, created_at 
       FROM payout_transactions 
       WHERE astrologer_id = ? 
       ORDER BY id DESC`,
      [astrologer_id]
    );

    res.json(rows || []);
  } catch (err) {
    console.error("HISTORY ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ 4. Update payout status
export const updatePayoutStatus = async (req, res) => {
  const { payout_id, status, reference_no } = req.body;

  try {
    await db.query(
      `UPDATE payout_transactions 
       SET status = ?, reference_no = ?, processed_at = NOW()
       WHERE id = ?`,
      [status, reference_no, payout_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ message: "Update failed" });
  }
};