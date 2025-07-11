import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import Upload from "../models/Upload.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "./uploads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const nickname = req.body.nickname
      ?.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_").toLowerCase() || "file";
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + nickname + ext);
  }
});
const upload = multer({ storage });

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { nickname, email, category, description } = req.body;
    const fileUrl = `/uploads/${req.file.filename}`;

    // salvează în mongo
    const newUpload = await Upload.create({
      nickname,
      email,
      category,
      description,
      fileUrl
    });

    console.log("✔ Upload saved:", newUpload);
    res.json({ success: true, data: newUpload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Eroare la salvare în MongoDB" });
  }
});

export default router;