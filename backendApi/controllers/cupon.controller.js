import db from "../config/db.js";

let ensureCouponSchemaPromise = null;

const roundCurrency = (value) => Number(Number(value || 0).toFixed(2));

const normalizeCouponCode = (value) => String(value ?? "").trim().toUpperCase();

const isCouponExpired = (value) => {
  if (!value) {
    return false;
  }

  const rawValue = value instanceof Date ? value.toISOString() : String(value);
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue.trim())) {
    parsedDate.setHours(23, 59, 59, 999);
  }

  return parsedDate.getTime() < Date.now();
};

export const ensureCouponSchema = async () => {
  if (!ensureCouponSchemaPromise) {
    ensureCouponSchemaPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS coupons (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          code VARCHAR(100) NOT NULL,
          min_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          bonus_percent DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          max_bonus DECIMAL(10,2) DEFAULT NULL,
          usage_per_user INT NOT NULL DEFAULT 1,
          total_usage INT NOT NULL DEFAULT 0,
          max_usage INT DEFAULT NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          expiry_date DATETIME DEFAULT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_coupon_code (code)
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS coupon_usages (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          coupon_id BIGINT UNSIGNED NOT NULL,
          used_count INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_coupon_user (user_id, coupon_id),
          KEY idx_coupon_usage_coupon_id (coupon_id),
          CONSTRAINT fk_coupon_usage_user
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE CASCADE,
          CONSTRAINT fk_coupon_usage_coupon
            FOREIGN KEY (coupon_id) REFERENCES coupons(id)
            ON DELETE CASCADE
        )
      `);

      const [couponUsageIndexes] = await db.query(
        `SHOW INDEX FROM coupon_usages WHERE Key_name = 'uq_coupon_user'`
      );

      if (!couponUsageIndexes.length) {
        await db.query(
          `ALTER TABLE coupon_usages
           ADD UNIQUE KEY uq_coupon_user (user_id, coupon_id)`
        );
      }
    })().catch((error) => {
      ensureCouponSchemaPromise = null;
      throw error;
    });
  }

  await ensureCouponSchemaPromise;
};

export const getCouponValidation = async (
  executor,
  { userId, couponCode, amount }
) => {
  const normalizedUserId = Number(userId);
  const normalizedAmount = roundCurrency(amount);
  const normalizedCouponCode = normalizeCouponCode(couponCode);

  if (!normalizedUserId || !normalizedCouponCode || !normalizedAmount || normalizedAmount <= 0) {
    throw new Error("Valid userId, couponCode and amount are required");
  }

  const [[coupon]] = await executor.query(
    `SELECT *
     FROM coupons
     WHERE UPPER(code) = ?
       AND is_active = 1
     LIMIT 1`,
    [normalizedCouponCode]
  );

  if (!coupon) {
    throw new Error("Invalid coupon code");
  }

  if (isCouponExpired(coupon.expiry_date)) {
    throw new Error("Coupon expired");
  }

  const minimumAmount = roundCurrency(coupon.min_amount);

  if (normalizedAmount < minimumAmount) {
    throw new Error(`Minimum recharge Rs.${minimumAmount} required`);
  }

  const maxUsage = Number(coupon.max_usage || 0);
  const totalUsage = Number(coupon.total_usage || 0);

  if (maxUsage > 0 && totalUsage >= maxUsage) {
    throw new Error("Coupon fully used");
  }

  const [[usage]] = await executor.query(
    `SELECT used_count
     FROM coupon_usages
     WHERE user_id = ? AND coupon_id = ?
     LIMIT 1`,
    [normalizedUserId, coupon.id]
  );

  const usagePerUser = Number(coupon.usage_per_user || 0);
  const usedCount = Number(usage?.used_count || 0);

  if (usagePerUser > 0 && usedCount >= usagePerUser) {
    throw new Error("Coupon usage limit reached");
  }

  const bonusPercent = Number(coupon.bonus_percent || 0);
  const maxBonus = Number(coupon.max_bonus || 0);
  let bonusAmount = roundCurrency((normalizedAmount * bonusPercent) / 100);

  if (maxBonus > 0) {
    bonusAmount = Math.min(bonusAmount, roundCurrency(maxBonus));
  }

  bonusAmount = roundCurrency(bonusAmount);

  return {
    couponId: Number(coupon.id),
    code: coupon.code,
    minAmount: minimumAmount,
    bonusPercent: roundCurrency(bonusPercent),
    bonusAmount,
    creditedAmount: roundCurrency(normalizedAmount + bonusAmount),
    amount: normalizedAmount,
  };
};

export const validateCoupon = async (req, res) => {
  try {
    await ensureCouponSchema();

    const { userId, couponCode, amount } = req.body;
    const couponData = await getCouponValidation(db, {
      userId,
      couponCode,
      amount,
    });

    return res.status(200).json({
      success: true,
      data: couponData,
    });
  } catch (error) {
    console.error("Validate coupon error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Unable to validate coupon",
    });
  }
};

export const getAvailableCoupons = async (req, res) => {
    try {

        const userId = parseInt(req.query.userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required."
            });
        }

        const [rows] = await db.execute(
            `
            SELECT
                c.id,
                c.code,
                c.min_amount,
                c.bonus_percent,
                c.max_bonus,
                c.usage_per_user,
                c.total_usage,
                c.max_usage,
                c.expiry_date,
                IFNULL(u.used_count,0) AS used_count
            FROM coupons c

            LEFT JOIN coupon_usages u
                ON u.coupon_id = c.id
                AND u.user_id = ?

            WHERE
                c.is_active = 1
                AND DATE(c.expiry_date) >= CURDATE()
                AND c.total_usage < c.max_usage
                AND (
                    u.used_count IS NULL
                    OR u.used_count < c.usage_per_user
                )

            ORDER BY
                c.min_amount ASC,
                c.bonus_percent DESC
            `,
            [userId]
        );

        return res.json({
            success: true,
            data: rows
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch coupons."
        });

    }
};

export const getBanner = async (req, res) => {
  try {
    const version = process.env.BANNER_VERSION || "1";
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const banners = [
      {
        id: 1,
        image: `${baseUrl}/express/image/walletBanner/11.jpg?v=${version}`,
        clickUrl: "/wallet",
      },
      {
        id: 2,
        image: `${baseUrl}/express/image/walletBanner/22.jpg?v=${version}`,
        clickUrl: "/wallet",
      },
      {
        id: 3,
        image: `${baseUrl}/express/image/walletBanner/33.jpg?v=${version}`,
        clickUrl: "/wallet",
      },
    ];

    return res.status(200).json({
      success: true,
      data: banners,
    });
  } catch (err) {
    console.error("Banner Error:", err);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch banners.",
    });
  }
};