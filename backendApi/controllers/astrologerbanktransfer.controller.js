import db from "../config/db.js";

// GET WALLET TRANSACTIONS
export const astrologerBankTransfer = async (req, res) => {
  try {
    const { astrologer_id } = req.params;

    let {
      limit = 20,
      offset = 0,
      start_date,
      end_date,
    } = req.query;

    let sql = `
      SELECT
        id,
        amount,
        old_balance,
        new_balance,
        created_at
      FROM wallet_transactions
      WHERE astrologer_id = ?
    `;

    let values = [astrologer_id];

    // DATE FILTER
    if (start_date && end_date) {
      sql += `
        AND DATE(created_at)
        BETWEEN ? AND ?
      `;

      values.push(start_date, end_date);
    }

    sql += `
      ORDER BY id DESC
      LIMIT ?
      OFFSET ?
    `;

    values.push(
      parseInt(limit),
      parseInt(offset)
    );

    const [rows] = await db.query(sql, values);

    return res.status(200).json({
      status: true,
      message: "Transactions fetched successfully",
      data: rows,
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      status: false,
      message: "Server Error",
    });
  }
};