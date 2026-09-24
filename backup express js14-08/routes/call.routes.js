import express from "express";
import { createAudioCallRequest, createVideoCallRequest , createChatRequest} from "../controllers/callRequest.controller.js";

const router = express.Router();

router.post("/requestAudio", createAudioCallRequest);
router.post("/requestVideo", createVideoCallRequest);
router.post("/requestChat", createChatRequest);

export default router;
