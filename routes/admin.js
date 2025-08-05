import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Admin from "../models/Admin.js";
import Upload from "../models/Upload.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// === Middleware ===
const isAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid token." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(403).json({ message: "Access denied: admin not found." });
    }

    req.user = { id: admin._id, email: admin.email };
    next();
  } catch (err) {
    console.error("[AUTH] Token verification failed:", err);
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

//
// === Auth ===
//

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: "1d" });

    res.json({
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (err) {
    console.error("[AUTH] Login error:", err);
    res.status(500).json({ message: "Login failed." });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out successfully." });
});

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const newAdmin = new Admin({ name, email, password });
    await newAdmin.save();

    res.status(201).json({ success: true, message: "Admin account created successfully." });
  } catch (err) {
    console.error("[AUTH] Registration error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

//
// === CMS: Uploads ===
//

router.get("/uploads", isAdmin, async (req, res) => {
  const {
    filter,
    search,
    category,
    page = 1,
    limit = 9,
    sort = "createdAt:desc"
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const sortField = sort.split(":")[0] || "createdAt";
  const sortOrder = sort.split(":")[1] === "asc" ? 1 : -1;

  let condition = {};

  if (filter === "pending") condition.isVerified = false;
  else if (filter === "verified") condition.isVerified = true;

  if (category) condition.category = category;

  if (search) {
    condition.$or = [
      { nickname: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } }
    ];
  }

  try {
    const total = await Upload.countDocuments(condition);
    const uploads = await Upload.find(condition)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(Number(limit));

    console.log(`[UPLOADS] Filter: ${filter || "all"}, Page: ${page}, Limit: ${limit}, Search: ${search || "-"}, Category: ${category || "-"}, Total: ${total}`);

    res.json({
      uploads,
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err) {
    console.error("[UPLOADS] Error fetching uploads:", err);
    res.status(500).json({ error: "Failed to fetch uploads." });
  }
});

router.patch("/uploads/:id/approve", isAdmin, async (req, res) => {
  try {
    const upload = await Upload.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    );

    if (!upload) {
      return res.status(404).json({ error: "Upload not found." });
    }

    res.json({ success: true, message: "Upload approved." });
  } catch (err) {
    console.error("[UPLOADS] Error approving upload:", err);
    res.status(500).json({ error: "Failed to approve upload." });
  }
});

router.delete("/uploads/:id", isAdmin, async (req, res) => {
  try {
    const deleted = await Upload.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: "Upload not found." });
    }

    res.json({ success: true, message: "Upload deleted." });
  } catch (err) {
    console.error("[UPLOADS] Error deleting upload:", err);
    res.status(500).json({ error: "Failed to delete upload." });
  }
});

export default router;