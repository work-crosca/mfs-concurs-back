import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
  uploadId: { type: mongoose.Schema.Types.ObjectId, ref: "Upload" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.Like || mongoose.model("Like", likeSchema);