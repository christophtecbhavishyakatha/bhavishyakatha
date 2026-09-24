import express from "express";
import { validateCoupon, getAvailableCoupons, getBanner   } from "../controllers/cupon.controller.js";

const router = express.Router();

router.post("/validate", validateCoupon);
router.get("/list", getAvailableCoupons );
router.get("/banner", getBanner);

export default router;
