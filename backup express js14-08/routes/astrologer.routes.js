import express from "express";
import {
  getProfile,
  getHomeData,
  updateStatus,
  getTransactions,getAstrologerBio, updateAstrologerBio,
  getStatus, getCallRequestsWithCustomer, rejectCallRequest, acceptCall, endCall, getChatListByUser,getChatMessages
} from "../controllers/astrologer.controller.js";
import { getAgoraToken ,getUserAgoraToken} from "../controllers/agora.controller.js";
import { endCallNoJoin } from "../controllers/calReject.controller.js";
import { astrologerBankTransfer } from "../controllers/astrologerbanktransfer.controller.js";
import { getPrivacy,getTerms } from "../controllers/policyastrologer.controller.js";
const router = express.Router();

router.get("/profile/:id", getProfile);
router.get("/home/:id", getHomeData);
router.get("/status/:id", getStatus);
router.post("/status/update", updateStatus);
router.post('/call-requests', getCallRequestsWithCustomer);
router.post('/reject-call', rejectCallRequest);
router.post('/accept-call', acceptCall);
router.get("/agora/token", getAgoraToken);
router.get("/agora/userToken", getUserAgoraToken);
router.post("/call/end", endCall);
router.post("/call/no-answer", endCallNoJoin);
router.post("/transactions", getTransactions);
router.get("/bio/:astrologer_id", getAstrologerBio);
router.post("/bio/update", updateAstrologerBio);
// 📌 Chat list (last message per room)
router.get("/chat/list", getChatListByUser);

// 📌 Get messages of a room (pagination supported)
router.get("/chat/messages/:room_id", getChatMessages);
router.get("/terms", getTerms);
router.get("/privacy", getPrivacy); 
router.get(
  "/transactions/:astrologer_id",
  astrologerBankTransfer
);
export default router;
