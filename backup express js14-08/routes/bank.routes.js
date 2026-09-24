// routes/bank.routes.js
import express from "express";
import { saveBankDetails } from "../controllers/bank.controller.js";
import { getBankDetails } from "../controllers/bank.controller.js";
const router = express.Router();

router.post("/add", saveBankDetails);
router.post("/get", getBankDetails);

export default router;
