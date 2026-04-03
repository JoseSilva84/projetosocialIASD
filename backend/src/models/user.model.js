import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'secretario', 'convidado', 'user'], default: 'user' },
});

export default mongoose.model("User", userSchema);
