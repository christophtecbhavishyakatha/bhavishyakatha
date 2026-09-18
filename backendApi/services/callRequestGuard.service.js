// Serializes call-request creation with call acceptance for one customer.
// The caller supplies the INSERT statement so this works for regular and v1
// request payloads without duplicating transaction logic.
export async function createCallRequestWithCustomerLock({
  pool,
  customerId,
  insertSql,
  insertParams,
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [userRows] = await connection.execute(
      `SELECT id
       FROM users
       WHERE id = ?
       FOR UPDATE`,
      [customerId]
    );

    if (!userRows.length) {
      await connection.rollback();
      return { userNotFound: true };
    }

    const [activeRows] = await connection.execute(
      `SELECT id, status
       FROM call_requests
       WHERE customer_id = ?
         AND status IN ('accepted', 'ongoing')
       LIMIT 1`,
      [customerId]
    );

    if (activeRows.length) {
      await connection.rollback();
      return {
        activeCall: true,
        activeCallId: activeRows[0].id,
      };
    }

    const [result] = await connection.execute(insertSql, insertParams);
    await connection.commit();

    return { result };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Preserve the original database error.
    }
    throw error;
  } finally {
    connection.release();
  }
}
