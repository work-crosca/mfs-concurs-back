import express from "express";
import Like from "../models/Like.js";
import Upload from "../models/Upload.js";

const router = express.Router();

// POST /api/likes - adaugă un like
router.post("/", async (req, res) => {
  try {
    const { uploadId, userId } = req.body;

    const alreadyLiked = await Like.findOne({ uploadId, userId });
    if (alreadyLiked) {
      return res.status(400).json({ message: "Ai dat deja like la această imagine." });
    }

    await Like.create({ uploadId, userId });

    const updatedUpload = await Upload.findByIdAndUpdate(
      uploadId,
      { $inc: { likesCount: 1 } },
      { new: true }
    );

    res.json({
      message: "Like adăugat!",
      likesCount: updatedUpload.likesCount
    });
  } catch (err) {
    console.error("Eroare la like:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/likes - elimină un like
router.delete("/", async (req, res) => {
  try {
    const { uploadId, userId } = req.body;

    const deleted = await Like.findOneAndDelete({ uploadId, userId });
    if (!deleted) {
      return res.status(404).json({ message: "Nu există like-ul pentru a fi șters." });
    }

    const updatedUpload = await Upload.findByIdAndUpdate(
      uploadId,
      { $inc: { likesCount: -1 } },
      { new: true }
    );

    res.json({
      message: "Like eliminat.",
      likesCount: updatedUpload.likesCount
    });
  } catch (err) {
    console.error("Eroare la unlike:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;