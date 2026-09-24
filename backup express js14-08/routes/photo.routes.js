import express from "express";
import {
  getAstrologerPhotos,
  uploadPhoto,
  deletePhoto,
} from "../controllers/photos.controller.js";

const router = express.Router();

router.get("/astrologer/:astrologer_id", getAstrologerPhotos);
router.post("/upload", uploadPhoto);
router.delete("/:id", deletePhoto);

export default router;