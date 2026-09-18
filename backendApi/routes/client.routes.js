import express from "express";
import {
  getAllAstrologers,
  getAstrologerById,
  submitFeedback,
  getUserRating,
  getTransactionHistory,
  getCallHistory,
  getChatHistoryList,
  getChatHistoryMessages,getNotice,
} from "../controllers/client.controller.js";
import { addPublicSocialComment, getPublicSocialPosts } from "../controllers/social.controller.js";
import { acceptIncomingCall, rejectCall , rejectChat} from "../controllers/calReject.controller.js";
import {
  getDailyHoroscope,
} from "../controllers/horoscope.controller.js";
const router = express.Router();
router.get("/notice", getNotice);
router.get("/astrologers", getAllAstrologers);
router.get("/astrologers/:id", getAstrologerById);
router.post("/feedback", submitFeedback);
router.get("/feedback/rating", getUserRating);
router.get("/profile/transactions/:userId", getTransactionHistory);
router.get("/profile/calls/:userId", getCallHistory);
router.get("/profile/chats/:userId", getChatHistoryList);
router.get("/profile/chat/messages/:room_id", getChatHistoryMessages);
router.get("/social/posts", getPublicSocialPosts);
router.post("/social/posts/:postId/comments", addPublicSocialComment);
router.post("/reject-call", rejectCall); 
router.post("/reject-chat", rejectChat); 
router.post("/accept-call", acceptIncomingCall);
router.get(
  "/horoscope/daily/:sign",
  getDailyHoroscope
);
export default router;
