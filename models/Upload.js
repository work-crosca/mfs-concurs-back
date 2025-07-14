import mongoose from "mongoose";

const uploadSchema = new mongoose.Schema({
  nickname: String,
  email: String,
  category: String,
  description: String,
  fileUrl: String,
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  likesCount: {
    type: Number,
    default: 0
  },
});

export default mongoose.models.Upload || mongoose.model("Upload", uploadSchema);