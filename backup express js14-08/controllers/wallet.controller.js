import crypto from "crypto";
import Razorpay from "razorpay";
import db from "../config/db.js";
import { ensureCouponSchema, getCouponValidation } from "./cupon.controller.js";
import { buildWalletRechargeInvoice } from "../services/pdfInvoice.service.js";

const GST_PERCENT = 18;
const CURRENCY = "INR";
const EVENT_TYPE = "wallet_recharge";
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

let ensureWalletRechargeSchemaPromise = null;

const roundCurrency = (value) => Number(Number(value).toFixed(2));

const normalizeGstin = (value) => String(value ?? "").trim().toUpperCase();

const validateOptionalGstin = (value) => {
  const normalizedValue = normalizeGstin(value);

  if (!normalizedValue) {
    return "";
  }

  return GSTIN_REGEX.test(normalizedValue) ? normalizedValue : null;
};

const ensureWalletRechargeSchema = async () => {
  if (!ensureWalletRechargeSchemaPromise) {
    ensureWalletRechargeSchemaPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS wallet_recharge_logs (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          event_type VARCHAR(50) NOT NULL DEFAULT 'wallet_recharge',
          status VARCHAR(30) NOT NULL DEFAULT 'successful',
          currency VARCHAR(10) NOT NULL DEFAULT 'INR',
          razorpay_order_id VARCHAR(100) NOT NULL,
          razorpay_payment_id VARCHAR(100) NOT NULL,
          razorpay_signature VARCHAR(255) NOT NULL,
          recharge_amount DECIMAL(10,2) NOT NULL,
          gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          payable_amount DECIMAL(10,2) NOT NULL,
          customer_gstin VARCHAR(20) DEFAULT NULL,
          coupon_id BIGINT UNSIGNED DEFAULT NULL,
          coupon_code VARCHAR(100) DEFAULT NULL,
          coupon_bonus_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          credited_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          previous_balance DECIMAL(10,2) NOT NULL,
          after_balance DECIMAL(10,2) NOT NULL,
          payment_status VARCHAR(30) DEFAULT NULL,
	  invoice_number VARCHAR(50) UNIQUE DEFAULT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_wallet_recharge_payment_id (razorpay_payment_id),
          KEY idx_wallet_recharge_user_id (user_id),
          KEY idx_wallet_recharge_event_type (event_type),
          CONSTRAINT fk_wallet_recharge_user
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE CASCADE
        )
      `);

      const [customerGstinColumns] = await db.query(
        `SHOW COLUMNS FROM wallet_recharge_logs LIKE 'customer_gstin'`
      );

      if (!customerGstinColumns.length) {
        await db.query(
          `ALTER TABLE wallet_recharge_logs
           ADD COLUMN customer_gstin VARCHAR(20) DEFAULT NULL
           AFTER payable_amount`
        );
      }

      const [couponIdColumns] = await db.query(
        `SHOW COLUMNS FROM wallet_recharge_logs LIKE 'coupon_id'`
      );

      if (!couponIdColumns.length) {
        await db.query(
          `ALTER TABLE wallet_recharge_logs
           ADD COLUMN coupon_id BIGINT UNSIGNED DEFAULT NULL
           AFTER customer_gstin`
        );
      }

      const [couponCodeColumns] = await db.query(
        `SHOW COLUMNS FROM wallet_recharge_logs LIKE 'coupon_code'`
      );

      if (!couponCodeColumns.length) {
        await db.query(
          `ALTER TABLE wallet_recharge_logs
           ADD COLUMN coupon_code VARCHAR(100) DEFAULT NULL
           AFTER coupon_id`
        );
      }

      const [couponBonusColumns] = await db.query(
        `SHOW COLUMNS FROM wallet_recharge_logs LIKE 'coupon_bonus_amount'`
      );

      if (!couponBonusColumns.length) {
        await db.query(
          `ALTER TABLE wallet_recharge_logs
           ADD COLUMN coupon_bonus_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00
           AFTER coupon_code`
        );
      }

      const [creditedAmountColumns] = await db.query(
        `SHOW COLUMNS FROM wallet_recharge_logs LIKE 'credited_amount'`
      );

      if (!creditedAmountColumns.length) {
        await db.query(
          `ALTER TABLE wallet_recharge_logs
           ADD COLUMN credited_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00
           AFTER coupon_bonus_amount`
        );
      }
    })().catch((error) => {
      ensureWalletRechargeSchemaPromise = null;
      throw error;
    });
  }

  await ensureWalletRechargeSchemaPromise;
};

const getRazorpayInstance = () => {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials are not configured");
  }

  return new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
};

const getRechargeBreakup = (rechargeAmount) => {
  const normalizedRechargeAmount = roundCurrency(rechargeAmount);
  const gstAmount = roundCurrency((normalizedRechargeAmount * GST_PERCENT) / 100);
  const payableAmount = roundCurrency(normalizedRechargeAmount + gstAmount);

  return {
    rechargeAmount: normalizedRechargeAmount,
    gstAmount,
    payableAmount,
  };
};

export const createRazorpayOrder = async (req, res) => {
  try {
    await Promise.all([ensureWalletRechargeSchema(), ensureCouponSchema()]);

    const { userId, rechargeAmount, customerGstin, couponCode } = req.body;
    const normalizedUserId = Number(userId);
    const normalizedRechargeAmount = Number(rechargeAmount);
    const normalizedCustomerGstin = validateOptionalGstin(customerGstin);

    if (!normalizedUserId || !normalizedRechargeAmount || normalizedRechargeAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid userId and rechargeAmount are required",
      });
    }

    if (normalizedCustomerGstin === null) {
      return res.status(400).json({
        success: false,
        message: "GSTIN is invalid",
      });
    }

    const [[user]] = await db.query(
      `SELECT id, full_name, mobile
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [normalizedUserId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const breakup = getRechargeBreakup(normalizedRechargeAmount);
    const couponData = couponCode
      ? await getCouponValidation(db, {
          userId: normalizedUserId,
          couponCode,
          amount: breakup.rechargeAmount,
        })
      : null;
    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: Math.round(breakup.payableAmount * 100),
      currency: CURRENCY,
      receipt: `wallet_${normalizedUserId}_${Date.now()}`,
      notes: {
        userId: String(normalizedUserId),
        rechargeAmount: breakup.rechargeAmount.toFixed(2),
        gstAmount: breakup.gstAmount.toFixed(2),
        payableAmount: breakup.payableAmount.toFixed(2),
        eventType: EVENT_TYPE,
        customerGstin: normalizedCustomerGstin,
        couponId: couponData ? String(couponData.couponId) : "",
        couponCode: couponData?.code || "",
        couponBonusAmount: couponData ? couponData.bonusAmount.toFixed(2) : "0.00",
        creditedAmount: couponData
          ? couponData.creditedAmount.toFixed(2)
          : breakup.rechargeAmount.toFixed(2),
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        rechargeAmount: breakup.rechargeAmount,
        gstAmount: breakup.gstAmount,
        payableAmount: breakup.payableAmount,
        coupon: couponData,
        customerGstin: normalizedCustomerGstin,
        user: {
          full_name: user.full_name,
          mobile: user.mobile,
        },
      },
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to create Razorpay order",
    });
  }
};


export const verifyRazorpayPayment = async (req, res) => {
  let connection;

  try {
    await Promise.all([ensureWalletRechargeSchema(), ensureCouponSchema()]);

    connection = await db.getConnection();

    const {
      userId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = req.body;

    const normalizedUserId = Number(userId);

    if (!normalizedUserId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "userId, razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
      });
    }

    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpaySecret) {
      return res.status(500).json({
        success: false,
        message: "Razorpay credentials are not configured",
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", razorpaySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay signature",
      });
    }

    const razorpay = getRazorpayInstance();
    const [payment, order] = await Promise.all([
      razorpay.payments.fetch(razorpayPaymentId),
      razorpay.orders.fetch(razorpayOrderId),
    ]);

    if (!payment || payment.order_id !== razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: "Payment does not belong to this order",
      });
    }

    if (!["authorized", "captured"].includes(payment.status)) {
      return res.status(400).json({
        success: false,
        message: `Payment status is ${payment.status}. Wallet cannot be recharged yet.`,
      });
    }

    const orderUserId = Number(order?.notes?.userId || 0);
    const rechargeAmount = roundCurrency(order?.notes?.rechargeAmount || 0);
    const gstAmount = roundCurrency(order?.notes?.gstAmount || 0);
    const orderPayableAmount = roundCurrency(order?.notes?.payableAmount || 0);
    const payableAmount = roundCurrency((payment.amount || 0) / 100);
    const eventType = order?.notes?.eventType || EVENT_TYPE;
    const customerGstin = validateOptionalGstin(order?.notes?.customerGstin);
    const couponId = Number(order?.notes?.couponId || 0);
    const couponCode = String(order?.notes?.couponCode || "").trim();
    const couponBonusAmount = roundCurrency(order?.notes?.couponBonusAmount || 0);
    const creditedAmountFromOrder = roundCurrency(order?.notes?.creditedAmount || 0);

    if (orderUserId !== normalizedUserId) {
      return res.status(400).json({
        success: false,
        message: "Order does not belong to this user",
      });
    }

    if (!rechargeAmount || eventType !== EVENT_TYPE) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet recharge metadata on Razorpay order",
      });
    }

    if (customerGstin === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid GSTIN in payment metadata",
      });
    }

    if (orderPayableAmount && orderPayableAmount !== payableAmount) {
      return res.status(400).json({
        success: false,
        message: "Payment amount does not match the wallet recharge order",
      });
    }

    await connection.beginTransaction();

    const [[existingLog]] = await connection.query(
      `SELECT id, user_id, after_balance, coupon_bonus_amount, credited_amount
       FROM wallet_recharge_logs
       WHERE razorpay_payment_id = ?
       LIMIT 1
       FOR UPDATE`,
      [razorpayPaymentId]
    );

    if (existingLog) {
      await connection.commit();

      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        data: {
          recharge_log_id: Number(existingLog.id || 0),
          wallet_balance: Number(existingLog.after_balance || 0),
          previous_balance: null,
          recharge_amount: rechargeAmount,
          coupon_bonus_amount: Number(existingLog.coupon_bonus_amount || 0),
          credited_amount: Number(existingLog.credited_amount || rechargeAmount),
        },
      });
    }

    const [[user]] = await connection.query(
      `SELECT wallet_balance
       FROM users
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [normalizedUserId]
    );

    if (!user) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let appliedCouponId = null;
    let appliedCouponCode = null;
    let bonusAmount = 0;

    if (couponId && couponCode) {
      const [[coupon]] = await connection.query(
        `SELECT id, code
         FROM coupons
         WHERE id = ? AND UPPER(code) = ?
         LIMIT 1`,
        [couponId, couponCode.toUpperCase()]
      );

      if (coupon) {
        appliedCouponId = Number(coupon.id);
        appliedCouponCode = coupon.code;
        bonusAmount = couponBonusAmount;
      }
    }

    const creditedAmount = roundCurrency(
      creditedAmountFromOrder || rechargeAmount + bonusAmount
    );
    const previousBalance = roundCurrency(user.wallet_balance || 0);
    const afterBalance = roundCurrency(previousBalance + creditedAmount);

    await connection.query(
      `UPDATE users
       SET wallet_balance = ?
       WHERE id = ?`,
      [afterBalance, normalizedUserId]
    );


const [insertResult] = await connection.query(
`INSERT INTO wallet_recharge_logs
(user_id, event_type, status, currency, razorpay_order_id,
 razorpay_payment_id, razorpay_signature,
 recharge_amount, gst_amount, payable_amount,
 customer_gstin, coupon_id, coupon_code,
 coupon_bonus_amount, credited_amount,
 previous_balance, after_balance,
 payment_status, invoice_number)

VALUES (?, ?, 'successful', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
[
  normalizedUserId,
  EVENT_TYPE,
  payment.currency?.toUpperCase() || CURRENCY,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  rechargeAmount,
  gstAmount,
  payableAmount,
  customerGstin || null,
  appliedCouponId,
  appliedCouponCode,
  bonusAmount,
  creditedAmount,
  previousBalance,
  afterBalance,
  payment.status
]
);

const rechargeLogId = insertResult.insertId;

const currentYear = new Date().getFullYear();
const nextYear = currentYear + 1;

const financialYear =
`${currentYear}-${String(nextYear).slice(-2)}`;

const invoiceNumber =
`INV/${financialYear}/${String(rechargeLogId).padStart(6,'0')}`;

await connection.query(
`UPDATE wallet_recharge_logs
SET invoice_number = ?
WHERE id = ?`,
[invoiceNumber, rechargeLogId]
);

    if (appliedCouponId) {
      await connection.query(
        `UPDATE coupons
         SET total_usage = COALESCE(total_usage, 0) + 1
         WHERE id = ?`,
        [appliedCouponId]
      );

      await connection.query(
        `INSERT INTO coupon_usages (user_id, coupon_id, used_count)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE used_count = used_count + 1`,
        [normalizedUserId, appliedCouponId]
      );
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Wallet recharged successfully",
      data: {
        recharge_log_id: rechargeLogId,
        wallet_balance: afterBalance,
        previous_balance: previousBalance,
        recharge_amount: rechargeAmount,
        coupon_bonus_amount: bonusAmount,
        credited_amount: creditedAmount,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Verify Razorpay payment error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to verify Razorpay payment",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

export const getWalletRechargeHistory = async (req, res) => {
  try {
    await ensureWalletRechargeSchema();

    const { userId } = req.params;
    const normalizedUserId = Number(userId);

    if (!normalizedUserId) {
      return res.status(400).json({
        success: false,
        message: "Valid userId is required",
      });
    }

    const [rows] = await db.query(
      `SELECT id, event_type, status, invoice_number, currency, razorpay_order_id, razorpay_payment_id,
              recharge_amount, gst_amount, payable_amount, customer_gstin,
              coupon_id, coupon_code, coupon_bonus_amount, credited_amount,
              previous_balance, after_balance,
              payment_status, created_at
       FROM wallet_recharge_logs
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [normalizedUserId]
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Get wallet recharge history error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch wallet recharge history",
    });
  }
};

export const downloadWalletRechargeInvoice = async (req, res) => {
  try {
    await ensureWalletRechargeSchema();

    const rechargeLogId = Number(req.params.rechargeLogId);
    const userId = Number(req.query.userId);

    if (!rechargeLogId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Valid rechargeLogId and userId are required",
      });
    }

    const [[row]] = await db.query(
      `SELECT
   	  wrl.id,
	  wrl.invoice_number,
          wrl.user_id,
          wrl.razorpay_order_id,
          wrl.razorpay_payment_id,
          wrl.recharge_amount,
          wrl.gst_amount,
          wrl.payable_amount,
          wrl.customer_gstin,
          wrl.coupon_code,
          wrl.coupon_bonus_amount,
          wrl.credited_amount,
          wrl.created_at,
          u.full_name AS customer_name
       FROM wallet_recharge_logs wrl
       JOIN users u ON u.id = wrl.user_id
       WHERE wrl.id = ?
         AND wrl.user_id = ?
       LIMIT 1`,
      [rechargeLogId, userId]
    );

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Invoice record not found",
      });
    }

    const invoice = buildWalletRechargeInvoice({
      rechargeLogId: row.id,
      createdAt: row.created_at,
      customerName: row.customer_name,
      customerGstin: row.customer_gstin,
      rechargeAmount: row.recharge_amount,
      gstAmount: row.gst_amount,
      payableAmount: row.payable_amount,
      couponCode: row.coupon_code,
      couponBonusAmount: row.coupon_bonus_amount,
      creditedAmount: row.credited_amount,
      razorpayPaymentId: row.razorpay_payment_id,
      razorpayOrderId: row.razorpay_order_id,
invoiceNumber: row.invoice_number,
    });

    return res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Download wallet invoice error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate invoice",
    });
  }
};

