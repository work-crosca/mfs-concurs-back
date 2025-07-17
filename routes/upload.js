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

    if (!nickname || !email || !category || !req.file) {
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
          `⚠️ User ${email} already has ${count} submissions in category ${friendlyCategory}.`
        )
      );

      return res.status(400).json({
        success: false,
        message: `You have reached the submission limit (5) for category "${friendlyCategory}".`,
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
      console.log(chalk.green("✔ File uploaded to MinIO:"), fileUrl);
    } catch (err) {
      console.error(
        chalk.yellow("⚠️ MinIO failed, falling back to local storage:"),
        err
      );

      const localDir = "./uploads";
      if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
      const localPath = path.join(localDir, fileName);
      fs.writeFileSync(localPath, req.file.buffer);
      fileUrl = `/uploads/${fileName}`;
      console.log(chalk.green("✔ File saved locally:"), fileUrl);
    }

    const newUpload = await Upload.create({
      nickname,
      email,
      category,
      description,
      fileUrl,
    });

    console.log(chalk.green("✔ Upload saved to MongoDB:"), newUpload);

    await sendToTelegramMessage({
      nickname,
      email,
      category: categoryMap[category] || category,
      description,
      fileUrl,
    });

    res.json({ success: true, data: newUpload });
  } catch (err) {
    console.error(chalk.red("❌ Upload failed:"), err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

async function sendToTelegramMessage({
  nickname,
  email,
  category,
  description,
  fileUrl,
}) {
  try {
    const botToken = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    const text = `📥 New submission:
👤 ${nickname}
✉️ ${email}
🎨 ${category}
📝 ${description}`;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: false,
        reply_markup: {
          inline_keyboard: [[
            { text: "🔗 View artwork", url: fileUrl }
          ]]
        }
      }),
    });

    const result = await response.json();
    if (!result.ok) throw new Error(`Telegram error: ${result.description}`);

    console.log(chalk.green("✅ Message successfully sent to Telegram"));
  } catch (error) {
    console.error(chalk.red("❌ Telegram error:"), error);
    throw error;
  }
}

export default router;