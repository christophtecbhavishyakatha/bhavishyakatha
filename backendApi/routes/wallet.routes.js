import express from "express";
import {
  createRazorpayOrder,
  downloadWalletRechargeInvoice,
  getWalletRechargeHistory,
  verifyRazorpayPayment,
} from "../controllers/wallet.controller.js";

const router = express.Router();

router.post("/razorpay/order", createRazorpayOrder);
router.post("/razorpay/verify", verifyRazorpayPayment);
router.get("/invoice/:rechargeLogId", downloadWalletRechargeInvoice);
router.get("/history/:userId", getWalletRechargeHistory);

export default router;
