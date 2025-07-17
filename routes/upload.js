import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import chalk from "chalk";
import Upload from "../models/Upload.js";
import fetch from "node-fetch";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Config MinIO client
const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
  },
});

const categoryMap = {
  sport: "Sport & Active Lifestyle",
  digital: "Digital & Urban Vibes",
  traditions: "Moldova – My Love",
  nature: "Eco Pulse",
  freestyle: "Freestyle",
};

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { nickname, email, category, description } = req.body;

    if (!nickname || !email || !category || !description || !req.file) {
      return res.status(400).json({
        success: false,
        message: "All form fields and the uploaded file are mandatory.",
      });
    }

    const count = await Upload.countDocuments({ email, category });
    if (count >= 5) {
      const friendlyCategory = categoryMap[category] || category;
      console.log(
        chalk.yellow(
          `⚠️ User ${email} are deja ${count} înregistrări la categoria ${friendlyCategory}.`
        )
      );

      return res.status(400).json({
        success: false,
        message: `Ai atins limita de 5 înscrieri pentru categoria "${friendlyCategory}".`,
      });
    }

    let fileUrl;
    const bucket = process.env.MINIO_BUCKET || "uploads";
    const safeNickname = nickname.replace(/\s+/g, "_");
    const fileName = `${Date.now()}-${safeNickname}.png`;

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: fileName,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        })
      );

      const publicUrl =
        process.env.MINIO_PUBLIC_URL || "https://e.cdnmoldcell.md";
      fileUrl = `${publicUrl}/${bucket}/${fileName}`;
      console.log(chalk.green("✔ Fișier urcat pe MinIO:"), fileUrl);
    } catch (err) {
      console.error(chalk.yellow("⚠️ MinIO eșuat, fallback pe local:"), err);

      const localDir = "./uploads";
      if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
      const localPath = path.join(localDir, fileName);
      fs.writeFileSync(localPath, req.file.buffer);
      fileUrl = `/uploads/${fileName}`;
      console.log(chalk.green("✔ Fișier salvat local:"), fileUrl);
    }

    const newUpload = await Upload.create({
      nickname,
      email,
      category,
      description,
      fileUrl,
    });

    console.log(chalk.green("✔ Upload salvat în MongoDB:"), newUpload);

    await sendToTelegramWithFile({
      nickname,
      email,
      category: categoryMap[category] || category,
      description,
      fileBuffer: req.file.buffer,
      fileName,
      isImage: req.file.mimetype.startsWith("image/"),
    });

    res.json({ success: true, data: newUpload });
  } catch (err) {
    console.error(chalk.red("❌ Eroare la upload:"), err);
    res.status(500).json({ success: false, message: "Eroare la upload" });
  }
});

async function sendToTelegramWithFile({
  nickname,
  email,
  category,
  description,
  fileBuffer,
  fileName,
  isImage,
}) {
  try {
    const botToken = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    const caption = `📥 Nouă înscriere:\n👤 ${nickname}\n✉️ ${email}\n🎨 ${category}\n📝 ${description}`;

    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("caption", caption);
    formData.append(
      isImage ? "photo" : "document",
      Buffer.from(fileBuffer),
      fileName
    );

    const endpoint = isImage
      ? `https://api.telegram.org/bot${botToken}/sendPhoto`
      : `https://api.telegram.org/bot${botToken}/sendDocument`;

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (!result.ok) throw new Error(`Telegram error: ${result.description}`);

    console.log(chalk.green("✅ Trimis cu succes pe Telegram (ca fișier)"));
  } catch (error) {
    console.error(chalk.red("❌ Eroare la Telegram:"), error);
    throw error;
  }
}

export default router;
