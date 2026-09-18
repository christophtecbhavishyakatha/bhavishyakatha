import express from "express";

import {
  createAudioCallRequest,
  createVideoCallRequest,
  createChatRequest
} from "../controllers/callRequest.controller.js";

import {
  createAudioCallRequest as createAudioCallRequestV1,
  createVideoCallRequest as createVideoCallRequestV1,
  createChatRequest as createChatRequestV1
} from "../controllers/callRequest_v1.controller.js";

const router = express.Router();

router.post("/requestAudio", createAudioCallRequest);
router.post("/requestVideo", createVideoCallRequest);
router.post("/requestChat", createChatRequest);

router.post("/requestAudio/v1", createAudioCallRequestV1);
router.post("/requestVideo/v1", createVideoCallRequestV1);
router.post("/requestChat/v1", createChatRequestV1);

export default router;