import mongoose from "mongoose";

function lessonsArrayValidator(arr) {
  if (!Array.isArray(arr)) return false;
  if (arr.length > 15) return false;
  const set = new Set(arr);
  if (set.size !== arr.length) return false;
  return arr.every((n) => Number.isInteger(n) && n >= 1 && n <= 15);
}

function frequencyArrayValidator(arr) {
  if (!Array.isArray(arr)) return false;
  if (arr.length > 25) return false;
  const dayIds = arr.map(item => item.dayId);
  const set = new Set(dayIds);
  if (set.size !== arr.length) return false;
  return arr.every((item) => 
    typeof item === 'object' && 
    item !== null &&
    Number.isInteger(item.dayId) && 
    item.dayId >= 1 && 
    item.dayId <= 25 &&
    item.markedDate instanceof Date
  );
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
    frequencyAttended: {
      type: [{
        dayId: { type: Number, required: true, min: 1, max: 25 },
        markedDate: { type: Date, required: true, default: Date.now }
      }],
      default: [],
      validate: {
        validator: frequencyArrayValidator,
        message: "Dias de frequência devem ter dayId único entre 1 e 25 e markedDate válida.",
      },
    },
    extraScore: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Participant", participantSchema);
