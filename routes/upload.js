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

    // salvează în Mongo
    const newUpload = await Upload.create({
      nickname,
      email,
      category,
      description,
      fileUrl
    });

    console.log("✔ Upload salvat în Mongo:", newUpload);

    // trimite pe Telegram
    await sendToTelegram({
      nickname,
      email,
      category,
      description,
      filePath: path.join(process.cwd(), "uploads", req.file.filename)
    });

    res.json({ success: true, data: newUpload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Eroare la upload" });
  }
});

async function sendToTelegram({ nickname, email, category, description, filePath }) {
  const botToken = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("caption", `📥 Nouă înscriere:\n👤 ${nickname}\n✉️ ${email}\n🎨 ${category}\n📝 ${description}`);
  formData.append("document", fs.createReadStream(filePath));

  await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
    method: "POST",
    body: formData
  });
}

export default router;