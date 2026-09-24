import express from "express";

import {
  getAllComments,
  getCommentById,
  getCommentAstrologers,
  replyToComment,
  editCommentReply,
  deleteCommentReply,
  deleteWholeComment,
} from "../controllers/adminComment.controller.js";

const router = express.Router();

router.get("/astrologers", getCommentAstrologers);

router.get("/", getAllComments);

router.get("/:id", getCommentById);

router.post("/:id/reply", replyToComment);

router.put("/:id/reply", editCommentReply);

router.delete("/:id/reply", deleteCommentReply);
router.delete("/:id", deleteWholeComment);

export default router;
