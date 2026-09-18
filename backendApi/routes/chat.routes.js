import express from "express";
import {
  getChatMessages,
  initChatSession,
  sendChatMessage,
} from "../controllers/chat.controller.js";

const router = express.Router();

router.post("/init", initChatSession);
router.get("/messages", getChatMessages);
router.post("/send", sendChatMessage);

export default router;
