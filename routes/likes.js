import express from "express";
import mongoose from "mongoose";
import Like from "../models/Likes.js";
import Upload from "../models/Upload.js";

const router = express.Router();

// === Helper: email validation ===
const isValidEmail = (email) => {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// === Helper: get last liked users ===
const getLastLikedUsers = async (uploadId) => {
  const lastLikes = await Like.find({ uploadId })
    .sort({ createdAt: -1 })
    .limit(3);

  return lastLikes.map((like) => like.userId?.[0]?.toLowerCase() || "?");
};

// === POST /api/likes ===
router.post("/", async (req, res) => {
  try {
    const { uploadId, userId } = req.body;

    if (!uploadId || !userId) {
      return res.status(400).json({ message: "Missing data." });
    }

    if (!mongoose.Types.ObjectId.isValid(uploadId)) {
      return res.status(400).json({ message: "Invalid image ID." });
    }

    if (!isValidEmail(userId)) {
      return res.status(400).json({ message: "Invalid email address." });
    }

    const upload = await Upload.findById(uploadId);
    if (!upload) {
      return res.status(404).json({ message: "Image not found." });
    }

    const alreadyLiked = await Like.findOne({ uploadId, userId });
    if (alreadyLiked) {
      return res.status(400).json({
        code: 1001,
        message: "You have already liked this image.",
      });
    }

    const otherLikeInCategory = await Like.find({ userId }).populate(
      "uploadId"
    );
    const hasLikedSameCategory = otherLikeInCategory.some(
      (like) => like.uploadId?.category === upload.category
    );

    if (hasLikedSameCategory) {
      return res.status(400).json({
        message: "You can only like one entry per category.",
      });
    }

    await Like.create({ uploadId, userId });

    const updatedUpload = await Upload.findByIdAndUpdate(
      uploadId,
      { $inc: { likesCount: 1 } },
      { new: true }
    );

    const lastLikedUsers = await getLastLikedUsers(uploadId);

    return res.json({
      message: "Like added successfully!",
      likesCount: updatedUpload.likesCount,
      lastLikedUsers,
    });
  } catch (err) {
    console.error("Error while adding like:", err.message);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
});

// === DELETE /api/likes ===
router.delete("/", async (req, res) => {
  try {
    const { uploadId, userId } = req.body;

    if (!uploadId || !userId) {
      return res.status(400).json({ message: "Missing data." });
    }

    if (!mongoose.Types.ObjectId.isValid(uploadId)) {
      return res.status(400).json({ message: "Invalid image ID." });
    }

    if (!isValidEmail(userId)) {
      return res.status(400).json({ message: "Invalid email address." });
    }

    const upload = await Upload.findById(uploadId);
    if (!upload) {
      return res.status(404).json({ message: "Image not found." });
    }

    const deleted = await Like.findOneAndDelete({ uploadId, userId });
    if (!deleted) {
      return res.status(404).json({ message: "Like not found to delete." });
    }

    const updatedUpload = await Upload.findByIdAndUpdate(
      uploadId,
      { $inc: { likesCount: -1 } },
      { new: true }
    );

    const lastLikedUsers = await getLastLikedUsers(uploadId);

    return res.json({
      message: "Like removed successfully.",
      likesCount: updatedUpload.likesCount,
      lastLikedUsers,
    });
  } catch (err) {
    console.error("Error while removing like:", err.message);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
});

export default router;
