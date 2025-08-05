import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../db.js";
import Admin from "../models/Admin.js";

await connectDB();

const newAdmin = new Admin({
  name: "Corneliu",
  email: "c.rosca@moldcell.md",
  password: "Moldcell!@#"
});

await newAdmin.save();
console.log("✅ Admin creat cu succes!");
process.exit();