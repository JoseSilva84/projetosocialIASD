import mongoose from "mongoose";

function lessonsArrayValidator(arr) {
  if (!Array.isArray(arr)) return false;
  if (arr.length > 15) return false;
  const set = new Set(arr);
  if (set.size !== arr.length) return false;
  return arr.every((n) => Number.isInteger(n) && n >= 1 && n <= 15);
}

const participantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    whatsapp: { type: String, required: true, trim: true },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    selectedBiblicalLesson: {
      type: Number,
      min: 1,
      max: 15,
      default: null,
    },
    biblicalLessonsCompleted: {
      type: [Number],
      default: [],
      validate: {
        validator: lessonsArrayValidator,
        message: "Lições concluídas devem ser números únicos entre 1 e 15.",
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Participant", participantSchema);
