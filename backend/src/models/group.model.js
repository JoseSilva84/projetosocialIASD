import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    createdBy: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Group", groupSchema);