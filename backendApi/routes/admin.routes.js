import express from "express";
import {
    addTicketComment,
    adminLogin,
    blockAstrologer,
    getAdminProfile,
    getAllTickets,
    getAstrologerCalls,
    getAstrologers,
    getAstrologerWalletLogs,
    getCallLogs,
    getPendingAstrologers,
    getPendingTicketCount,
    getRechargeLogs,
    getTicketWithComments,
    getUsers,
    getVerifiedAstrologers,
    unblockAstrologer,
    updateTicketStatus,
    updateVerifiedAstrologer,
    verifyAstrologer,
} from "../controllers/admin.controller.js";
import {
    getAllAstrologers,
    getPayoutHistory,
    transferToBank,
    updatePayoutStatus,
} from "../controllers/payout.controller.js";
import {
    createAdminSocialPost,
    deleteAdminSocialComment,
    deleteAdminSocialCommentReply,
    deleteAdminSocialPost,
    getAdminSocialPosts,
    replyToSocialComment,
} from "../controllers/social.controller.js";
const router = express.Router();

import { sendNotification } from "../controllers/notification.controller.js";

router.post("/send-notification", sendNotification);

router.post("/admin-login", adminLogin);
router.get("/admin-profile/:adminId", getAdminProfile);
router.get("/pending", getPendingAstrologers);
router.post("/verify/:astrologerId", verifyAstrologer);
router.get("/verified", getVerifiedAstrologers);
router.put("/update/:astrologerId", updateVerifiedAstrologer);
router.post("/block/:astrologerId", blockAstrologer);
router.post("/unblock/:astrologerId", unblockAstrologer);
router.get("/tickets/pending-count", getPendingTicketCount);
router.get("/tickets", getAllTickets);
router.get("/tickets/:ticketId", getTicketWithComments);
router.post("/tickets/comment", addTicketComment);
router.put("/tickets/:ticketId", updateTicketStatus);
router.get("/social/posts", getAdminSocialPosts);
router.post("/social/posts", createAdminSocialPost);
router.delete("/social/posts/:postId", deleteAdminSocialPost);
router.post("/social/comments/:commentId/reply", replyToSocialComment);
router.delete("/social/comments/:commentId", deleteAdminSocialComment);
router.delete("/social/comments/:commentId/reply", deleteAdminSocialCommentReply);

router.get("/astrologers", getAllAstrologers);
router.post("/transfer", transferToBank);
router.get("/payout-history/:astrologer_id", getPayoutHistory);
router.post("/payout-status", updatePayoutStatus);
router.get("/recharge-logs", getRechargeLogs);
router.get("/call-logs", getCallLogs);
router.get("/users", getUsers);
router.get("/astrologers", getAstrologers);
router.get("/astrologer/calls/:astrologer_id", getAstrologerCalls);
router.get("/astrologer/wallet/:astrologer_id", getAstrologerWalletLogs);
export default router;
