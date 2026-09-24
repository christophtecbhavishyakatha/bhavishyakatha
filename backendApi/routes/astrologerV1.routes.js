import express from "express";
import { getCallRequestsWithCustomerV1 } from "../controllers/astrologerV1.controller.js";

const router = express.Router();

router.post("/call-requests-v1", getCallRequestsWithCustomerV1);

export default router;
