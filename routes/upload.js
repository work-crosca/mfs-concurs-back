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
    secretAccessKey: process.env.MINIO_SECRET_KEY
  }
});

// Mapare user-friendly categorii
const categoryMap = {
  sport: "Sport & Active Lifestyle",
  digital: "Digital & Urban Vibes",
  traditions: "Moldova – My Love",
  nature: "Eco Pulse",
  freestyle: "Freestyle"
};

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { nickname, email, category, description } = req.body;

    // verifică limita
    const count = await Upload.countDocuments({ email, category });
    if (count >= 5) {
      const friendlyCategory = categoryMap[category] || category;
      console.log(chalk.yellow(`⚠️ User ${email} are deja ${count} înregistrări la categoria ${friendlyCategory}.`));

      return res.status(400).json({
        success: false,
        message: `Ai atins limita de 5 înscrieri pentru categoria "${friendlyCategory}".`
      });
    }

    let fileUrl;
    const bucket = process.env.MINIO_BUCKET || "uploads";
    const fileName = `${Date.now()}-${nickname.replace(/\s+/g, "_")}.png`;

    try {
      // Încearcă să urce în MinIO
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: fileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
      }));

      fileUrl = `${process.env.MINIO_PUBLIC_URL}/${bucket}/${fileName}`;
      console.log(chalk.green("✔ Fișier urcat pe MinIO:"), fileUrl);
    } catch (err) {
      console.error(chalk.yellow("⚠️ MinIO eșuat, fallback pe local:"), err);

      // fallback pe local
      const localDir = "./uploads";
      if (!fs.existsSync(localDir)) fs.mkdirSync(localDir);
      const localPath = path.join(localDir, fileName);
      fs.writeFileSync(localPath, req.file.buffer);
      fileUrl = `/uploads/${fileName}`;
      console.log(chalk.green("✔ Fișier salvat local:"), fileUrl);
    }

    // Salvează în Mongo
    const newUpload = await Upload.create({
      nickname,
      email,
      category,
      description,
      fileUrl
    });

    console.log(chalk.green("✔ Upload salvat în MongoDB:"), newUpload);

    // Trimite pe Telegram
    await sendToTelegram({
      nickname,
      email,
      category: categoryMap[category] || category,
      description,
      fileUrl
    });

    res.json({ success: true, data: newUpload });

  } catch (err) {
    console.error(chalk.red("❌ Eroare la upload:"), err);
    res.status(500).json({ success: false, message: "Eroare la upload" });
  }
});

async function sendToTelegram({ nickname, email, category, description, fileUrl }) {
  try {
    const botToken = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    const text = `📥 Nouă înscriere:
👤 ${nickname}
✉️ ${email}
🎨 ${category}
📝 ${description}
📎 ${fileUrl}`;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text })
    });

    const result = await response.json();
    if (!result.ok) throw new Error(`Telegram error: ${result.description}`);

    console.log(chalk.green("✅ Trimis cu succes pe Telegram"));
  } catch (error) {
    console.error(chalk.red("❌ Eroare la Telegram:"), error);
    throw error;
  }
}

export default router;