import express from "express";
import Upload from "../models/Upload.js";
import Like from "../models/Likes.js";

const router = express.Router();

// GET /api/images - lista imaginilor
// GET /api/images - lista imaginilor cu filtrare + paginare
router.get("/", async (req, res) => {
  try {
    const { category, page = 1, limit = 6 } = req.query;
    const query = { isVerified: true };

    if (category && category !== "all") {
      query.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const uploads = await Upload.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Upload.countDocuments(query);

    res.json({
      uploads,
      total,
    });
  } catch (err) {
    console.error("Eroare la get images:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/images/:id - detaliu imagine + hasLiked
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    const upload = await Upload.findById(id);
    if (!upload) {
      return res.status(404).json({ message: "Imaginea nu a fost găsită." });
    }

    let hasLiked = false;
    if (userId) {
      const existingLike = await Like.findOne({ uploadId: id, userId });
      hasLiked = !!existingLike;
    }

    res.json({
      ...upload.toObject(),
      hasLiked,
      likesCount: upload.likesCount,
    });
  } catch (err) {
    console.error("Eroare la get image:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
