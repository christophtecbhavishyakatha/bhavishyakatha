// routes/versionRoutes.js

import express from "express";
import { checkAppVersionUser,checkAppVersionAstrologer } from "../controllers/update.controller.js";

const router = express.Router();

router.post("/user", checkAppVersionUser);
router.post("/astrologer", checkAppVersionAstrologer);

export default router;