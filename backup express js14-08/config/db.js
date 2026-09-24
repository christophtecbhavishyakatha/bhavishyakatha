import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,     // increase gradually (10 → 20)
  queueLimit: 50,          // protect RAM
  connectTimeout: 10000,   // 10 seconds
});

// ✅ Health check (non-blocking)
pool
  .getConnection()
  .then(conn => {
    console.log("✅ MySQL Pool Connected");
    conn.release();
  })
  .catch(err => {
    console.error("❌ MySQL Pool Connection Failed:", err.message);
  });

// ✅ Safe query helper
export const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    console.error("DB Query Error:", err.message);
    throw err;
  }
};

export default pool;
