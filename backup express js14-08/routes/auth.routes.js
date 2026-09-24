import express from "express";
import {
  sendOtp,
  verifyOtp,
  saveProfile, verifyFcmToken 
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/profile", saveProfile);
router.post("/verify-fcm-token", verifyFcmToken );

export default router;
