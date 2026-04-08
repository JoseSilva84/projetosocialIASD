import mongoose from "mongoose";

const rankingConfigSchema = new mongoose.Schema(
  {
    presenceWeight: { type: Number, default: 1, min: 0 },
    biblicalWeight: { type: Number, default: 1, min: 0 },
    extraLabel: { type: String, default: "Extra" },
    extraWeight: { type: Number, default: 0, min: 0 },
    quizEnabled: { type: Boolean, default: false },
    quizQuestionPoints: { type: Number, default: 10, min: 1 },
  },
  { timestamps: true }
);

export default mongoose.model("RankingConfig", rankingConfigSchema);
