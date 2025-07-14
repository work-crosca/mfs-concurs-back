import 'dotenv/config';
import express from "express";
import cors from "cors";
import path from "path";
import { connectDB } from "./db.js";
import uploadRoutes from "./routes/upload.js";
import likesRoutes from "./routes/likes.js";
import imagesRoutes from "./routes/images.js";


const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), "uploads")));
app.use("/api/images", imagesRoutes);
app.use("/api/likes", likesRoutes);

await connectDB();

app.use("/api/upload", uploadRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));