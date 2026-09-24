import express from "express";
import {
  sendOtp,
  verifyOtp,completeProfile, getUserById,UserVerifyFcmToken 
} from "../controllers/authUser.controller.js";
import { getTerms, getPrivacy } from "../controllers/policy.controller.js";
const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/complete-profile", completeProfile);
router.get("/users/:userId", getUserById);
router.get("/terms", getTerms);
router.get("/privacy", getPrivacy); 
router.post("/user-verify-fcm-token", UserVerifyFcmToken );

export default router;
