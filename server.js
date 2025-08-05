import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { connectDB } from "./db.js";
import uploadRoutes from "./routes/upload.js";
import likesRoutes from "./routes/likes.js";
import imagesRoutes from "./routes/images.js";
import otpRoutes from "./routes/otp.js";
import adminRoutes from "./routes/admin.js";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Healthcheck endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use("/api/images", imagesRoutes);
app.use("/api/likes", likesRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/admin", adminRoutes); 

await connectDB();

app.use("/api/upload", uploadRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
