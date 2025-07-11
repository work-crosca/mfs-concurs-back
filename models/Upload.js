import mongoose from "mongoose";

const uploadSchema = new mongoose.Schema({
  nickname: String,
  email: String,
  category: String,
  description: String,
  fileUrl: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.Upload || mongoose.model("Upload", uploadSchema);